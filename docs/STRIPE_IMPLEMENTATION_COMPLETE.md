# 🎉 Implementação Stripe Connect - Concluída

## Resumo da Arquitetura

Todo o processamento de pagamentos e envio de emails foi **centralizado no Directus** para maior controle e manutenibilidade.

### Fluxo Completo

```
1. Usuário compra ingresso no Next.js
   ↓
2. Next.js cria checkout session no Stripe
   ↓
3. Stripe processa pagamento
   ↓
4. Stripe envia webhook para Directus
   ↓
5. Directus processa webhook:
   - Atualiza registrations
   - Gera código do ingresso
   - Incrementa quantity_sold
   - Envia email de confirmação
   ↓
6. Usuário recebe email com ingresso
```

## Componentes Implementados

### 1. Directus

**Endpoint Stripe** (`/stripe/webhook`)
- Localização: `directus/extensions/directus-endpoint-stripe/src/index.ts`
- Funcionalidades:
  - ✅ Validação de assinatura do webhook
  - ✅ Processamento de `payment_intent.succeeded`
  - ✅ Processamento de `payment_intent.payment_failed`
  - ✅ Processamento de `account.updated`
  - ✅ Geração de códigos únicos de ingresso
  - ✅ Envio de emails com templates
  - ✅ Logs de transações

**Template de Email**
- Localização: `directus/templates/ticket-confirmation.liquid`
- Recursos:
  - Design responsivo
  - Gradiente roxo
  - Detalhes do evento e ingresso
  - Código do ingresso destacado
  - Link de verificação
  - Instruções de check-in

**Configuração SMTP**
- Arquivo: `directus/.env`
- Variáveis necessárias:
  ```env
  EMAIL_FROM=seu-email@gmail.com
  EMAIL_TRANSPORT=smtp
  EMAIL_SMTP_HOST=smtp.gmail.com
  EMAIL_SMTP_PORT=587
  EMAIL_SMTP_USER=seu-email@gmail.com
  EMAIL_SMTP_PASSWORD=sua-senha-de-app
  EMAIL_SMTP_SECURE=false
  ```

### 2. Next.js

**API de Checkout** (`/api/stripe/checkout-session/route.ts`)
- Cria Stripe Checkout Sessions
- Calcula taxas de serviço
- Valida estoque de ingressos
- Cria registrations no Directus
- Configura split payment com application fees

**Página de Ingressos** (`/meus-ingressos`)
- Lista ingressos comprados
- Visualização de código
- Impressão de ingresso
- Interface responsiva

**Componentes de Checkout**
- `TicketSelection.tsx` - Seleção de ingressos
- `EventCheckout.tsx` - Formulário de checkout
- `MyTickets.tsx` - Visualização de ingressos

## Configuração de Desenvolvimento

### 1. Stripe CLI

Configure o webhook para apontar ao Directus:

```bash
stripe listen --forward-to localhost:8055/stripe/webhook
```

Copie o webhook secret gerado e adicione ao `directus/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Configuração SMTP

**Opção A: Gmail**
1. Habilite 2FA na sua conta Google
2. Crie uma App Password em https://myaccount.google.com/apppasswords
3. Use as credenciais no `.env`

**Opção B: Mailtrap (Testes)**
1. Crie uma conta em https://mailtrap.io
2. Copie as credenciais SMTP
3. Configure no `.env`

### 3. Reiniciar Serviços

```bash
# Reiniciar Directus após configurações
cd directus
docker compose restart directus

# Ver logs
docker compose logs -f directus
```

## Testando o Fluxo Completo

### 1. Fazer uma Compra

1. Acesse `http://localhost:3000/eventos/[seu-evento]/checkout`
2. Selecione ingressos
3. Preencha dados do participante
4. Complete o checkout no Stripe

### 2. Verificar Processamento

**Logs do Directus:**
```bash
docker compose logs -f directus
```

Você deve ver:
```
✅ Payment Intent succeeded: pi_xxx
📋 Processing 1 registration(s)...
✅ Registration xxx confirmed with code: TKT-XXX-XXX
✅ Ticket "Ingresso VIP" quantity_sold: 0 → 1
📧 Confirmation email sent to user@example.com
✅ Payment processing completed
```

**Email Enviado:**
- Verifique a caixa de entrada do participante
- Email contém:
  - Detalhes do evento
  - Código do ingresso
  - Link de verificação
  - Instruções

**Directus:**
- Acesse `http://localhost:8055/admin/content/event_registrations`
- Verifique que a registration está:
  - `payment_status`: `paid`
  - `status`: `confirmed`
  - `ticket_code`: Preenchido
  - `stripe_payment_intent_id`: Preenchido

### 3. Ver Ingresso

1. Acesse `http://localhost:3000/meus-ingressos` (como usuário autenticado)
2. Clique em "Ver Ingresso"
3. Veja o código do ingresso
4. Clique em "Imprimir Ingresso"

## Estrutura de Dados

### event_registrations

```typescript
{
  id: string;
  event_id: string;
  ticket_type_id: string;
  participant_name: string;
  participant_email: string;
  participant_phone?: string;
  participant_document?: string;
  user_id?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in';
  payment_amount: number;
  quantity: number;
  unit_price: number;
  service_fee: number;
  total_amount: number;
  payment_method: 'card' | 'pix' | 'boleto';
  ticket_code?: string;
  stripe_checkout_session_id?: string;
  stripe_payment_intent_id?: string;
}
```

### payment_transactions

```typescript
{
  id: string;
  stripe_event_id: string;
  stripe_object_id: string;
  event_type: string;
  status: string;
  metadata: object;
  date_created: Date;
}
```

## Variáveis de Ambiente

### Next.js (`.env`)

```env
# Directus
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055
DIRECTUS_PUBLIC_TOKEN=your-public-token
DIRECTUS_FORM_TOKEN=your-form-token
DIRECTUS_ADMIN_TOKEN=your-admin-token

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Directus (`.env`)

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
EMAIL_FROM=noreply@yourdomain.com
EMAIL_TRANSPORT=smtp
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
EMAIL_SMTP_SECURE=false

# Public URL
PUBLIC_URL=http://localhost:8055
```

## Produção

### 1. Stripe

**No Dashboard do Stripe:**
1. Vá em Developers → Webhooks
2. Adicione endpoint: `https://seu-directus.com/stripe/webhook`
3. Selecione eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `charge.refunded`
4. Copie o webhook secret
5. Adicione ao `.env` do Directus

### 2. Email

**Configure email de produção:**
- Use um serviço profissional (SendGrid, Mailgun, AWS SES)
- Configure domínio verificado
- Atualize `EMAIL_FROM` com email do seu domínio

### 3. Variáveis

Atualize todas as URLs:
- `PUBLIC_URL` → URL do Directus em produção
- `NEXT_PUBLIC_SITE_URL` → URL do Next.js em produção
- `NEXT_PUBLIC_DIRECTUS_URL` → URL do Directus em produção

## Próximos Passos Opcionais

### Fase 6: Verificação de Ingressos

- [ ] Criar página `/verify-ticket/[eventId]/[ticketCode]`
- [ ] Implementar lógica de check-in
- [ ] Adicionar campo `checked_in_at` em `event_registrations`
- [ ] Criar interface para organizadores validarem ingressos

### Fase 7: Reembolsos

- [ ] Implementar webhook `charge.refunded`
- [ ] Criar lógica de devolução de estoque
- [ ] Atualizar status da registration
- [ ] Enviar email de confirmação de reembolso

### Fase 8: QR Codes

- [ ] Adicionar geração de QR code no Directus
- [ ] Usar biblioteca Node.js (qrcode)
- [ ] Incluir QR code como anexo no email
- [ ] Atualizar template para mostrar QR code

## Problemas Comuns

### Email não está sendo enviado

1. **Verifique configurações SMTP:**
   ```bash
   docker compose logs directus | grep -i email
   ```

2. **Teste SMTP manualmente:**
   - Use ferramenta como https://www.smtper.net
   - Teste com as mesmas credenciais

3. **Gmail bloqueando:**
   - Certifique-se que 2FA está ativo
   - Use App Password, não senha normal
   - Verifique se "Acesso a apps menos seguros" está permitido

### Webhook não está sendo recebido

1. **Verifique Stripe CLI:**
   ```bash
   stripe listen --forward-to localhost:8055/stripe/webhook
   ```

2. **Verifique logs do Directus:**
   ```bash
   docker compose logs -f directus
   ```

3. **Teste manualmente:**
   ```bash
   stripe trigger payment_intent.succeeded
   ```

### Registration não atualiza após pagamento

1. **Verifique metadata no Stripe:**
   - Checkout session deve ter `metadata.registration_ids`
   - Payment intent deve herdar metadata

2. **Verifique logs:**
   ```bash
   docker compose logs directus | grep -i registration
   ```

## Segurança

### Validação de Webhooks

- ✅ Assinatura do webhook é validada
- ✅ Usa `req.rawBody` para verificação
- ✅ Eventos duplicados são ignorados (idempotência)

### Dados Sensíveis

- ⚠️ Nunca commite `.env` com dados reais
- ⚠️ Use secrets management em produção
- ⚠️ Rotate tokens periodicamente

### Permissões

- Endpoint usa `accountability: null` (sistema)
- MailService tem acesso completo
- Tokens do Directus têm scopes limitados

## Suporte

- Documentação Stripe: https://stripe.com/docs
- Documentação Directus: https://docs.directus.io
- Stripe CLI: https://stripe.com/docs/stripe-cli

---

**Implementado em:** Outubro 2025
**Versão:** 1.0.0
**Status:** ✅ Produção
