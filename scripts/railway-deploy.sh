#!/bin/bash

# Script para facilitar o deploy no Railway
# Usage: ./scripts/railway-deploy.sh

set -e

echo "🚀 Railway Deploy Helper"
echo "========================"
echo ""

# Verificar se Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI não encontrado!"
    echo "📦 Instale com: npm i -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI encontrado"

# Verificar se está logado
if ! railway whoami &> /dev/null; then
    echo "🔐 Fazendo login no Railway..."
    railway login
else
    echo "✅ Já logado no Railway"
fi

# Listar projetos
echo ""
echo "📋 Seus projetos no Railway:"
railway list

# Perguntar se quer vincular ao projeto
echo ""
read -p "Deseja vincular a um projeto existente? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    railway link
else
    echo "⏭️  Pulando vinculação de projeto"
fi

# Verificar variáveis essenciais
echo ""
echo "🔍 Verificando variáveis de ambiente..."
echo ""

REQUIRED_VARS=(
    "NEXT_PUBLIC_DIRECTUS_URL"
    "DIRECTUS_PUBLIC_TOKEN"
    "DIRECTUS_FORM_TOKEN"
    "NEXT_PUBLIC_SITE_URL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if railway variables get "$var" &> /dev/null; then
        echo "✅ $var: configurada"
    else
        echo "❌ $var: NÃO configurada"
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Variáveis faltando: ${MISSING_VARS[*]}"
    echo ""
    read -p "Deseja configurá-las agora? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for var in "${MISSING_VARS[@]}"; do
            read -p "Valor para $var: " value
            railway variables set "$var=$value"
            echo "✅ $var configurada"
        done
    else
        echo "⚠️  Configure as variáveis manualmente antes do deploy!"
        exit 1
    fi
fi

# Verificar se há mudanças não commitadas
if [[ -n $(git status -s) ]]; then
    echo ""
    echo "⚠️  Há mudanças não commitadas no repositório"
    git status -s
    echo ""
    read -p "Deseja fazer commit antes do deploy? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Mensagem do commit: " commit_msg
        git add .
        git commit -m "$commit_msg"
        echo "✅ Commit realizado"
    fi
fi

# Fazer deploy
echo ""
echo "🚀 Iniciando deploy..."
railway up --detach

echo ""
echo "✅ Deploy iniciado com sucesso!"
echo ""
echo "📊 Acompanhe o progresso:"
echo "   - Logs: railway logs -f"
echo "   - Dashboard: railway open"
echo "   - Status: railway status"
echo ""
