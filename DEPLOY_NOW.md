# 🚀 Deploy do Frontend - GUIA RÁPIDO

## ✅ Pré-requisitos Concluídos

- ✅ Backend Directus rodando: https://events-flow-back-production.up.railway.app
- ✅ Repositório GitHub: https://github.com/thsdeveloper/events-flow-front
- ✅ Configurações prontas em `.env.production`
- ✅ `railway.json` e `nixpacks.toml` configurados

## 🎯 Deploy Via Railway Dashboard (RECOMENDADO)

### Passo 1: Criar Serviço no Railway

1. Acesse: **https://railway.app/project/events-flow**
2. Clique no botão **"+ New"** no canto superior direito
3. Selecione **"GitHub Repo"**
4. Selecione o repositório: **`thsdeveloper/events-flow-front`**
5. Branch: **`master`**
6. Clique em **"Deploy Now"**

### Passo 2: Configurar Variáveis de Ambiente

Após criar o serviço, vá em **Variables** e adicione:

```env
NEXT_PUBLIC_DIRECTUS_URL=https://events-flow-back-production.up.railway.app
DIRECTUS_PUBLIC_TOKEN=HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u
DIRECTUS_FORM_TOKEN=HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u
DIRECTUS_ADMIN_TOKEN=HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u
DIRECTUS_ROLE_USER=c11bba68-b8c6-47d6-a254-f5d6053c54f9
DIRECTUS_ROLE_ORGANIZER=0e4701b7-96f7-44b0-a20b-0cc4eb8dc52c
DRAFT_MODE_SECRET=HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u
NEXT_PUBLIC_ENABLE_VISUAL_EDITING=true
NEXT_PUBLIC_DIRECTUS_PUBLIC_TOKEN=HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<sua-stripe-publishable-key>
STRIPE_SECRET_KEY=<sua-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<seu-stripe-webhook-secret>
OPENAI_API_KEY=<sua-openai-api-key>
```

⚠️ **IMPORTANTE**: Após o deploy gerar a URL, volte e adicione:

```env
NEXT_PUBLIC_SITE_URL=https://seu-app-gerado.up.railway.app
```

### Passo 3: Gerar Domínio

1. Vá em **Settings → Networking**
2. Clique em **"Generate Domain"**
3. Anote a URL gerada (exemplo: `events-flow-front-production.up.railway.app`)
4. Volte em **Variables** e atualize `NEXT_PUBLIC_SITE_URL` com esta URL

### Passo 4: Aguardar Deploy

- O build levará ~3-5 minutos
- Acompanhe em **Deployments**
- Quando ficar verde ✅, está pronto!

## 📝 Após o Deploy

### 1. Atualizar CORS no Backend

Vá para o serviço `events-flow-back` no Railway:

1. Acesse **Variables**
2. Edite `CORS_ORIGIN`
3. Adicione a URL do frontend:

```
CORS_ORIGIN=https://events-flow-back-production.up.railway.app,https://events-flow-front-production.up.railway.app
```

4. Salve e aguarde redeploy automático

### 2. Configurar Webhooks do Stripe

No Stripe Dashboard:

1. Adicione webhook endpoint: `https://seu-frontend.up.railway.app/api/stripe/webhook`
2. Adicione webhook endpoint: `https://seu-frontend.up.railway.app/api/organizer/stripe/onboarding`
3. Copie o **Webhook Secret** e atualize `STRIPE_WEBHOOK_SECRET` no Railway

### 3. Testar Aplicação

```bash
# Abrir app no navegador
railway open

# Ver logs
railway logs -f
```

## 🐛 Troubleshooting

### Build falha por memória

Adicione variável:
```
NODE_OPTIONS=--max-old-space-size=4096
```

### Erro de CORS

- Verifique se adicionou a URL do frontend no `CORS_ORIGIN` do backend
- Verifique se as URLs estão corretas (https, sem barra no final)

### Imagens não carregam

Verifique `next.config.ts` - deve incluir:
```typescript
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'events-flow-back-production.up.railway.app',
    pathname: '/assets/**',
  },
]
```

## 📊 Checklist Pós-Deploy

- [ ] Frontend acessível via URL gerada
- [ ] Páginas carregam sem erro
- [ ] Imagens do Directus aparecem
- [ ] Login funciona
- [ ] CORS configurado no backend
- [ ] Webhooks Stripe configurados
- [ ] `NEXT_PUBLIC_SITE_URL` atualizado

## 🔗 Links Úteis

- Dashboard Railway: https://railway.app/project/events-flow
- Repositório GitHub: https://github.com/thsdeveloper/events-flow-front
- Backend Directus: https://events-flow-back-production.up.railway.app

---

**Tempo estimado total: 10-15 minutos** ⏱️
