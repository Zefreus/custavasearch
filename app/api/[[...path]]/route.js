import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authenticateUser, createSession, destroySession, getSession, requireAuth, requireAdmin, createUserFromGoogle, registerUser } from '@/lib/auth';
import { getCache, setCache } from '@/lib/cache';
import { slugify } from '@/lib/utils';
import { createLogTables, logSearch, logProductAccess, getSearchStats, getProductStats } from '@/lib/logger';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Helper to get path segments
function getPathSegments(request) {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/api\/(.*)$/);
  const path = pathMatch ? pathMatch[1] : '';
  return path.split('/').filter(Boolean);
}

// POST /api/auth/login
async function handleLogin(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }
    
    const user = await authenticateUser(email, password);
    
    if (!user) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 });
    }
    
    const token = await createSession(user);
    
    // Criar resposta com Set-Cookie header explícito
    const response = NextResponse.json({ 
      success: true, 
      user: {
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
    
    // Configurar cookie manualmente para garantir que funcione
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: false, // false para localhost/http
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    console.log('✅ Cookie setado na resposta para:', user.email);
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 });
  }
}

// POST /api/auth/logout
async function handleLogout() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Erro ao fazer logout' }, { status: 500 });
  }
}

// GET /api/auth/me
async function handleMe() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ 
      user: {
        name: session.name,
        email: session.email,
        isAdmin: session.isAdmin
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ user: null });
  }
}

// POST /api/auth/register
async function handleRegister(request) {
  try {
    const { name, email, password } = await request.json();
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }
    
    // Verificar se email já existe
    const existingUser = await queryOne(
      'SELECT id FROM zefreus.CON_API_USER WHERE TX_EMAIL = ?',
      [email.toLowerCase()]
    );
    
    if (existingUser) {
      return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 400 });
    }
    
    // Criar hash MD5 da senha
    const passwordHash = crypto.createHash('md5').update(password).digest('hex');
    
    // Inserir novo usuário
    await query(
      `INSERT INTO zefreus.CON_API_USER (TX_NOME, TX_EMAIL, TX_SENHA, IS_ATIVO, IsAdmin) 
       VALUES (?, ?, ?, 'S', 'N')`,
      [name, email.toLowerCase(), passwordHash]
    );
    
    // Buscar o usuário criado
    const newUser = await queryOne(
      'SELECT id, TX_NOME as name, TX_EMAIL as email, IsAdmin FROM zefreus.CON_API_USER WHERE TX_EMAIL = ?',
      [email.toLowerCase()]
    );
    
    // Criar sessão automaticamente
    const user = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      isAdmin: newUser.IsAdmin === 'S'
    };
    
    const token = await createSession(user);
    
    const response = NextResponse.json({ 
      success: true, 
      user: {
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
    
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    
    console.log('✅ Novo usuário cadastrado:', email);
    
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 });
  }
}

// GET /api/auth/google - Redireciona para Google OAuth
async function handleGoogleAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;
  
  const scope = encodeURIComponent('email profile');
  const state = crypto.randomBytes(16).toString('hex');
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `state=${state}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  console.log('🔵 Redirecionando para Google OAuth');
  
  return NextResponse.redirect(googleAuthUrl);
}

// GET /api/auth/google/callback - Callback do Google OAuth
async function handleGoogleCallback(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/login?error=google_auth_failed`);
    }
    
    if (!code) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
    }
    
    // Trocar código por token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Google token error:', tokenData);
      return NextResponse.redirect(`${baseUrl}/login?error=token_failed`);
    }
    
    // Buscar informações do usuário
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    const googleUser = await userResponse.json();
    
    if (!googleUser.email) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_email`);
    }
    
    console.log('🔵 Google user:', googleUser.email, googleUser.name);
    
    // Verificar se usuário existe
    let user = await queryOne(
      'SELECT id, TX_NOME as name, TX_EMAIL as email, IsAdmin, IS_ATIVO FROM zefreus.CON_API_USER WHERE TX_EMAIL = ?',
      [googleUser.email.toLowerCase()]
    );
    
    if (!user) {
      // Criar novo usuário
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = crypto.createHash('md5').update(randomPassword).digest('hex');
      
      await query(
        `INSERT INTO zefreus.CON_API_USER (TX_NOME, TX_EMAIL, TX_SENHA, IS_ATIVO, IsAdmin) 
         VALUES (?, ?, ?, 'S', 'N')`,
        [googleUser.name || googleUser.email.split('@')[0], googleUser.email.toLowerCase(), passwordHash]
      );
      
      user = await queryOne(
        'SELECT id, TX_NOME as name, TX_EMAIL as email, IsAdmin, IS_ATIVO FROM zefreus.CON_API_USER WHERE TX_EMAIL = ?',
        [googleUser.email.toLowerCase()]
      );
      
      console.log('✅ Novo usuário Google cadastrado:', googleUser.email);
    }
    
    // Verificar se usuário está ativo
    if (user.IS_ATIVO !== 'S') {
      return NextResponse.redirect(`${baseUrl}/login?error=user_inactive`);
    }
    
    // Criar sessão
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.IsAdmin === 'S'
    };
    
    const token = await createSession(sessionUser);
    
    // Criar resposta com redirecionamento
    const response = NextResponse.redirect(`${baseUrl}/`);
    
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    
    console.log('✅ Login Google bem-sucedido:', googleUser.email);
    
    return response;
  } catch (error) {
    console.error('Google callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`);
  }
}

// POST /api/auth/forgot-password - Solicitar recuperação de senha
async function handleForgotPassword(request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }
    
    // Verificar se o email existe
    const user = await queryOne(
      'SELECT id, TX_NOME as name, TX_EMAIL as email FROM zefreus.CON_API_USER WHERE TX_EMAIL = ?',
      [email.toLowerCase()]
    );
    
    if (!user) {
      // Por segurança, não revelamos se o email existe ou não
      return NextResponse.json({ 
        success: true, 
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação.' 
      });
    }
    
    // Gerar token único
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    
    // Verificar se a tabela de tokens existe, se não, criar
    await query(`
      CREATE TABLE IF NOT EXISTS zefreus.APP_PASSWORD_RESET (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token_hash (token_hash),
        INDEX idx_user_id (user_id)
      )
    `);
    
    // Invalidar tokens anteriores do usuário
    await query(
      'UPDATE zefreus.APP_PASSWORD_RESET SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [user.id]
    );
    
    // Salvar novo token
    await query(
      'INSERT INTO zefreus.APP_PASSWORD_RESET (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );
    
    // Configurar transporte de email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const resetUrl = `${baseUrl}/redefinir-senha?token=${resetToken}`;
    
    // Enviar email
    await transporter.sendMail({
      from: `"Custava Search" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Recuperação de Senha - Custava Search',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 30px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Custava Search</h1>
                      <p style="margin: 10px 0 0 0; color: #bfdbfe; font-size: 14px;">Pesquisa de Preços Inteligente</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px;">Olá, ${user.name}!</h2>
                      
                      <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Recebemos uma solicitação para redefinir a senha da sua conta no Custava Search.
                      </p>
                      
                      <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Clique no botão abaixo para criar uma nova senha:
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                              Redefinir Minha Senha
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        <strong>Este link expira em 1 hora.</strong>
                      </p>
                      
                      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá a mesma.
                      </p>
                      
                      <!-- Fallback URL -->
                      <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 6px;">
                        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
                          Se o botão não funcionar, copie e cole este link no seu navegador:
                        </p>
                        <p style="margin: 0; word-break: break-all; color: #2563eb; font-size: 12px;">
                          ${resetUrl}
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © ${new Date().getFullYear()} Custava Search. Todos os direitos reservados.
                      </p>
                      <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                        Este email foi enviado para ${user.email}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });
    
    console.log('✅ Email de recuperação enviado para:', user.email);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email de recuperação enviado com sucesso' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Erro ao enviar email de recuperação' }, { status: 500 });
  }
}

// GET /api/auth/validate-reset-token - Validar token de recuperação
async function handleValidateResetToken(request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
    }
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const resetRecord = await queryOne(
      `SELECT pr.*, u.TX_EMAIL as email 
       FROM zefreus.APP_PASSWORD_RESET pr
       INNER JOIN zefreus.CON_API_USER u ON pr.user_id = u.id
       WHERE pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > NOW()`,
      [tokenHash]
    );
    
    if (!resetRecord) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 });
    }
    
    return NextResponse.json({ valid: true, email: resetRecord.email });
  } catch (error) {
    console.error('Validate reset token error:', error);
    return NextResponse.json({ error: 'Erro ao validar token' }, { status: 500 });
  }
}

// POST /api/auth/reset-password - Redefinir senha
async function handleResetPassword(request) {
  try {
    const { token, password } = await request.json();
    
    if (!token || !password) {
      return NextResponse.json({ error: 'Token e senha são obrigatórios' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Buscar registro do token
    const resetRecord = await queryOne(
      `SELECT pr.*, u.TX_EMAIL as email 
       FROM zefreus.APP_PASSWORD_RESET pr
       INNER JOIN zefreus.CON_API_USER u ON pr.user_id = u.id
       WHERE pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > NOW()`,
      [tokenHash]
    );
    
    if (!resetRecord) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 });
    }
    
    // Criar hash MD5 da nova senha
    const passwordHash = crypto.createHash('md5').update(password).digest('hex');
    
    // Atualizar senha do usuário
    await query(
      'UPDATE zefreus.CON_API_USER SET TX_SENHA = ? WHERE id = ?',
      [passwordHash, resetRecord.user_id]
    );
    
    // Marcar token como usado
    await query(
      'UPDATE zefreus.APP_PASSWORD_RESET SET used_at = NOW() WHERE id = ?',
      [resetRecord.id]
    );
    
    console.log('✅ Senha redefinida para:', resetRecord.email);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Senha redefinida com sucesso' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
  }
}

// GET /api/suggest?q=
async function handleSuggest(request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    
    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }
    
    const cacheKey = `suggest:${q}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ suggestions: cached });
    }
    
    const results = await query(
      `SELECT DISTINCT 
        COALESCE(NULLIF(TRIM(NomeTratado), ''), TRIM(Nome)) as product_name
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO
       WHERE (NomeTratado LIKE ? OR Nome LIKE ?)
       LIMIT 10`,
      [`%${q}%`, `%${q}%`]
    );
    
    const suggestions = results.map(r => r.product_name).filter(Boolean);
    setCache(cacheKey, suggestions, 60);
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Suggest error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}

// GET /api/search?q=&page=&uf=&loja=&minPrice=&maxPrice=&sort=
async function handleSearch(request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const uf = url.searchParams.get('uf') || '';
    const loja = url.searchParams.get('loja') || '';
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '999999');
    const sort = url.searchParams.get('sort') || 'recent';
    const limit = 20;
    const offset = (page - 1) * limit;
    
    if (!q) {
      return NextResponse.json({ products: [], total: 0, page, totalPages: 0 });
    }
    
    // Obter usuário logado (se houver)
    const session = await getSession();
    
    let conditions = ['(p.NomeTratado LIKE ? OR p.Nome LIKE ?)'];
    let params = [`%${q}%`, `%${q}%`];
    
    if (uf) {
      conditions.push('nf.uf = ?');
      params.push(uf);
    }
    
    if (loja) {
      conditions.push('nf.Local LIKE ?');
      params.push(`%${loja}%`);
    }
    
    conditions.push('p.ValorUnitario >= ?');
    conditions.push('p.ValorUnitario <= ?');
    params.push(minPrice, maxPrice);
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome))) as total
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
       INNER JOIN zefreus.APP_NOTA_FISCAL nf ON p.NotaFiscalID = nf.Id
       WHERE ${whereClause}`,
      params
    );
    
    const total = countResult?.total || 0;
    
    // Registrar log de busca (async, não bloqueia resposta)
    logSearch(q, total, { uf, loja }, session).catch(err => 
      console.error('Erro ao registrar log:', err)
    );
    
    // Get products with aggregated data
    let orderBy = 'MAX(nf.DataEmissao) DESC';
    if (sort === 'price_asc') orderBy = 'MIN(p.ValorUnitario) ASC';
    if (sort === 'price_desc') orderBy = 'MAX(p.ValorUnitario) DESC';
    
    const products = await query(
      `SELECT 
        COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome)) as product_name,
        MIN(p.ValorUnitario) as best_price,
        MAX(CASE WHEN nf.DataEmissao = (
          SELECT MAX(nf2.DataEmissao) 
          FROM zefreus.APP_NOTA_FISCAL nf2
          INNER JOIN zefreus.APP_NOTA_FISCAL_PRODUTO p2 ON p2.NotaFiscalID = nf2.Id
          WHERE COALESCE(NULLIF(TRIM(p2.NomeTratado), ''), TRIM(p2.Nome)) = COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome))
        ) THEN p.ValorUnitario END) as last_price,
        MAX(nf.DataEmissao) as last_date,
        COUNT(*) as occurrences
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
       INNER JOIN zefreus.APP_NOTA_FISCAL nf ON p.NotaFiscalID = nf.Id
       WHERE ${whereClause}
       GROUP BY COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome))
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const productsWithSlug = products.map(p => ({
      name: p.product_name,
      slug: slugify(p.product_name),
      bestPrice: parseFloat(p.best_price),
      lastPrice: parseFloat(p.last_price || p.best_price),
      lastDate: p.last_date,
      occurrences: p.occurrences,
      variation: p.last_price && p.best_price ? 
        ((parseFloat(p.last_price) - parseFloat(p.best_price)) / parseFloat(p.best_price) * 100) : 0
    }));
    
    return NextResponse.json({
      products: productsWithSlug,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos', details: error.message }, { status: 500 });
  }
}

// GET /api/product/{slug}
async function handleProductDetail(slug, request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }
    
    // Find the actual product name from slug
    const productResult = await queryOne(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(NomeTratado), ''), TRIM(Nome)) as product_name
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO
       WHERE LOWER(REPLACE(REPLACE(REPLACE(COALESCE(NULLIF(TRIM(NomeTratado), ''), TRIM(Nome)), ' ', '-'), 'ã', 'a'), 'ç', 'c')) LIKE ?
       LIMIT 1`,
      [`%${slug.replace(/-/g, '%')}%`]
    );
    
    if (!productResult) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }
    
    const productName = productResult.product_name;
    
    // Registrar log de acesso (async, não bloqueia resposta)
    logProductAccess(slug, productName, session).catch(err =>
      console.error('Erro ao registrar log de acesso:', err)
    );
    
    // Get aggregated stats
    const stats = await queryOne(
      `SELECT 
        MIN(p.ValorUnitario) as best_price,
        MAX(p.ValorUnitario) as max_price,
        AVG(p.ValorUnitario) as avg_price,
        COUNT(*) as occurrences,
        MAX(nf.DataEmissao) as last_date,
        MAX(CASE WHEN nf.DataEmissao = (
          SELECT MAX(nf2.DataEmissao) 
          FROM zefreus.APP_NOTA_FISCAL nf2
          INNER JOIN zefreus.APP_NOTA_FISCAL_PRODUTO p2 ON p2.NotaFiscalID = nf2.Id
          WHERE COALESCE(NULLIF(TRIM(p2.NomeTratado), ''), TRIM(p2.Nome)) = ?
        ) THEN p.ValorUnitario END) as last_price
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
       INNER JOIN zefreus.APP_NOTA_FISCAL nf ON p.NotaFiscalID = nf.Id
       WHERE COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome)) = ?`,
      [productName, productName]
    );
    
    // Get recent trend (last 10 occurrences)
    const trend = await query(
      `SELECT p.ValorUnitario as price, nf.DataEmissao as date
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
       INNER JOIN zefreus.APP_NOTA_FISCAL nf ON p.NotaFiscalID = nf.Id
       WHERE COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome)) = ?
       ORDER BY nf.DataEmissao DESC
       LIMIT 10`,
      [productName]
    );
    
    return NextResponse.json({
      name: productName,
      slug: slugify(productName),
      bestPrice: parseFloat(stats.best_price),
      lastPrice: parseFloat(stats.last_price || stats.best_price),
      avgPrice: parseFloat(stats.avg_price),
      maxPrice: parseFloat(stats.max_price),
      occurrences: stats.occurrences,
      lastDate: stats.last_date,
      variation: ((parseFloat(stats.last_price || stats.best_price) - parseFloat(stats.best_price)) / parseFloat(stats.best_price) * 100),
      trend: trend.map(t => ({
        price: parseFloat(t.price),
        date: t.date
      }))
    });
  } catch (error) {
    console.error('Product detail error:', error);
    return NextResponse.json({ error: 'Erro ao carregar produto' }, { status: 500 });
  }
}

// GET /api/product/{slug}/history?page=
async function handleProductHistory(slug, request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;
    
    // Find product name
    const productResult = await queryOne(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(NomeTratado), ''), TRIM(Nome)) as product_name
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO
       WHERE LOWER(REPLACE(REPLACE(REPLACE(COALESCE(NULLIF(TRIM(NomeTratado), ''), TRIM(Nome)), ' ', '-'), 'ã', 'a'), 'ç', 'c')) LIKE ?
       LIMIT 1`,
      [`%${slug.replace(/-/g, '%')}%`]
    );
    
    if (!productResult) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }
    
    const productName = productResult.product_name;
    
    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
       WHERE COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome)) = ?`,
      [productName]
    );
    
    const total = countResult?.total || 0;
    
    // Get history
    const history = await query(
      `SELECT 
        nf.DataEmissao as date,
        p.ValorUnitario as price,
        p.Quantidade as quantity,
        p.Unidade as unit,
        nf.Local as store,
        nf.uf,
        nf.Numero as invoice_number,
        nf.Serie as invoice_series,
        nf.CNPJ as cnpj,
        nf.UrlNF as invoice_url
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
       INNER JOIN zefreus.APP_NOTA_FISCAL nf ON p.NotaFiscalID = nf.Id
       WHERE COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome)) = ?
       ORDER BY nf.DataEmissao DESC
       LIMIT ? OFFSET ?`,
      [productName, limit, offset]
    );
    
    return NextResponse.json({
      history: history.map(h => ({
        date: h.date,
        price: parseFloat(h.price),
        quantity: parseFloat(h.quantity),
        unit: h.unit,
        store: h.store,
        uf: h.uf,
        invoiceNumber: h.invoice_number,
        invoiceSeries: h.invoice_series,
        cnpj: h.cnpj,
        invoiceUrl: h.invoice_url
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Product history error:', error);
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 });
  }
}

// GET /api/store/{cnpj}
async function handleStore(cnpj) {
  try {
    const cacheKey = `store:${cnpj}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    // Get store info
    const storeInfo = await queryOne(
      `SELECT 
        Local as name,
        uf,
        Endereco as address,
        COUNT(DISTINCT Id) as invoice_count
       FROM zefreus.APP_NOTA_FISCAL
       WHERE CNPJ = ?
       GROUP BY Local, uf, Endereco
       ORDER BY COUNT(*) DESC
       LIMIT 1`,
      [cnpj]
    );
    
    if (!storeInfo) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 });
    }
    
    // Get top products
    const topProducts = await query(
      `SELECT 
        COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome)) as product_name,
        COUNT(*) as occurrences,
        MAX(nf.DataEmissao) as last_date,
        MAX(CASE WHEN nf.DataEmissao = (
          SELECT MAX(nf2.DataEmissao) 
          FROM zefreus.APP_NOTA_FISCAL nf2
          INNER JOIN zefreus.APP_NOTA_FISCAL_PRODUTO p2 ON p2.NotaFiscalID = nf2.Id
          WHERE nf2.CNPJ = ? AND COALESCE(NULLIF(TRIM(p2.NomeTratado), ''), TRIM(p2.Nome)) = COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome))
        ) THEN p.ValorUnitario END) as last_price
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
       INNER JOIN zefreus.APP_NOTA_FISCAL nf ON p.NotaFiscalID = nf.Id
       WHERE nf.CNPJ = ?
       GROUP BY COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome))
       ORDER BY occurrences DESC
       LIMIT 20`,
      [cnpj, cnpj]
    );
    
    const result = {
      cnpj,
      name: storeInfo.name,
      uf: storeInfo.uf,
      address: storeInfo.address,
      invoiceCount: storeInfo.invoice_count,
      topProducts: topProducts.map(p => ({
        name: p.product_name,
        slug: slugify(p.product_name),
        lastPrice: parseFloat(p.last_price || 0),
        lastDate: p.last_date,
        occurrences: p.occurrences
      }))
    };
    
    setCache(cacheKey, result, 300);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Store error:', error);
    return NextResponse.json({ error: 'Erro ao carregar loja' }, { status: 500 });
  }
}

// GET /api/admin/metrics
async function handleAdminMetrics() {
  try {
    const session = await getSession();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    
    // Criar tabelas de log se não existirem
    await createLogTables();
    
    // Get total products count
    const productCount = await queryOne(
      `SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(NomeTratado), ''), TRIM(Nome))) as total
       FROM zefreus.APP_NOTA_FISCAL_PRODUTO`
    );
    
    // Get total invoices count
    const invoiceCount = await queryOne(
      `SELECT COUNT(*) as total FROM zefreus.APP_NOTA_FISCAL`
    );
    
    // Get total stores count
    const storeCount = await queryOne(
      `SELECT COUNT(DISTINCT CNPJ) as total FROM zefreus.APP_NOTA_FISCAL`
    );
    
    // Get recent activity
    const recentInvoices = await query(
      `SELECT DataEmissao as date, Local as store
       FROM zefreus.APP_NOTA_FISCAL
       ORDER BY DataEmissao DESC
       LIMIT 10`
    );
    
    return NextResponse.json({
      totalProducts: productCount?.total || 0,
      totalInvoices: invoiceCount?.total || 0,
      totalStores: storeCount?.total || 0,
      recentActivity: recentInvoices
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    return NextResponse.json({ error: 'Erro ao carregar métricas' }, { status: 500 });
  }
}

// GET /api/admin/logs/searches?days=30
async function handleAdminSearchLogs() {
  try {
    const session = await getSession();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    
    const days = 30;
    const stats = await getSearchStats(days);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Admin search logs error:', error);
    return NextResponse.json({ error: 'Erro ao carregar logs de busca' }, { status: 500 });
  }
}

// GET /api/admin/logs/products?days=30
async function handleAdminProductLogs() {
  try {
    const session = await getSession();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    
    const days = 30;
    const stats = await getProductStats(days);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Admin product logs error:', error);
    return NextResponse.json({ error: 'Erro ao carregar logs de produtos' }, { status: 500 });
  }
}

// GET /api/trending?days=7
async function handleTrending(request) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
    const cacheKey = `trending:${days}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ trending: cached });
    }
    
    console.log('📊 Buscando trending dos últimos', days, 'dias');
    
    // Buscar os termos mais buscados
    const topSearches = await query(
      `SELECT search_term, COUNT(*) as search_count
       FROM zefreus.APP_SEARCH_LOG
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY search_term
       ORDER BY search_count DESC
       LIMIT 10`,
      [days]
    );
    
    console.log('🔍 Encontrados', topSearches.length, 'termos buscados');
    
    // Para cada termo, buscar o preço mais atual do produto
    const trendingWithPrices = [];
    
    for (const search of topSearches) {
      try {
        // Buscar produto correspondente pelo termo de busca
        const products = await query(
          `SELECT 
            COALESCE(NULLIF(TRIM(p.NomeTratado), ''), TRIM(p.Nome)) as product_name,
            p.ValorUnitario as price,
            nf.DataEmissao as date
           FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
           INNER JOIN zefreus.APP_NOTA_FISCAL nf ON p.NotaFiscalID = nf.Id
           WHERE (LOWER(p.NomeTratado) LIKE LOWER(?) OR LOWER(p.Nome) LIKE LOWER(?))
           ORDER BY nf.DataEmissao DESC
           LIMIT 1`,
          [`%${search.search_term}%`, `%${search.search_term}%`]
        );
        
        if (products.length > 0) {
          const product = products[0];
          
          // Buscar melhor preço
          const bestPriceResult = await queryOne(
            `SELECT MIN(p.ValorUnitario) as best_price
             FROM zefreus.APP_NOTA_FISCAL_PRODUTO p
             WHERE (LOWER(p.NomeTratado) LIKE LOWER(?) OR LOWER(p.Nome) LIKE LOWER(?))`,
            [`%${search.search_term}%`, `%${search.search_term}%`]
          );
          
          trendingWithPrices.push({
            searchTerm: search.search_term,
            searchCount: search.search_count,
            productName: product.product_name,
            slug: slugify(product.product_name),
            lastPrice: parseFloat(product.price),
            bestPrice: parseFloat(bestPriceResult?.best_price || product.price),
            lastUpdate: product.date
          });
          
          console.log('✅ Produto encontrado:', product.product_name, 'R$', product.price);
        } else {
          console.log('⚠️ Nenhum produto encontrado para:', search.search_term);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar produto para:', search.search_term, error.message);
      }
    }
    
    console.log('📊 Total de trending com preços:', trendingWithPrices.length);
    
    setCache(cacheKey, trendingWithPrices, 300); // Cache por 5 minutos
    
    return NextResponse.json({ trending: trendingWithPrices });
  } catch (error) {
    console.error('Trending error:', error);
    return NextResponse.json({ trending: [] });
  }
}
async function handleFilters() {
  try {
    const cacheKey = 'filters';
    const cached = getCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    // Get unique UFs
    const ufs = await query(
      `SELECT DISTINCT uf FROM zefreus.APP_NOTA_FISCAL WHERE uf IS NOT NULL ORDER BY uf`
    );
    
    // Get top stores
    const stores = await query(
      `SELECT DISTINCT Local as name, COUNT(*) as count
       FROM zefreus.APP_NOTA_FISCAL
       WHERE Local IS NOT NULL
       GROUP BY Local
       ORDER BY count DESC
       LIMIT 50`
    );
    
    const result = {
      ufs: ufs.map(u => u.uf).filter(Boolean),
      stores: stores.map(s => s.name).filter(Boolean)
    };
    
    setCache(cacheKey, result, 300);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Filters error:', error);
    return NextResponse.json({ error: 'Erro ao carregar filtros' }, { status: 500 });
  }
}

// Main router
export async function GET(request, context) {
  const segments = getPathSegments(request);
  
  if (segments.length === 0) {
    return NextResponse.json({ message: 'Custava Search API' });
  }
  
  // Auth routes
  if (segments[0] === 'auth') {
    if (segments[1] === 'me') {
      return handleMe();
    }
    if (segments[1] === 'google') {
      if (segments[2] === 'callback') {
        return handleGoogleCallback(request);
      }
      return handleGoogleAuth();
    }
  }
  
  // Suggest route
  if (segments[0] === 'suggest') {
    return handleSuggest(request);
  }
  
  // Search route
  if (segments[0] === 'search') {
    return handleSearch(request);
  }
  
  // Product routes
  if (segments[0] === 'product' && segments[1]) {
    if (segments[2] === 'history') {
      return handleProductHistory(segments[1], request);
    }
    return handleProductDetail(segments[1], request);
  }
  
  // Admin routes
  if (segments[0] === 'admin') {
    if (segments[1] === 'metrics') {
      return handleAdminMetrics();
    }
    if (segments[1] === 'logs' && segments[2] === 'searches') {
      return handleAdminSearchLogs();
    }
    if (segments[1] === 'logs' && segments[2] === 'products') {
      return handleAdminProductLogs();
    }
  }
  
  // Filters route
  if (segments[0] === 'filters') {
    return handleFilters();
  }
  
  // Trending route
  if (segments[0] === 'trending') {
    return handleTrending(request);
  }
  
  return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 });
}

export async function POST(request) {
  const segments = getPathSegments(request);
  
  // Auth routes
  if (segments[0] === 'auth') {
    if (segments[1] === 'login') {
      return handleLogin(request);
    }
    if (segments[1] === 'logout') {
      return handleLogout();
    }
    if (segments[1] === 'register') {
      return handleRegister(request);
    }
  }
  
  return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 });
}
