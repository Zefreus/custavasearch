# PRD - Custava Search

## Visão Geral do Produto

**Nome**: Custava Search  
**Tipo**: Portal de Busca de Preços  
**Stack**: Next.js 14 + MySQL  
**Tema**: Fintech Clean (Roxo + Branco)

## Objetivo

Criar um portal público de busca de preços baseado em NF-e (Notas Fiscais Eletrônicas) armazenadas em MySQL, permitindo que usuários busquem produtos e vejam histórico de preços.

## Requisitos Funcionais

### 1. Busca Pública (Sem Login)

#### Home Page (/)
- ✅ Campo de busca grande e destacado
- ✅ Autocomplete com debounce de 400ms
- ✅ Sugestões baseadas em produtos reais
- ✅ Visual moderno e limpo
- ✅ Cards de features do sistema

#### Página de Busca (/buscar?q=)
- ✅ Lista paginada de produtos agrupados por `product_key`
- ✅ Informações exibidas por produto:
  - Nome do produto
  - Último preço (ocorrência mais recente)
  - Melhor preço (MIN ValorUnitario)
  - Variação percentual
  - Número de ocorrências
  - Data da última atualização
- ✅ Filtros disponíveis:
  - Estado (UF)
  - Loja (Local)
  - Faixa de preço (min/max)
- ✅ Ordenação:
  - Mais recente (padrão)
  - Menor preço
  - Maior preço
- ✅ Paginação (20 itens por página)
- ✅ CTA "Ver detalhes" (redireciona para login se não autenticado)

#### Página da Loja (/loja/{cnpj})
- ✅ Página pública e SEO-friendly
- ✅ Informações da loja:
  - Nome (Local mais frequente)
  - CNPJ
  - UF e endereço
  - Número de notas fiscais
- ✅ Top 20 produtos mais comuns da loja
- ✅ Último preço de cada produto
- ✅ CTA para login (ver histórico detalhado)

### 2. Área Protegida (Requer Login)

#### Página de Produto (/produto/{slug})
- ✅ Redirecionamento para login se não autenticado
- ✅ Informações completas:
  - Nome do produto
  - Melhor preço histórico
  - Último preço
  - Preço médio
  - Preço máximo
  - Variação percentual
  - Número total de ocorrências
- ✅ Gráfico de histórico de preços (Recharts)
- ✅ Tendência (últimas 10 ocorrências)
- ✅ Tabela paginada com todas as ocorrências:
  - Data
  - Preço unitário
  - Quantidade
  - Unidade
  - Loja (link para página da loja)
  - UF
  - Número/Série da NF
  - CNPJ
  - URL da NF (se disponível)

### 3. Sistema de Autenticação

#### Login (/login)
- ✅ Campos: email + senha
- ✅ Validação com MD5 (compatibilidade com sistema legado)
- ✅ Verifica `IS_ATIVO = true`
- ✅ Armazena sessão em JWT (cookie HttpOnly)
- ✅ Redirect para `returnUrl` após login
- ✅ Dados na sessão:
  - UserID (Guid)
  - Nome (TX_NOME)
  - Email
  - IsAdmin

#### Logout
- ✅ Endpoint `/api/auth/logout`
- ✅ Remove cookie de sessão
- ✅ Redirect para home

### 4. Área Administrativa (/admin)

#### Restrições
- ✅ Acesso apenas para `IsAdmin = true`
- ✅ Redirect para home se não for admin

#### Dashboard
- ✅ Métricas principais:
  - Total de produtos únicos
  - Total de notas fiscais
  - Total de lojas (CNPJs únicos)
- ✅ Atividade recente:
  - Últimas 10 notas fiscais inseridas
  - Data e loja

## Requisitos Não-Funcionais

### Performance

#### Cache
- ✅ Autocomplete (suggest): 60 segundos
- ✅ Busca (search): 60-120 segundos
- ✅ Loja (store): 300 segundos
- ✅ Filtros: 300 segundos

#### Otimizações
- ✅ Pool de conexões MySQL (10 conexões)
- ✅ Queries parametrizadas
- ✅ Paginação obrigatória
- ✅ Índices recomendados documentados

### Segurança

- ✅ SQL injection prevention (queries parametrizadas)
- ✅ Cookies HttpOnly
- ✅ Cookies Secure (produção)
- ✅ JWT para autenticação
- ✅ Validação de permissões (admin)
- ✅ Rate limiting básico (planejado)

### Usabilidade

- ✅ UI moderna e responsiva
- ✅ Tema roxo + branco (fintech clean)
- ✅ Feedback visual em todas as ações
- ✅ Loading states
- ✅ Toast notifications (sonner)
- ✅ Navegação intuitiva

## Especificações Técnicas

### Backend

#### Banco de Dados
```
Host: mysql.zefreus.com.br
Port: 3306
Database: zefreus
User: zefreus
SSL: false
```

#### Tabelas Utilizadas
1. **zefreus.CON_API_USER** - Usuários
2. **zefreus.APP_NOTA_FISCAL** - Notas fiscais
3. **zefreus.APP_NOTA_FISCAL_PRODUTO** - Itens das notas

#### API Routes

**Públicas**:
- `GET /api/suggest?q=` - Autocomplete
- `GET /api/search?q=&page=&uf=&loja=&sort=` - Busca
- `GET /api/store/{cnpj}` - Dados da loja
- `GET /api/filters` - Filtros disponíveis
- `POST /api/auth/login` - Login

**Protegidas**:
- `GET /api/auth/me` - Usuário atual
- `POST /api/auth/logout` - Logout
- `GET /api/product/{slug}` - Detalhes do produto
- `GET /api/product/{slug}/history?page=` - Histórico

**Admin**:
- `GET /api/admin/metrics` - Métricas

### Frontend

#### Páginas
- `/` - Home
- `/buscar` - Busca
- `/produto/[slug]` - Produto (protegido)
- `/loja/[cnpj]` - Loja (público)
- `/login` - Login
- `/admin` - Admin (protegido)

#### Componentes UI
- shadcn/ui (todos componentes prontos)
- Tailwind CSS (tema customizado)
- Recharts (gráficos)
- Lucide Icons

## Status de Implementação

### ✅ Completo

1. **Infraestrutura**
   - Conexão MySQL
   - Sistema de autenticação MD5 + JWT
   - Sistema de cache
   - API Routes completas

2. **Frontend**
   - Home page com busca e autocomplete
   - Página de busca com filtros
   - Página de produto com gráficos
   - Página de loja (SEO)
   - Login
   - Dashboard admin
   - UI responsiva e moderna

3. **Backend**
   - Todas as rotas funcionando
   - Cache implementado
   - Queries otimizadas
   - Autenticação e autorização

4. **Segurança**
   - Queries parametrizadas
   - JWT + cookies HttpOnly
   - Validação de permissões

### 🔄 Próximas Melhorias

1. **Performance**
   - Implementar índices no banco (documentados)
   - Rate limiting mais robusto

2. **Admin**
   - Sistema de logs de busca
   - Blacklist de termos
   - Termos mais buscados
   - Produtos mais vistos

3. **Features**
   - Sistema de alertas de preço
   - Export de dados (CSV, PDF)
   - Comparador de lojas
   - API pública documentada

## Critérios de Sucesso

1. ✅ Usuários conseguem buscar produtos sem login
2. ✅ Autocomplete funciona com menos de 500ms
3. ✅ Login funciona com sistema MD5 legado
4. ✅ Usuários logados veem histórico completo
5. ✅ Páginas de loja são indexáveis (SEO)
6. ✅ Admin consegue ver métricas do sistema
7. ✅ UI é responsiva em todos os dispositivos
8. ✅ Performance adequada com cache

## Arquitetura

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   Next.js Frontend      │
│   - React Components    │
│   - Tailwind + shadcn   │
│   - Client-side routing │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   Next.js API Routes    │
│   - Authentication      │
│   - Cache Layer         │
│   - Business Logic      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   MySQL Database        │
│   - CON_API_USER        │
│   - APP_NOTA_FISCAL     │
│   - APP_NOTA_FISCAL_... │
└─────────────────────────┘
```

## Conclusão

O **Custava Search** é um portal completo e funcional de busca de preços baseado em NF-e. Todas as funcionalidades principais foram implementadas com sucesso, incluindo busca pública, autenticação, área protegida e painel administrativo. A aplicação está pronta para uso e pode ser expandida com as melhorias sugeridas.
