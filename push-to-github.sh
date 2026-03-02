#!/bin/bash

echo "🚀 Push para GitHub - Custava Search"
echo ""
echo "Repositório: https://github.com/Zefreus/custavasearch.git"
echo ""
echo "⚠️ Você precisará autenticar com:"
echo "   - Personal Access Token (recomendado)"
echo "   - Ou suas credenciais do GitHub"
echo ""
echo "Como obter Personal Access Token:"
echo "1. GitHub → Settings → Developer settings"
echo "2. Personal access tokens → Tokens (classic)"
echo "3. Generate new token → Marcar 'repo'"
echo "4. Copiar o token"
echo "5. Usar como SENHA quando fazer push"
echo ""
echo "Executando push..."
echo ""

cd /app
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push realizado com sucesso!"
    echo "📍 Veja em: https://github.com/Zefreus/custavasearch"
    echo ""
    echo "🚀 Próximo passo: Deploy na Vercel"
    echo "   1. Acesse: https://vercel.com/new"
    echo "   2. Importe: Zefreus/custavasearch"
    echo "   3. Configure variáveis de ambiente"
    echo "   4. Deploy!"
else
    echo ""
    echo "❌ Erro ao fazer push"
    echo ""
    echo "Soluções:"
    echo "1. Configure SSH key:"
    echo "   ssh-keygen -t ed25519 -C 'seu@email.com'"
    echo "   cat ~/.ssh/id_ed25519.pub"
    echo "   Adicione no GitHub: Settings → SSH keys"
    echo ""
    echo "2. Ou use Personal Access Token como senha"
    echo ""
    echo "3. Ou tente SSH URL:"
    echo "   git remote set-url origin git@github.com:Zefreus/custavasearch.git"
    echo "   git push -u origin main"
fi
