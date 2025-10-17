# Railway Deploy - Quick Start

## TL;DR

```bash
# 1. Login e vincular ao projeto
railway login
railway link  # Selecione: events-flow

# 2. Configurar variáveis (copie do .env local ou configure manualmente)
railway variables set NEXT_PUBLIC_DIRECTUS_URL=https://seu-directus.up.railway.app
railway variables set DIRECTUS_PUBLIC_TOKEN=seu-token
railway variables set DIRECTUS_FORM_TOKEN=seu-token
railway variables set DIRECTUS_ADMIN_TOKEN=seu-token
railway variables set NEXT_PUBLIC_SITE_URL=https://seu-app.up.railway.app
railway variables set DRAFT_MODE_SECRET=algum-secret-aleatorio
railway variables set NEXT_PUBLIC_ENABLE_VISUAL_EDITING=true

# 3. Deploy!
railway up
# ou use o helper script:
pnpm railway:deploy
```

## Scripts Disponíveis

```bash
pnpm railway:deploy   # Deploy interativo com verificações
pnpm railway:logs     # Ver logs em tempo real
pnpm railway:status   # Ver status do serviço
pnpm railway:open     # Abrir app no navegador
pnpm railway:vars     # Listar variáveis configuradas
```

## Variáveis Obrigatórias

- ✅ `NEXT_PUBLIC_DIRECTUS_URL` - URL do Directus no Railway
- ✅ `DIRECTUS_PUBLIC_TOKEN` - Token público do Directus
- ✅ `DIRECTUS_FORM_TOKEN` - Token para formulários
- ✅ `DIRECTUS_ADMIN_TOKEN` - Token admin (webhooks Stripe)
- ✅ `NEXT_PUBLIC_SITE_URL` - URL do frontend no Railway

## Variáveis Opcionais

- `DRAFT_MODE_SECRET` - Secret para preview mode
- `NEXT_PUBLIC_ENABLE_VISUAL_EDITING` - Habilitar edição visual
- `STRIPE_SECRET_KEY` - Chave secreta do Stripe
- `STRIPE_PUBLISHABLE_KEY` - Chave pública do Stripe
- `OPENAI_API_KEY` - Chave da OpenAI (se usar)

## Após Deploy

1. **Obter URL do serviço:**
   ```bash
   railway status
   # ou
   railway domain
   ```

2. **Configurar CORS no Directus:**
   - Adicione a URL do frontend em `CORS_ORIGIN`
   - Verifique `CORS_ENABLED=true`

3. **Configurar Webhooks do Stripe:**
   - Adicione `https://seu-app.up.railway.app/api/stripe/webhook`
   - Adicione `https://seu-app.up.railway.app/api/organizer/stripe/onboarding`

4. **Testar:**
   ```bash
   railway open
   ```

## Troubleshooting Rápido

### Build falha

```bash
# Aumentar memória para build
railway variables set NODE_OPTIONS="--max-old-space-size=4096"
```

### Imagens não carregam

Verifique se a URL do Directus está correta em `remotePatterns` no `next.config.ts`

### Ver logs de erro

```bash
railway logs -f
```

## Documentação Completa

Para instruções detalhadas, veja: [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)
