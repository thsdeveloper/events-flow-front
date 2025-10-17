# 🚀 DEPLOY DO FRONTEND - COMECE AQUI

## ✅ Status Atual

- ✅ **Backend Directus**: https://events-flow-back-production.up.railway.app
- ✅ **Repositório GitHub**: https://github.com/thsdeveloper/events-flow-front
- ✅ **Configurações**: Todas prontas e commitadas
- ⏳ **Frontend**: Aguardando deploy

## 🎯 PRÓXIMOS PASSOS (5 minutos)

### 1️⃣ Acesse o Railway Dashboard

👉 **https://railway.app/project/events-flow**

### 2️⃣ Crie o Serviço do Frontend

1. Clique em **"+ New"** (canto superior direito)
2. Selecione **"GitHub Repo"**
3. Escolha: **`thsdeveloper/events-flow-front`**
4. Branch: **`master`**
5. Clique **"Deploy Now"**

### 3️⃣ Configure Variáveis de Ambiente

Enquanto o build roda, vá em **Variables** e cole TUDO de uma vez:

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
```

**⚠️ IMPORTANTE**: Copie suas chaves Stripe e OpenAI do `.env` local e adicione também:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-proj-...
```

### 4️⃣ Gere o Domínio

1. Vá em **Settings → Networking**
2. Clique **"Generate Domain"**
3. Copie a URL gerada (ex: `events-flow-front-production.up.railway.app`)
4. Volte em **Variables** e adicione:

```env
NEXT_PUBLIC_SITE_URL=https://events-flow-front-production.up.railway.app
```

### 5️⃣ Aguarde o Deploy

⏱️ Build leva ~3-5 minutos

Acompanhe em **Deployments**. Quando ficar verde ✅:

```bash
# Via CLI (opcional)
railway open
```

Ou acesse a URL gerada diretamente no navegador!

## 📝 DEPOIS DO DEPLOY (Obrigatório!)

### ⚠️ Atualizar CORS no Backend

**MUITO IMPORTANTE**: O frontend não funcionará sem isso!

1. Vá para o serviço **`events-flow-back`** no Railway
2. Acesse **Variables**
3. Edite `CORS_ORIGIN` e adicione a URL do frontend:

```
CORS_ORIGIN=https://events-flow-back-production.up.railway.app,https://events-flow-front-production.up.railway.app
```

4. Salve (redeploy automático)

### 🔔 Configurar Webhooks Stripe (Opcional)

No Stripe Dashboard (https://dashboard.stripe.com/webhooks):

1. Adicionar endpoint: `https://seu-frontend.up.railway.app/api/stripe/webhook`
2. Eventos: Selecionar todos de `payment_intent` e `account`
3. Copiar o **Signing Secret** e atualizar `STRIPE_WEBHOOK_SECRET`

## ✅ Checklist Final

- [ ] Frontend deployado e acessível
- [ ] Variáveis de ambiente configuradas
- [ ] `NEXT_PUBLIC_SITE_URL` atualizado com URL gerada
- [ ] CORS atualizado no backend ⚠️ **CRÍTICO**
- [ ] Login funciona
- [ ] Imagens carregam
- [ ] Webhooks Stripe configurados (se usar pagamentos)

## 🆘 Problemas?

### Build falha por memória
Adicione: `NODE_OPTIONS=--max-old-space-size=4096`

### Erro de CORS
Verifique se adicionou URL do frontend no backend em `CORS_ORIGIN`

### Imagens não aparecem
Normal - aguarde configurar CORS no backend

## 📚 Documentação Completa

- **[DEPLOY_NOW.md](./DEPLOY_NOW.md)** - Guia detalhado passo a passo
- **[README_DEPLOY.md](./README_DEPLOY.md)** - Índice de toda documentação
- **[CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md)** - Configurar domínio próprio

## 🔗 Links Úteis

- **Railway Dashboard**: https://railway.app/project/events-flow
- **GitHub Repo**: https://github.com/thsdeveloper/events-flow-front
- **Backend Directus**: https://events-flow-back-production.up.railway.app
- **Directus Admin**: https://events-flow-back-production.up.railway.app/admin

---

⏱️ **Tempo total estimado: 10 minutos** | Criado com ❤️ por Claude Code
