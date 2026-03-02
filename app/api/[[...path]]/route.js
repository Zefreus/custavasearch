import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authenticateUser, createSession, destroySession, getSession, requireAuth, requireAdmin, createUserFromGoogle, registerUser } from '@/lib/auth';
import { getCache, setCache } from '@/lib/cache';
import { slugify } from '@/lib/utils';
import { createLogTables, logSearch, logProductAccess, getSearchStats, getProductStats } from '@/lib/logger';
import crypto from 'crypto';

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
  if (segments[0] === 'auth' && segments[1] === 'me') {
    return handleMe();
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
  
  // Store route
  if (segments[0] === 'store' && segments[1]) {
    return handleStore(segments[1]);
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
  }
  
  return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 });
}
