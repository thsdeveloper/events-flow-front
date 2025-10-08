# Webhooks do Stripe

Os webhooks do Stripe estão implementados **no Next.js** em `/api/stripe/webhook`.

## 📍 Endpoint

```
Desenvolvimento: http://localhost:3000/api/stripe/webhook
Produção:       https://seu-dominio.com/api/stripe/webhook
```

---

## 🚀 Configuração para Desenvolvimento

### 1. Instalar Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_amd64.tar.gz
tar -xvf stripe_linux_amd64.tar.gz && sudo mv stripe /usr/local/bin/
```

### 2. Login e encaminhar webhooks

```bash
# Login no Stripe
stripe login

# Encaminhar para o Next.js
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Você verá:
```
Ready! Your webhook signing secret is whsec_1234567890abcdef
```

### 3. Configurar secret no Next.js

Copie o `whsec_...` e adicione em `nextjs/.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef
```

### 4. Reiniciar Next.js

```bash
cd nextjs
# Pare o servidor (Ctrl+C) e reinicie
pnpm dev
```

---

## ✅ Eventos Implementados

### `payment_intent.succeeded`
**Confirma pagamento e gera ingressos**
- Atualiza `event_registrations` (status → `confirmed`, payment_status → `paid`)
- Gera `ticket_code` único
- Incrementa `quantity_sold` do ticket
- Envia email de confirmação
- Registra em `payment_transactions`

### `account.updated` (Stripe Connect)
**Sincroniza dados do organizador**
- Atualiza `stripe_onboarding_complete`
- Atualiza `stripe_charges_enabled`
- Atualiza `stripe_payouts_enabled`

### `payment_intent.payment_failed` ⚠️ TODO
**Notifica sobre falha no pagamento**

### `charge.refunded` ⚠️ TODO
**Processa reembolsos**

---

## 🧪 Testar Webhooks

```bash
# Testar pagamento
stripe trigger payment_intent.succeeded

# Testar conta Connect
stripe trigger account.updated
```

**Ver logs do Directus:**
```bash
cd directus && docker compose logs -f directus
```

---

## 🌐 Produção

1. **Stripe Dashboard** → Webhooks → Add endpoint
2. **URL**: `https://seu-dominio.com/api/stripe/webhook`
3. **Eventos**:
   - `payment_intent.succeeded`
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated`
4. Copiar webhook secret (`whsec_...`)
5. Adicionar `STRIPE_WEBHOOK_SECRET` nas variáveis de ambiente de produção (Vercel/Netlify)

⚠️ **Secrets diferentes**: Dev (Stripe CLI) ≠ Produção (Dashboard)

---

## 📁 Código-fonte

```
nextjs/src/app/api/stripe/webhook/route.ts
nextjs/src/lib/stripe/webhooks.ts (handlers)
```

**Endpoint disponível:**
- `POST /api/stripe/webhook` - Recebe eventos do Stripe

---

## 🔍 Monitoramento

**Stripe Dashboard:**
https://dashboard.stripe.com/webhooks

**Logs de transações (Directus):**
Collection `payment_transactions`

---

**Última atualização**: 2025-10-06
