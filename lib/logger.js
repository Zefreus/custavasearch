import { getPool } from './db.js';

export async function createLogTables() {
  const pool = getPool();
  
  try {
    // Tabela de logs de busca
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS zefreus.APP_SEARCH_LOG (
        id INT AUTO_INCREMENT PRIMARY KEY,
        search_term VARCHAR(255) NOT NULL,
        user_id VARCHAR(100) NULL,
        user_email VARCHAR(255) NULL,
        results_count INT DEFAULT 0,
        filters_uf VARCHAR(10) NULL,
        filters_loja VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_search_term (search_term),
        INDEX idx_user_email (user_email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    // Tabela de logs de acesso a produtos
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS zefreus.APP_PRODUCT_ACCESS_LOG (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_slug VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        user_id VARCHAR(100) NULL,
        user_email VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product_slug (product_slug),
        INDEX idx_user_email (user_email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    console.log('✅ Tabelas de log criadas com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar tabelas de log:', error);
    return false;
  }
}

// Função para registrar busca
export async function logSearch(searchTerm, resultsCount, filters = {}, user = null) {
  const pool = getPool();
  
  try {
    await pool.execute(
      `INSERT INTO zefreus.APP_SEARCH_LOG 
       (search_term, user_id, user_email, results_count, filters_uf, filters_loja) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        searchTerm,
        user?.userID || null,
        user?.email || null,
        resultsCount,
        filters.uf || null,
        filters.loja || null
      ]
    );
    console.log(`📝 Log de busca: "${searchTerm}" (${resultsCount} resultados)`);
  } catch (error) {
    console.error('❌ Erro ao registrar log de busca:', error);
  }
}

// Função para registrar acesso a produto
export async function logProductAccess(productSlug, productName, user = null) {
  const pool = getPool();
  
  try {
    await pool.execute(
      `INSERT INTO zefreus.APP_PRODUCT_ACCESS_LOG 
       (product_slug, product_name, user_id, user_email) 
       VALUES (?, ?, ?, ?)`,
      [
        productSlug,
        productName,
        user?.userID || null,
        user?.email || null
      ]
    );
    console.log(`📝 Log de acesso: "${productName}" por ${user?.email || 'anônimo'}`);
  } catch (error) {
    console.error('❌ Erro ao registrar log de acesso:', error);
  }
}

// Função para obter estatísticas de buscas
export async function getSearchStats(days = 30) {
  const pool = getPool();
  
  try {
    // Termos mais buscados
    const [topSearches] = await pool.execute(
      `SELECT search_term, COUNT(*) as count, 
              SUM(results_count) as total_results,
              MAX(created_at) as last_search
       FROM zefreus.APP_SEARCH_LOG
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY search_term
       ORDER BY count DESC
       LIMIT 20`,
      [days]
    );
    
    // Buscas por dia
    const [searchesByDay] = await pool.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM zefreus.APP_SEARCH_LOG
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );
    
    // Total de buscas
    const [totalSearches] = await pool.execute(
      `SELECT COUNT(*) as total,
              COUNT(DISTINCT search_term) as unique_terms,
              COUNT(DISTINCT user_email) as unique_users
       FROM zefreus.APP_SEARCH_LOG
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
    
    return {
      topSearches,
      searchesByDay,
      totalSearches: totalSearches[0]
    };
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas de busca:', error);
    return { topSearches: [], searchesByDay: [], totalSearches: {} };
  }
}

// Função para obter estatísticas de produtos
export async function getProductStats(days = 30) {
  const pool = getPool();
  
  try {
    // Produtos mais acessados
    const [topProducts] = await pool.execute(
      `SELECT product_slug, product_name, COUNT(*) as access_count,
              COUNT(DISTINCT user_email) as unique_visitors,
              MAX(created_at) as last_access
       FROM zefreus.APP_PRODUCT_ACCESS_LOG
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY product_slug, product_name
       ORDER BY access_count DESC
       LIMIT 20`,
      [days]
    );
    
    // Acessos por dia
    const [accessByDay] = await pool.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM zefreus.APP_PRODUCT_ACCESS_LOG
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );
    
    // Total de acessos
    const [totalAccess] = await pool.execute(
      `SELECT COUNT(*) as total,
              COUNT(DISTINCT product_slug) as unique_products,
              COUNT(DISTINCT user_email) as unique_users
       FROM zefreus.APP_PRODUCT_ACCESS_LOG
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
    
    return {
      topProducts,
      accessByDay,
      totalAccess: totalAccess[0]
    };
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas de produtos:', error);
    return { topProducts: [], accessByDay: [], totalAccess: {} };
  }
}
