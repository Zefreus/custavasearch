# 🚀 Deploy na Vercel - Custava Search

## ✅ Pré-requisitos

- [ ] Conta no GitHub
- [ ] Conta na Vercel (gratuita)
- [ ] Projeto commitado no Git

---

## 📋 Passo 1: Preparar o Repositório GitHub

### 1.1 Inicializar Git (se ainda não fez)

```bash
cd /app
git init
git add .
git commit -m "Initial commit - Custava Search"
```

### 1.2 Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Nome: `custava-search` (ou outro de sua preferência)
3. Descrição: `Portal de busca de preços baseado em NF-e`
4. Privado ou Público (sua escolha)
5. **NÃO** inicialize com README
6. Clique em "Create repository"

### 1.3 Conectar e Enviar

```bash
# Substitua SEU_USUARIO pelo seu usuário do GitHub
git remote add origin https://github.com/SEU_USUARIO/custava-search.git
git branch -M main
git push -u origin main
```

---

## 🌐 Passo 2: Deploy na Vercel

### 2.1 Criar Conta na Vercel

1. Acesse: https://vercel.com/signup
2. Clique em "Continue with GitHub"
3. Autorize a Vercel a acessar seus repositórios

### 2.2 Importar Projeto

1. No dashboard da Vercel, clique em **"Add New"** → **"Project"**
2. Encontre o repositório `custava-search`
3. Clique em **"Import"**

### 2.3 Configurar o Projeto

**Framework Preset:** Next.js (detectado automaticamente)

**Root Directory:** `./` (deixar como está)

**Build Command:** `npm run build` (já configurado)

**Output Directory:** `.next` (já configurado)

**Install Command:** `npm install` (já configurado)

---

## 🔐 Passo 3: Configurar Variáveis de Ambiente

### 3.1 Na tela de configuração do projeto, clique em "Environment Variables"

### 3.2 Adicione as seguintes variáveis:

```env
MYSQL_HOST=mysql.zefreus.com.br
```

```env
MYSQL_PORT=3306
```

```env
MYSQL_DB=zefreus
```

```env
MYSQL_USER=zefreus
```

```env
MYSQL_PASSWORD=tricolor83
```

```env
MYSQL_SSL=false
```

```env
SESSION_SECRET=custava-search-secret-production-key-change-me
```

**⚠️ IMPORTANTE:** 
- Altere o `SESSION_SECRET` para uma string aleatória e segura
- Para cada variável, clique em **"Add"** antes de adicionar a próxima

### 3.3 Ambiente

Para todas as variáveis, selecione:
- ✅ Production
- ✅ Preview
- ✅ Development

---

## 🚀 Passo 4: Deploy!

1. Revise todas as configurações
2. Clique em **"Deploy"**
3. Aguarde o build (2-3 minutos)
4. 🎉 Pronto! Seu site estará no ar!

---

## 🌍 Passo 5: Acessar Seu Site

Após o deploy, você receberá uma URL como:
```
https://custava-search.vercel.app
```

Ou com seu nome:
```
https://custava-search-seu-usuario.vercel.app
```

---

## 🔧 Passo 6: Configurações Pós-Deploy

### 6.1 Domínio Personalizado (Opcional)

1. No dashboard do projeto na Vercel
2. Vá em **"Settings"** → **"Domains"**
3. Adicione seu domínio personalizado
4. Siga as instruções para configurar o DNS

### 6.2 Verificar Funcionamento

Teste estas URLs no seu site publicado:

```
# Home
https://seu-site.vercel.app/

# Busca
https://seu-site.vercel.app/buscar?q=arroz

# Login
https://seu-site.vercel.app/login

# API (teste)
https://seu-site.vercel.app/api/suggest?q=cafe
```

---

## 🔄 Passo 7: Deploys Futuros (Automático!)

Qualquer commit que você fizer no GitHub será automaticamente deployado:

```bash
# Fazer mudanças
git add .
git commit -m "Suas mudanças"
git push

# A Vercel detecta e faz deploy automático! 🎉
```

---

## 📊 Monitoramento

### Ver Logs em Tempo Real

1. Dashboard da Vercel
2. Clique no seu projeto
3. Aba **"Functions"** → Ver logs das APIs
4. Aba **"Analytics"** → Ver estatísticas de uso

---

## ⚠️ Problemas Comuns e Soluções

### Erro: "Build Failed"

**Solução:**
```bash
# Teste o build localmente primeiro
cd /app
npm run build

# Se funcionar localmente, verifique:
# - Todas as dependências estão no package.json
# - Variáveis de ambiente estão corretas
```

### Erro: "Module not found"

**Solução:**
```bash
# Garanta que todas as dependências estão instaladas
npm install
npm run build
```

### Erro: "Database connection failed"

**Solução:**
- Verifique se todas as variáveis MYSQL_* foram adicionadas
- Verifique se o IP da Vercel tem acesso ao MySQL
- Pode ser necessário liberar IPs da Vercel no firewall do MySQL

### Site Lento na Primeira Visita

**Normal!** Funções serverless "dormem" quando não usadas.
- Primeira visita: ~2-3s
- Visitas seguintes: <500ms

---

## 🎯 Checklist Final

Antes de compartilhar seu site, verifique:

- [ ] Site abre normalmente
- [ ] Busca funciona
- [ ] Login funciona (teste com zefreus@gmail.com)
- [ ] Produtos carregam (após login)
- [ ] Admin funciona (se aplicável)
- [ ] Trending products aparecem na home
- [ ] Mobile está responsivo

---

## 📝 URLs Importantes

- **Seu Site:** `https://[seu-projeto].vercel.app`
- **Dashboard Vercel:** https://vercel.com/dashboard
- **Documentação:** https://vercel.com/docs
- **Suporte:** https://vercel.com/support

---

## 🔐 Segurança em Produção

### Após o Deploy, Faça:

1. **Gere um SESSION_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Atualize na Vercel:**
   - Settings → Environment Variables
   - Edite SESSION_SECRET
   - Redeploy

3. **Configure CORS (se necessário):**
   - Já está configurado para aceitar todas as origens
   - Em produção, você pode restringir no código

---

## 💡 Dicas de Otimização

### 1. Habilitar Analytics
- Dashboard → Analytics → Enable

### 2. Configurar Caching
- Já configurado no código (300s para rotas específicas)

### 3. Monitorar Performance
- Vercel automaticamente monitora
- Veja relatórios em Real-time

---

## 🎉 Pronto!

Seu **Custava Search** agora está:
- ✅ Hospedado na Vercel
- ✅ Com SSL automático (HTTPS)
- ✅ Deploy automático do GitHub
- ✅ CDN global
- ✅ Monitoramento incluído
- ✅ Grátis! 🎉

**Qualquer dúvida, consulte a documentação da Vercel ou me pergunte!**

---

## 📞 Precisa de Ajuda?

- Vercel Discord: https://vercel.com/discord
- Documentação: https://vercel.com/docs
- Status: https://www.vercel-status.com/

**Bom deploy! 🚀**
