# Planejamento de Integração Stripe - Sistema de Eventos

## 📊 Análise do Schema Atual

Seu sistema possui:
- ✅ Múltiplos tipos de ingressos por evento (`event_tickets`)
- ✅ Sistema de taxas configurável (absorvida ou repassada ao comprador)
- ✅ Controle de quantidade e estoque
- ✅ Registros de compra com campos de pagamento (`event_registrations`)
- ✅ Status de pagamento: `free`, `paid`, `pending`, `refunded`

**Pontos positivos**: A estrutura de dados já contempla os conceitos necessários para integração com gateway de pagamento.

---

## 🎯 Arquitetura Recomendada: Stripe Connect (Platform Model)

### Por quê Stripe Connect?
- Você tem múltiplos organizadores (`organizers`)
- Cada organizador deve receber os pagamentos dos seus eventos
- A plataforma cobra taxa de serviço (`service_fee_percentage`)
- Separação clara entre fundos da plataforma vs. organizadores

### Modelo sugerido: Stripe Connect - Express Accounts
- Onboarding simplificado para organizadores
- Plataforma controla a experiência de checkout
- Split automático de pagamentos (valor do ingresso + taxa de serviço)

---

## 🏗️ Arquitetura de Implementação

### 1. Backend (Directus + API Routes)

```
directus/
└── extensions/
    ├── endpoints/
    │   └── stripe/
    │       ├── checkout-session.ts          # Criar sessão de checkout
    │       ├── webhook.ts                   # Webhook do Stripe
    │       ├── connect-onboarding.ts        # Onboarding organizadores
    │       └── refund.ts                    # Processar reembolsos
    └── hooks/
        └── stripe/
            ├── ticket-price-calculator.ts   # Calcular buyer_price
            └── registration-updater.ts      # Atualizar após pagamento
```

### 2. Frontend (Next.js)

```
nextjs/src/
├── app/
│   └── api/
│       └── stripe/
│           └── webhook/route.ts             # Webhook handler Next.js
├── components/
│   └── checkout/
│       ├── TicketSelection.tsx              # Seleção de ingressos
│       ├── CheckoutButton.tsx               # Botão de checkout Stripe
│       └── PaymentSuccess.tsx               # Confirmação de pagamento
└── lib/
    └── stripe/
        ├── client.ts                        # Stripe client-side
        ├── server.ts                        # Stripe server-side
        └── webhooks.ts                      # Handlers de webhook
```

---

## 🔧 Mudanças no Schema Directus

### Collection: `organizers` (adicionar campos Stripe Connect)

```javascript
{
  stripe_account_id: {
    type: 'string',
    note: 'ID da conta Stripe Connect do organizador',
    readonly: true,
    interface: 'input'
  },
  stripe_onboarding_complete: {
    type: 'boolean',
    note: 'Onboarding Stripe completado?',
    interface: 'boolean'
  },
  stripe_charges_enabled: {
    type: 'boolean',
    note: 'Conta habilitada para receber pagamentos',
    interface: 'boolean'
  },
  stripe_payouts_enabled: {
    type: 'boolean',
    note: 'Conta habilitada para receber transferências',
    interface: 'boolean'
  }
}
```

### Collection: `event_registrations` (adicionar campos Stripe)

```javascript
{
  stripe_payment_intent_id: {
    type: 'string',
    note: 'ID do Payment Intent no Stripe',
    readonly: true,
    interface: 'input'
  },
  stripe_checkout_session_id: {
    type: 'string',
    note: 'ID da sessão de checkout',
    readonly: true,
    interface: 'input'
  },
  stripe_refund_id: {
    type: 'string',
    note: 'ID do reembolso no Stripe (se aplicável)',
    readonly: true,
    interface: 'input'
  },
  payment_method: {
    type: 'string',
    note: 'Método de pagamento usado (card, pix, etc)',
    interface: 'select-dropdown',
    choices: ['card', 'pix', 'boleto', 'free']
  }
}
```

### Nova Collection: `payment_transactions` (auditoria de pagamentos)

```javascript
{
  id: 'uuid',
  registration_id: 'uuid',          // FK para event_registrations
  stripe_event_id: 'string',        // ID do webhook event
  stripe_object_id: 'string',       // payment_intent/refund ID
  event_type: 'string',             // payment_intent.succeeded, etc
  amount: 'decimal',
  status: 'string',
  metadata: 'json',                 // Dados completos do webhook
  date_created: 'timestamp'
}
```

---

## 💳 Fluxo de Pagamento Completo

### A. Onboarding do Organizador (Stripe Connect)

```
1. Organizador clica "Configurar Pagamentos"
2. Backend cria AccountLink (Stripe)
3. Organizador preenche dados no Stripe
4. Webhook account.updated → Atualiza organizer em Directus
5. Organizador pode criar eventos pagos
```

**Endpoint Directus**: `/stripe/connect-onboarding`

### B. Compra de Ingresso pelo Participante

```
1. Usuário seleciona ingressos no frontend
2. POST /api/stripe/checkout-session
   ├─ Valida disponibilidade de ingressos
   ├─ Calcula valor total + taxa de serviço
   ├─ Cria registration com status=pending
   └─ Cria Checkout Session (Stripe)
       ├─ line_items: ingressos
       ├─ payment_intent_data.application_fee_amount: taxa plataforma
       ├─ payment_intent_data.transfer_data.destination: stripe_account_id do organizador
       └─ metadata: {registration_id, event_id, ticket_ids}

3. Usuário redirecionado para Stripe Checkout
4. Pagamento aprovado
5. Webhook payment_intent.succeeded
   ├─ Atualiza registration: payment_status=paid
   ├─ Decrementa event_tickets.quantity_sold
   ├─ Gera ticket_code único
   ├─ Envia email de confirmação
   └─ Registra em payment_transactions

6. Redirect para success_url com registration_id
```

### Cálculo de Split de Pagamento

```typescript
const ticketPrice = 100.00; // Preço definido pelo organizador
const serviceFeePercentage = 10; // Da event_configurations

if (service_fee_type === 'absorbed') {
  // Organizador absorve a taxa
  buyerPrice = ticketPrice;
  organizerReceives = ticketPrice - (ticketPrice * serviceFeePercentage / 100);
  platformFee = ticketPrice * serviceFeePercentage / 100;

} else { // 'passed_to_buyer'
  // Comprador paga a taxa
  platformFee = ticketPrice * serviceFeePercentage / 100;
  buyerPrice = ticketPrice + platformFee;
  organizerReceives = ticketPrice;
}

// No Stripe:
application_fee_amount = platformFee * 100; // Centavos
```

### C. Webhook do Stripe

**Eventos críticos a implementar**:
- `checkout.session.completed` → Confirmar início do pagamento
- `payment_intent.succeeded` → Pagamento confirmado
- `payment_intent.payment_failed` → Falha no pagamento
- `charge.refunded` → Reembolso processado
- `account.updated` → Atualizar dados do organizador

**Implementação**:

```typescript
// directus/extensions/endpoints/stripe/webhook.ts
import { defineEndpoint } from '@directus/extensions-sdk';
import Stripe from 'stripe';

export default defineEndpoint({
  id: 'stripe-webhook',
  handler: async (router, { services, database, getSchema }) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    router.post('/', async (req, res) => {
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      try {
        const event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );

        // Processar evento...

      } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    });
  }
});
```

---

## 🔐 Segurança e Boas Práticas

1. **Validação de Estoque**
   - Verificar `event_tickets.quantity - quantity_sold` antes de criar Checkout Session
   - Lock otimista com `date_updated` para evitar overselling

2. **Idempotência**
   - Usar `stripe_payment_intent_id` como chave única
   - Prevenir processamento duplicado de webhooks

3. **Webhook Security**
   - Sempre validar assinatura do Stripe
   - Processar webhooks em fila assíncrona (Redis/Bull)

4. **PCI Compliance**
   - Nunca armazenar dados de cartão
   - Usar Stripe Checkout ou Stripe Elements
   - Toda captura de pagamento via Stripe

5. **Timezone Handling**
   - Converter datas de evento para UTC
   - Exibir em timezone local do evento no frontend

---

## 📦 Roadmap de Implementação (8 semanas)

### Fase 1: Fundação (Semana 1-2)
- [x] Setup Stripe account (Test + Production) - Conta criada e chaves obtidas
- [x] Instalar SDK Stripe (`yarn add stripe @stripe/stripe-js`)
  - Next.js: `stripe@19.0.0` e `@stripe/stripe-js@8.0.0`
- [x] Adicionar campos Stripe ao schema Directus (organizers, event_registrations)
  - `organizers`: stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled
  - `event_registrations`: stripe_payment_intent_id, stripe_checkout_session_id, stripe_refund_id, payment_method
- [x] Criar collection `payment_transactions` com relação M2O para event_registrations
- [x] Configurar variáveis de ambiente
  - Next.js: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY
  - Directus: STRIPE_SECRET_KEY (STRIPE_WEBHOOK_SECRET e STRIPE_CONNECT_CLIENT_ID serão configurados nas próximas fases)

**Entregável**: ✅ Schema atualizado, SDKs instalados, variáveis configuradas

---

### Fase 2: Stripe Connect - Onboarding (Semana 3)
- [x] Endpoint Directus: `/stripe/connect-onboarding` - Implementado em `directus/extensions/endpoints/stripe/`
- [x] Webhook handler: `account.updated` - Atualiza campos do organizador automaticamente
- [x] Estrutura de arquivos Stripe no Next.js: `lib/stripe/client.ts`, `server.ts`, `webhooks.ts`
- [x] Stripe Connect ativado no dashboard
- [x] Client ID configurado: `ca_TAZz9PK8t4Mgh4mgZuohnWGUBh9gJUsU`
- [ ] Webhook configurado (Pendente - requer deploy ou Stripe CLI para localhost)
- [ ] Interface no painel do organizador: "Configurar Pagamentos" (Pendente - requer UI)
- [ ] Validação: organizador só pode criar eventos pagos se onboarding completo (Pendente - requer UI)
- [x] Documentação: `STRIPE_CONNECT_SETUP.md` e `STRIPE_STATUS_ATUAL.md` criados

**Entregável**: ✅ Backend pronto e testável, organizadores podem conectar conta Stripe (webhook e UI pendentes)

---

### Fase 3: Checkout de Ingressos (Semana 4-5)
- [x] Componente frontend: `TicketSelection.tsx` - Seleção de ingressos com validação
- [x] Componente frontend: `EventCheckout.tsx` - Fluxo completo com formulário de participante
- [x] Hook: `useCheckout.ts` - Gerenciamento do fluxo de checkout
- [x] API Route: `/api/stripe/checkout-session` - Criação de sessão de pagamento
- [x] Lógica de cálculo de preços + taxas - Suporte a "absorbed" e "passed_to_buyer"
- [x] Validação de estoque em tempo real - Com limites min/max
- [x] Criação de `event_registration` com status pending
- [x] Redirect para Stripe Checkout - Com split payment configurado
- [x] Páginas de sucesso e cancelamento - `/checkout/success` e `/checkout/cancel`
- [x] Documentação: `FASE3_CHECKOUT_IMPLEMENTACAO.md` criado

**Entregável**: ✅ Usuários podem comprar ingressos (03/10/2025)

---

### Fase 4: Webhooks e Confirmação (Semana 6)
- [ ] Endpoint webhook Directus/Next.js
- [ ] Handler: `payment_intent.succeeded`
- [ ] Handler: `payment_intent.payment_failed`
- [ ] Atualização de status de registration
- [ ] Geração de `ticket_code` único
- [ ] Decremento de `quantity_sold`
- [ ] Email de confirmação (via Directus Flows)

**Entregável**: Pagamentos confirmados automaticamente

---

### Fase 5: Reembolsos (Semana 7)
- [ ] Endpoint: `/stripe/refund`
- [ ] Webhook: `charge.refunded`
- [ ] Interface no painel: botão "Reembolsar"
- [ ] Validações: apenas organizador ou admin pode reembolsar
- [ ] Atualizar registration: `payment_status=refunded`

**Entregável**: Sistema de reembolsos funcionando

---

### Fase 6: Testes e Go-Live (Semana 8)
- [ ] Testes end-to-end com Stripe Test Mode
- [ ] Teste de overselling (múltiplas compras simultâneas)
- [ ] Teste de webhooks atrasados/duplicados
- [ ] Documentação para organizadores
- [ ] Deploy em produção
- [ ] Configurar Stripe Production Mode

**Entregável**: Sistema em produção

---

## 💰 Custos Stripe

### Stripe Connect - Express Accounts
- Taxa Stripe padrão: 3,99% + R$ 0,39 por transação (cartão nacional)
- Taxa da plataforma: configurável em `service_fee_percentage`
- Sem mensalidade

### Exemplo de transação

```
Ingresso: R$ 100,00
Taxa plataforma (10%): R$ 10,00
Subtotal: R$ 110,00 (se passed_to_buyer)
Taxa Stripe (3,99%): R$ 4,39
Taxa fixa Stripe: R$ 0,39

Comprador paga: R$ 110,00
Stripe desconta: R$ 4,78
Plataforma recebe: R$ 10,00
Organizador recebe: R$ 95,22
```

---

## 🔥 Funcionalidades Avançadas (Futuras)

1. **PIX via Stripe**
   - Habilitar método de pagamento PIX
   - Confirmação assíncrona via webhook

2. **Parcelamento**
   - Usar `installments` do Stripe
   - Disponível para cartões BR

3. **Cupons de Desconto**
   - Criar collection `event_coupons`
   - Aplicar desconto antes de criar Checkout Session

4. **Relatórios Financeiros**
   - Dashboard de vendas por evento
   - Exportação de dados para contabilidade
   - Rastreamento de comissões pagas

5. **Apple Pay / Google Pay**
   - Habilitar via Stripe Checkout (zero configuração extra)

---

## 📚 Tecnologias e Pacotes Necessários

### Backend (Directus)

```json
{
  "stripe": "^14.0.0",
  "bull": "^4.12.0"
}
```

### Frontend (Next.js)

```json
{
  "@stripe/stripe-js": "^2.4.0",
  "stripe": "^14.0.0"
}
```

### Variáveis de Ambiente

```bash
# .env (Directus)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# .env (Next.js)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🎓 Recomendações Finais

1. **Comece com Stripe Test Mode** - valide todo o fluxo antes de produção
2. **Implemente webhooks PRIMEIRO** - são críticos para consistência de dados
3. **Use Stripe Connect Express** - onboarding mais simples para organizadores
4. **Monitore rate limits do Stripe** - implemente retry logic com exponential backoff
5. **Documentação para organizadores** - explique claramente o fluxo de onboarding e recebimentos

---

## 🚀 Próximos Passos

1. Criar conta Stripe (test mode)
2. Revisar e aprovar mudanças no schema
3. Iniciar Fase 1 do roadmap (Fundação)
4. Configurar ambiente de desenvolvimento com variáveis Stripe

---

## 📖 Recursos Úteis

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Directus Custom Endpoints](https://docs.directus.io/extensions/endpoints.html)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

---

## 📋 Status da Implementação

### ✅ Concluído
- **Fase 1: Fundação** - Completa (03/10/2025)
  - Schema Directus atualizado com campos Stripe
  - Collection `payment_transactions` criada
  - SDKs instalados (Next.js e Directus)
  - Variáveis de ambiente configuradas

- **Fase 2: Stripe Connect - Onboarding (Backend)** - Completa (03/10/2025)
  - Extensão Directus criada em `directus/extensions/endpoints/stripe/`
  - Endpoint `/stripe/connect-onboarding` funcionando
  - Webhook `/stripe/webhook` com handler `account.updated`
  - Arquivos de configuração Stripe no Next.js
  - Stripe Connect ativado e Client ID configurado
  - Documentação: `STRIPE_CONNECT_SETUP.md` e `STRIPE_STATUS_ATUAL.md`
  - ⚠️ Webhook não configurado (requer deploy ou Stripe CLI)

- **Fase 3: Checkout de Ingressos** - Completa (03/10/2025)
  - Componente `TicketSelection.tsx` com validação completa
  - Componente `EventCheckout.tsx` com formulário de participante
  - Hook `useCheckout.ts` para gerenciar checkout
  - API Route `/api/stripe/checkout-session` com split payment
  - Cálculo de preços e taxas (absorbed/passed_to_buyer)
  - Validação de estoque e limites de compra
  - Criação de `event_registration` com status pending
  - Páginas de sucesso e cancelamento
  - Documentação: `FASE3_CHECKOUT_IMPLEMENTACAO.md`
  - ⚠️ Webhooks pendentes - confirmação de pagamento será implementada na Fase 4

### 🚧 Em Andamento
- Nenhuma fase em andamento

### 📅 Próxima Fase
- **Fase 2: Interface UI** - Criar botão "Configurar Pagamentos" no painel do organizador
- **Fase 4: Webhooks e Confirmação** - Implementar handlers de webhook do Stripe

---

**Última atualização**: 2025-10-03 (Fases 1, 2 e 3 concluídas)
