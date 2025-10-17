# Deploy Next.js no Railway

## Pré-requisitos

- Railway CLI instalado ✅
- Conta no Railway
- Projeto 'events-flow' no Railway

## Passo a Passo

### 1. Login no Railway

```bash
railway login
```

### 2. Vincular ao Projeto Existente

```bash
# Listar projetos disponíveis
railway list

# Vincular ao projeto events-flow
railway link
# Selecione: events-flow
```

### 3. Criar um Novo Serviço para o Frontend

```bash
# Iniciar um novo serviço no projeto
railway init
```

Ou faça pelo painel do Railway:
- Acesse https://railway.app/project/events-flow
- Clique em "New Service" → "GitHub Repo"
- Conecte este repositório

### 4. Configurar Variáveis de Ambiente

Você precisa configurar as seguintes variáveis no Railway:

```bash
# Via CLI (uma por uma)
railway variables set NEXT_PUBLIC_DIRECTUS_URL=https://seu-directus.up.railway.app
railway variables set DIRECTUS_PUBLIC_TOKEN=seu-token-publico
railway variables set DIRECTUS_FORM_TOKEN=seu-token-form
railway variables set DIRECTUS_ADMIN_TOKEN=seu-token-admin
railway variables set NEXT_PUBLIC_SITE_URL=https://seu-app.up.railway.app
railway variables set DRAFT_MODE_SECRET=seu-secret-aleatorio
railway variables set NEXT_PUBLIC_ENABLE_VISUAL_EDITING=true
railway variables set STRIPE_SECRET_KEY=sk_live_seu-stripe-key
railway variables set STRIPE_PUBLISHABLE_KEY=pk_live_seu-stripe-key
railway variables set OPENAI_API_KEY=sk-seu-openai-key
```

**Ou via Dashboard do Railway:**
1. Acesse o serviço do frontend
2. Vá em "Variables"
3. Adicione todas as variáveis acima

### 5. Deploy

```bash
# Deploy via CLI
railway up

# Ou faça push para o GitHub (se conectou via GitHub)
git add .
git commit -m "Configuração para Railway"
git push
```

### 6. Configurar Domínio Customizado (Opcional)

```bash
# Via CLI
railway domain

# Ou no dashboard:
# Settings → Domains → Generate Domain
```

## Estrutura do Projeto Railway

Após configurar, você terá:

```
events-flow (projeto)
├── directus (serviço backend)
├── postgres (banco de dados)
├── redis (cache)
└── nextjs-frontend (novo serviço) ← Este deploy
```

## Configurações Importantes

### Port

O Railway define automaticamente a variável `PORT`. O Next.js detecta isso automaticamente.

### Build Settings

O Railway usa o `railway.json` e `nixpacks.toml` criados. Eles configuram:
- Node.js 20
- pnpm como package manager
- Build: `pnpm build`
- Start: `pnpm start`

### Recursos Recomendados

Para produção:
- Memory: 512MB - 1GB
- CPU: 1 vCPU
- Restart Policy: ON_FAILURE (já configurado)

## Webhooks do Stripe

Após o deploy, configure os webhooks do Stripe:

```bash
# 1. Obtenha a URL do seu app Railway
echo $RAILWAY_STATIC_URL

# 2. Configure os endpoints no Stripe Dashboard:
# - https://seu-app.up.railway.app/api/stripe/webhook
# - https://seu-app.up.railway.app/api/organizer/stripe/onboarding
```

## Troubleshooting

### Build falha com "out of memory"

Adicione a variável:
```bash
railway variables set NODE_OPTIONS="--max-old-space-size=4096"
```

### Erro de conexão com Directus

1. Verifique se `NEXT_PUBLIC_DIRECTUS_URL` aponta para a URL pública do Directus no Railway
2. Verifique se o Directus permite CORS da URL do frontend
3. No Directus, configure `CORS_ENABLED=true` e `CORS_ORIGIN=https://seu-frontend.up.railway.app`

### Imagens não carregam

Atualize o `next.config.ts` para incluir o domínio do Directus no Railway:

```typescript
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'seu-directus.up.railway.app',
    pathname: '/assets/**',
  },
]
```

### Verificar logs

```bash
railway logs
```

## Comandos Úteis

```bash
# Ver status do deploy
railway status

# Ver logs em tempo real
railway logs -f

# Abrir o app no navegador
railway open

# Listar variáveis
railway variables

# Redeploy
railway up --detach
```

## Monitoramento

Acesse o dashboard do Railway para:
- Ver métricas de CPU/RAM
- Logs em tempo real
- Histórico de deploys
- Configurar alertas

## Custo Estimado

Com Railway Hobby Plan ($5/mês):
- 500h de execução incluídas
- $0.000231/min adicional

App Next.js típico:
- ~$5-15/mês dependendo do tráfego
