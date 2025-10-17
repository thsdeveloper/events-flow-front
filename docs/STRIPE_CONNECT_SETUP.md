# Configuração do Stripe Connect

Guia passo a passo para configurar Stripe Connect e webhooks.

## 📋 Pré-requisitos

- ✅ Conta Stripe criada (test mode)
- ✅ Chaves API configuradas
- ✅ Extensão Stripe instalada no Directus

---

## 1️⃣ Ativar Stripe Connect

### Passo 1: Acessar Connect no Dashboard

1. Acesse: https://dashboard.stripe.com/test/connect/accounts/overview
2. Clique em **"Get started"** ou **"Settings"**

### Passo 2: Configurar tipo de plataforma

1. Escolha: **"Platform or Marketplace"**
2. Selecione: **"Express accounts"** (onboarding simplificado)
3. Confirme a configuração

### Passo 3: Obter Client ID

1. Vá para: https://dashboard.stripe.com/test/settings/applications
2. Copie o **Client ID** (formato: `ca_xxxxx`)
3. Adicione no `.env` do Directus:

```bash
# directus/.env
STRIPE_CONNECT_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxxx
```

---

## 2️⃣ Configurar Webhook

### Passo 1: Criar Webhook Endpoint

1. Acesse: https://dashboard.stripe.com/test/webhooks
2. Clique em **"Add endpoint"**
3. Configure:
   - **Endpoint URL**: `http://localhost:8055/stripe/webhook`
   - **Description**: `Directus Stripe Integration`
   - **Events to send**: Selecione os seguintes eventos:

#### Eventos Necessários (Fase 2):
- ✅ `account.updated` - Atualização de conta Stripe Connect

#### Eventos para Fases Futuras:
- ⏳ `checkout.session.completed` - Sessão de checkout concluída (Fase 4)
- ⏳ `payment_intent.succeeded` - Pagamento confirmado (Fase 4)
- ⏳ `payment_intent.payment_failed` - Falha no pagamento (Fase 4)
- ⏳ `charge.refunded` - Reembolso processado (Fase 5)

### Passo 2: Obter Signing Secret

1. Após criar o webhook, copie o **Signing secret** (formato: `whsec_xxxxx`)
2. Adicione no `.env` do Directus:

```bash
# directus/.env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### Passo 3: Reiniciar Directus

```bash
cd directus
docker compose restart directus
```

---

## 3️⃣ Testar Webhook (Opcional)

### Usar Stripe CLI para testes locais

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Encaminhar webhooks para localhost
stripe listen --forward-to localhost:8055/stripe/webhook

# Em outro terminal, triggerar evento de teste
stripe trigger account.updated
```

---

## 4️⃣ Endpoints Disponíveis

### POST /stripe/connect-onboarding

Cria link de onboarding para organizador conectar conta Stripe.

**Request Body:**
```json
{
  "organizer_id": "uuid-do-organizador"
}
```

**Response:**
```json
{
  "url": "https://connect.stripe.com/setup/...",
  "account_id": "acct_xxxxx"
}
```

### POST /stripe/webhook

Recebe eventos do Stripe (configurado automaticamente via webhook).

**Headers:**
```
stripe-signature: t=xxx,v1=xxx
```

---

## 5️⃣ Verificar Instalação

### Verificar extensão carregada

```bash
docker compose logs directus | grep "Extensions loaded"
```

Você deve ver:
```
[INFO] Extensions loaded
```

### Testar endpoint manualmente

```bash
curl -X POST http://localhost:8055/stripe/connect-onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_DIRECTUS" \
  -d '{"organizer_id": "uuid-aqui"}'
```

---

## 6️⃣ Próximos Passos

Após configurar Stripe Connect e webhooks:

1. ✅ Testar onboarding de organizador
2. ⏭️ Implementar interface de "Configurar Pagamentos" no painel do organizador
3. ⏭️ Continuar para Fase 3: Checkout de Ingressos

---

## 🔧 Troubleshooting

### Webhook não está funcionando

1. Verificar `STRIPE_WEBHOOK_SECRET` no `.env`
2. Verificar logs: `docker compose logs directus | grep stripe`
3. Verificar eventos no dashboard: https://dashboard.stripe.com/test/webhooks

### Extensão não carrega

1. Verificar se arquivo existe: `directus/extensions/endpoints/stripe/src/index.ts`
2. Verificar logs de erro: `docker compose logs directus | grep ERROR`
3. Reiniciar container: `docker compose restart directus`

### Erro "stripe_account_id not found"

1. Verificar se campos foram adicionados à collection `organizers`
2. Executar: `cd nextjs && yarn generate:types`

---

## 📚 Referências

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Directus Extensions](https://docs.directus.io/extensions/)

---

**Status**: Pronto para testes de onboarding de organizadores
**Última atualização**: 2025-10-03
