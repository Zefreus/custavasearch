# Teste Manual - Fluxo de Login e Redirect

## 🧪 Como Testar o Fluxo Completo

### Passo 1: Limpar Cookies do Navegador
1. Abra o DevTools (F12)
2. Vá em Application → Cookies
3. Delete todos os cookies do localhost:3000

### Passo 2: Tentar Acessar Produto (Sem Login)
```
URL: http://localhost:3000/produto/arroz-namorado-1kg
```

**Resultado Esperado:**
- ✅ Você será redirecionado para `/login?returnUrl=/produto/arroz-namorado-1kg`
- ✅ URL deve mostrar o returnUrl na query string

### Passo 3: Fazer Login
```
Email: zefreus@gmail.com
Senha: tricolor83
```

**Resultado Esperado:**
- ✅ Mensagem "Login realizado com sucesso!"
- ✅ Redirect automático para `/produto/arroz-namorado-1kg`
- ✅ Página do produto carrega com detalhes completos
- ✅ Gráfico de histórico aparece
- ✅ Tabela de ocorrências visível

### Passo 4: Verificar Cookie
No DevTools:
```
Application → Cookies → localhost:3000
```

**Deve existir:**
- ✅ Cookie: `session`
- ✅ HttpOnly: true
- ✅ Path: /
- ✅ Expira em: ~7 dias

### Passo 5: Navegar Entre Páginas
1. Voltar para home (/)
2. Fazer nova busca
3. Clicar em "Ver detalhes" de outro produto

**Resultado Esperado:**
- ✅ Acesso direto ao produto (sem pedir login novamente)
- ✅ Todos os detalhes carregam
- ✅ Sessão mantida

---

## 🔍 Debug - Console do Navegador

Ao fazer login, você deve ver no console:
```
Login bem-sucedido, redirecionando para: /produto/arroz-namorado-1kg
```

---

## 📊 Verificação via DevTools Network

### Request: POST /api/auth/login
```
Status: 200 OK
Response: {"success": true, "user": {...}}
Set-Cookie: session=eyJhbGc...
```

### Request: GET /api/auth/me (após redirect)
```
Status: 200 OK
Cookie: session=eyJhbGc...
Response: {"user": {"name": "zefreus", ...}}
```

### Request: GET /api/product/arroz-namorado-1kg
```
Status: 200 OK
Cookie: session=eyJhbGc...
Response: {produto com todos os dados}
```

---

## ⚠️ Possíveis Problemas

### Problema 1: Redirect volta para /login
**Causa**: Cookie não foi setado corretamente  
**Solução**: 
- Verificar se o Set-Cookie está na resposta do login
- Garantir que o domínio está correto (localhost)
- Limpar todos os cookies e tentar novamente

### Problema 2: "Login necessário" após login
**Causa**: Cookie não está sendo enviado  
**Solução**:
- Verificar se HttpOnly está true
- Verificar se SameSite está correto
- Usar o mesmo protocolo (http/https)

### Problema 3: Página carrega mas mostra erro
**Causa**: Sessão expirada ou inválida  
**Solução**:
- Fazer logout
- Limpar cookies
- Fazer login novamente

---

## ✅ Checklist Final

- [ ] Limpei cookies antes do teste
- [ ] Acessei produto sem login → redirect para /login ✅
- [ ] returnUrl aparece na URL ✅
- [ ] Fiz login com credenciais corretas ✅
- [ ] Vi mensagem de sucesso ✅
- [ ] Fui redirecionado para o produto ✅
- [ ] Produto carregou com detalhes completos ✅
- [ ] Cookie de sessão foi criado ✅
- [ ] Posso navegar sem pedir login novamente ✅

---

## 🐛 Se Ainda Houver Problemas

Execute no terminal:
```bash
# Teste via cURL
curl -v "http://localhost:3000/api/product/arroz-namorado-1kg"
# Deve retornar 401

curl -v -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"zefreus@gmail.com","password":"tricolor83"}' \
  -c /tmp/cookie.txt
# Deve retornar 200 e criar cookie

curl -v "http://localhost:3000/api/product/arroz-namorado-1kg" \
  -b /tmp/cookie.txt
# Deve retornar 200 com dados do produto
```

Se os testes via cURL funcionarem mas o navegador não, o problema é:
- Cache do navegador
- Extensões bloqueando cookies
- Configurações de privacidade

**Solução**: Usar aba anônima ou outro navegador.

---

## 📝 Logs Úteis

Backend (supervisor):
```bash
tail -f /var/log/supervisor/nextjs.out.log
```

Procurar por:
- `POST /api/auth/login 200` ✅
- `GET /api/auth/me 200` ✅
- `GET /api/product/... 200` ✅

Se ver `401`, significa que o cookie não está sendo enviado.
