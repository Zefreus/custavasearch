-- Tabelas de Log para Custava Search
-- Execute este script no MySQL para criar as tabelas

-- Tabela de logs de busca
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de logs de acesso a produtos
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
