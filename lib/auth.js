import crypto from 'crypto';
import { query, queryOne } from './db';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'custava-search-secret-key'
);

export function hashMD5(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

export async function authenticateUser(email, password) {
  try {
    // Chamar API externa para autenticação
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    formData.append('grant_type', 'password');

    const response = await fetch('http://www.zefreus.com.br/api/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!response.ok) {
      console.error('Authentication failed:', response.status);
      return null;
    }

    const authData = await response.json();
    
    if (!authData.access_token) {
      return null;
    }

    // Buscar dados do usuário no banco
    const user = await queryOne(
      `SELECT id, TX_EMAIL, TX_NOME, IS_ATIVO, UserID, IsAdmin 
       FROM zefreus.CON_API_USER 
       WHERE TX_EMAIL = ? AND IS_ATIVO = true`,
      [email]
    );
    
    if (!user) {
      // Usuário autenticado na API mas não encontrado no banco
      // Criar usuário básico com os dados disponíveis
      return {
        userID: authData.access_token.substring(0, 36), // Use parte do token como ID temporário
        name: email.split('@')[0], // Nome baseado no email
        email: email,
        isAdmin: false,
        accessToken: authData.access_token,
        tokenType: authData.token_type,
        expiresIn: authData.expires_in
      };
    }
    
    return {
      userID: user.UserID,
      name: user.TX_NOME,
      email: user.TX_EMAIL,
      isAdmin: user.IsAdmin === 1 || user.IsAdmin === true || user.IsAdmin === 'S' || user.IsAdmin === 's',
      accessToken: authData.access_token,
      tokenType: authData.token_type,
      expiresIn: authData.expires_in
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function createSession(user) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
  
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  
  console.log('✅ Cookie de sessão criado para:', user.email);
  
  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  
  if (!token) {
    console.log('❌ Nenhum cookie de sessão encontrado');
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    console.log('✅ Sessão válida para:', payload.email);
    return payload;
  } catch (error) {
    console.log('❌ Token inválido:', error.message);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export function requireAuth(handler) {
  return async (request, context) => {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return handler(request, { ...context, session });
  };
}

export function requireAdmin(handler) {
  return async (request, context) => {
    const session = await getSession();
    if (!session || !session.isAdmin) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }
    return handler(request, { ...context, session });
  };
}
