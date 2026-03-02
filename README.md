# Custava Search

Portal público de busca de preços baseado em NF-e (Notas Fiscais Eletrônicas).

## 🚀 Características

- ✅ Busca pública de produtos com autocomplete
- ✅ Sistema de autenticação MD5 (compatível com sistema legado)
- ✅ Histórico detalhado de preços com gráficos
- ✅ Páginas SEO-friendly para lojas
- ✅ Área administrativa para usuários admin
- ✅ Cache inteligente para performance
- ✅ UI moderna com tema roxo/branco (fintech clean)
- ✅ Totalmente responsivo

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 14 (App Router) + React
- **Backend**: Next.js API Routes
- **Banco de Dados**: MySQL externo (zefreus)
- **UI**: Tailwind CSS + shadcn/ui
- **Gráficos**: Recharts
- **Autenticação**: JWT + MD5 (legacy)

## 📁 Estrutura do Projeto

```
/app
├── app/
│   ├── page.js                 # Home page
│   ├── buscar/page.js          # Página de busca
│   ├── produto/[slug]/page.js  # Detalhes do produto (protegido)
│   ├── loja/[cnpj]/page.js     # Página da loja (público)
│   ├── login/page.js           # Login
│   ├── admin/page.js           # Dashboard admin (protegido)
│   ├── layout.js               # Layout principal
│   └── api/[[...path]]/route.js # Todas as API routes
├── lib/
│   ├── db.js                   # Conexão MySQL
│   ├── auth.js                 # Sistema de autenticação
│   ├── cache.js                # Sistema de cache
│   └── utils.js                # Funções utilitárias
├── components/ui/              # Componentes shadcn/ui
└── .env                        # Variáveis de ambiente
```

## 🔐 Variáveis de Ambiente

```env
# MySQL Database
MYSQL_HOST=mysql.zefreus.com.br
MYSQL_PORT=3306
MYSQL_DB=zefreus
MYSQL_USER=zefreus
MYSQL_PASSWORD=tricolor83
MYSQL_SSL=false

# Session
SESSION_SECRET=custava-search-secret-key-change-in-production

# External Auth API
AUTH_API_URL=http://www.zefreus.com.br/api/api/token
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Utilizadas

#### 1. zefreus.CON_API_USER
Usuários do sistema (login legado)

```sql
- id
- TX_EMAIL
- TX_SENHA (MD5)
- TX_NOME
- IS_ATIVO
- UserID (Guid)
- IsAdmin (boolean)
```

#### 2. zefreus.APP_NOTA_FISCAL
Notas fiscais eletrônicas

```sql
- Id
- Numero
- Local (loja/mercado)
- Serie
- DataEmissao
- Endereco
- CNPJ
- UrlNF
- uf
- UserID
```

#### 3. zefreus.APP_NOTA_FISCAL_PRODUTO
Itens das notas fiscais

```sql
- id
- NotaFiscalID (FK -> APP_NOTA_FISCAL.Id)
- codigo
- Quantidade
- ValorUnitario
- ValorTotal
- Unidade
- Nome
- NomeTratado
```

### 📊 Índices Recomendados

Para melhor performance, recomenda-se criar os seguintes índices:

```sql
-- Índice para JOIN entre produtos e notas
CREATE INDEX idx_produto_notafiscal ON zefreus.APP_NOTA_FISCAL_PRODUTO(NotaFiscalID);

-- Índice para ordenação por data
CREATE INDEX idx_nota_data ON zefreus.APP_NOTA_FISCAL(DataEmissao);

-- Índice para filtro por CNPJ
CREATE INDEX idx_nota_cnpj ON zefreus.APP_NOTA_FISCAL(CNPJ);

-- Índice para filtro por loja
CREATE INDEX idx_nota_local ON zefreus.APP_NOTA_FISCAL(Local);

-- Índice para filtro por UF
CREATE INDEX idx_nota_uf ON zefreus.APP_NOTA_FISCAL(uf);

-- Índice para busca de produtos
CREATE INDEX idx_produto_nometratado ON zefreus.APP_NOTA_FISCAL_PRODUTO(NomeTratado);
CREATE INDEX idx_produto_nome ON zefreus.APP_NOTA_FISCAL_PRODUTO(Nome);

-- Índice composto para queries de agregação
CREATE INDEX idx_produto_valor ON zefreus.APP_NOTA_FISCAL_PRODUTO(ValorUnitario, NotaFiscalID);
```

## 🚀 Como Rodar

### Desenvolvimento

```bash
# Instalar dependências
yarn install

# Rodar servidor de desenvolvimento
yarn dev
```

O servidor estará disponível em `http://localhost:3000`

### Produção

```bash
# Build
yarn build

# Start
yarn start
```

## 🔒 Rotas da API

### Públicas

- `GET /api/suggest?q=` - Autocomplete de produtos
- `GET /api/search?q=&page=&uf=&loja=&sort=` - Busca de produtos
- `GET /api/store/{cnpj}` - Dados da loja
- `GET /api/filters` - UFs e lojas disponíveis
- `POST /api/auth/login` - Login

### Protegidas (requer autenticação)

- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/logout` - Logout
- `GET /api/product/{slug}` - Detalhes do produto
- `GET /api/product/{slug}/history?page=` - Histórico do produto

### Admin (requer IsAdmin = true)

- `GET /api/admin/metrics` - Métricas do sistema

## 📄 Páginas

### Públicas

- `/` - Home com busca
- `/buscar?q=` - Resultados da busca com filtros
- `/loja/{cnpj}` - Página da loja (SEO-friendly)
- `/login` - Login

### Protegidas (requer login)

- `/produto/{slug}` - Detalhes completos do produto com histórico

### Admin (requer IsAdmin)

- `/admin` - Dashboard administrativo

## 🎨 Sistema de Design

### Cores

- **Primary**: Roxo (#9333ea - purple-600)
- **Background**: Branco com gradientes suaves de roxo
- **Acentos**: Verde (preços), Vermelho (variação), Azul (informações)

### Componentes

Todos os componentes UI são do shadcn/ui, garantindo:
- Acessibilidade
- Responsividade
- Consistência visual
- Customização fácil

## ⚡ Performance

### Sistema de Cache

- **Suggest**: 60 segundos
- **Search**: 60-120 segundos
- **Store**: 300 segundos (5 minutos)
- **Filters**: 300 segundos

### Otimizações

- Queries parametrizadas (prevenção de SQL injection)
- Pool de conexões MySQL
- Paginação obrigatória
- Índices de banco de dados

## 🔐 Segurança

- ✅ Queries parametrizadas (SQL injection prevention)
- ✅ Cookies HttpOnly
- ✅ Secure cookies em produção
- ✅ JWT para sessões
- ✅ MD5 para compatibilidade com sistema legado
- ✅ Validação de permissões (admin routes)

## 📱 Responsividade

O aplicativo é totalmente responsivo e funciona perfeitamente em:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large Desktop (1440px+)

## 🔄 Fluxo de Autenticação

1. Usuário entra com email + senha
2. Backend calcula MD5 da senha
3. Compara com `TX_SENHA` na tabela `CON_API_USER`
4. Verifica se `IS_ATIVO = true`
5. Cria JWT com dados do usuário (UserID, nome, email, isAdmin)
6. Armazena em cookie HttpOnly
7. Todas as rotas protegidas validam o JWT

## 📊 Conceito de Produto

Os produtos são agrupados por:
- **product_key**: `NomeTratado` (se vazio, usa `Nome`)
- **slug**: versão slugificada do product_key

Isso permite:
- Agrupar variações do mesmo produto
- URLs amigáveis
- Histórico consolidado

## 🎯 Próximos Passos

- [ ] Implementar sistema de logs de busca
- [ ] Adicionar blacklist de termos no admin
- [ ] Implementar rate limiting mais robusto
- [ ] Adicionar export de dados (CSV, PDF)
- [ ] Sistema de notificações de preço
- [ ] Comparador de preços entre lojas
- [ ] API pública documentada (Swagger)

## 📝 Licença

Todos os direitos reservados © 2025 Custava Search

## 🤝 Suporte

Para suporte ou dúvidas, entre em contato através do sistema.

---

**Desenvolvido com ❤️ usando Next.js + MySQL**
