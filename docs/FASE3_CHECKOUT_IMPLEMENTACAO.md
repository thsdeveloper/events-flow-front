# Fase 3: Checkout de Ingressos - Implementação Completa

## 📦 Arquivos Criados

### Componentes React
1. **`nextjs/src/components/events/TicketSelection.tsx`**
   - Componente de seleção de ingressos
   - Controle de quantidade com validação de estoque
   - Cálculo em tempo real de valores e taxas
   - Resumo do pedido

2. **`nextjs/src/components/events/EventCheckout.tsx`**
   - Componente completo de checkout
   - Formulário de dados do participante
   - Integração com TicketSelection
   - Fluxo em etapas (seleção → dados → pagamento)

### Hooks
3. **`nextjs/src/hooks/useCheckout.ts`**
   - Hook personalizado para gerenciar checkout
   - Integração com API de checkout
   - Controle de loading e erros
   - Redirecionamento automático para Stripe

### API Routes
4. **`nextjs/src/app/api/stripe/checkout-session/route.ts`**
   - Endpoint para criar sessão de checkout Stripe
   - Validação de estoque em tempo real
   - Cálculo de split payment (plataforma + organizador)
   - Criação de registration com status "pending"
   - Integração com Stripe Connect

### Páginas
5. **`nextjs/src/app/(public)/eventos/[slug]/checkout/success/page.tsx`**
   - Página de confirmação de pagamento
   - Instruções pós-compra
   - Links para área de ingressos

6. **`nextjs/src/app/(public)/eventos/[slug]/checkout/cancel/page.tsx`**
   - Página de cancelamento
   - Orientações para tentar novamente
   - Suporte ao usuário

---

## 🎯 Funcionalidades Implementadas

### ✅ Seleção de Ingressos
- [x] Exibição de tipos de ingressos disponíveis
- [x] Controle de quantidade (botões + input direto)
- [x] Validação de estoque em tempo real
- [x] Respeito a limites min/max por compra
- [x] Filtro de ingressos por status e período de venda
- [x] Cálculo automático de taxas (absorbed vs passed_to_buyer)
- [x] Resumo do pedido com valores totais

### ✅ Formulário de Participante
- [x] Captura de dados: nome, email, telefone, CPF
- [x] Validação de campos obrigatórios
- [x] Integração com usuário autenticado (opcional)

### ✅ API de Checkout
- [x] Validação completa de dados recebidos
- [x] Verificação de configuração Stripe do organizador
- [x] Validação de estoque disponível
- [x] Cálculo de valores e taxas de serviço
- [x] Criação de registration com status "pending"
- [x] Criação de Checkout Session do Stripe
- [x] Configuração de Split Payment (application_fee)
- [x] Metadata completa para rastreamento

### ✅ Páginas de Retorno
- [x] Página de sucesso com instruções
- [x] Página de cancelamento com opções
- [x] Links para navegação pós-checkout

---

## 🔧 Como Usar

### 1. Integrar em uma Página de Evento

```tsx
import EventCheckout from '@/components/events/EventCheckout';

export default async function EventoPage({ params }: { params: { slug: string } }) {
  // Buscar dados do evento no Directus
  const event = await fetchEventBySlug(params.slug);
  const config = await fetchEventConfigurations();

  return (
    <EventCheckout
      eventId={event.id}
      eventTitle={event.title}
      tickets={event.tickets}
      serviceFeePercentage={config.service_fee_percentage}
      userId={session?.user?.id} // Opcional
    />
  );
}
```

### 2. Usar Apenas o TicketSelection

```tsx
'use client';
import TicketSelection from '@/components/events/TicketSelection';
import { useCheckout } from '@/hooks/useCheckout';

export default function CustomCheckout({ eventId, tickets, serviceFee }) {
  const { createCheckoutSession, isLoading } = useCheckout({ eventId });

  const handleCheckout = async (selectedTickets) => {
    const participantInfo = {
      name: 'João Silva',
      email: 'joao@example.com',
    };

    await createCheckoutSession(selectedTickets, participantInfo);
  };

  return (
    <TicketSelection
      eventId={eventId}
      tickets={tickets}
      serviceFeePercentage={serviceFee}
      onCheckout={handleCheckout}
      isLoading={isLoading}
    />
  );
}
```

### 3. Chamada Direta à API

```typescript
const response = await fetch('/api/stripe/checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventId: 'uuid-do-evento',
    tickets: [
      { ticketId: 'uuid-ingresso-1', quantity: 2 },
      { ticketId: 'uuid-ingresso-2', quantity: 1 },
    ],
    participantInfo: {
      name: 'Maria Santos',
      email: 'maria@example.com',
      phone: '11999999999',
      document: '12345678900',
    },
    userId: 'uuid-usuario', // Opcional
  }),
});

const { url } = await response.json();
window.location.href = url; // Redirecionar para Stripe
```

---

## 💰 Fluxo de Cálculo de Valores

### Cenário 1: Taxa Absorvida pelo Organizador

```
Ingresso: R$ 100,00
Taxa de serviço: 10%
Tipo: absorbed

→ Comprador paga: R$ 100,00
→ Organizador recebe: R$ 90,00
→ Plataforma recebe: R$ 10,00
```

### Cenário 2: Taxa Repassada ao Comprador

```
Ingresso: R$ 100,00
Taxa de serviço: 10%
Tipo: passed_to_buyer

→ Comprador paga: R$ 110,00
→ Organizador recebe: R$ 100,00
→ Plataforma recebe: R$ 10,00
```

### Implementação no Código

```typescript
// Em /api/stripe/checkout-session/route.ts

const ticketPrice = 100;
const serviceFeePercentage = 10;

if (ticket.service_fee_type === 'passed_to_buyer') {
  const serviceFee = (ticketPrice * serviceFeePercentage) / 100; // R$ 10
  const buyerPrice = ticketPrice + serviceFee; // R$ 110
  const platformFee = serviceFee; // R$ 10
} else { // absorbed
  const buyerPrice = ticketPrice; // R$ 100
  const platformFee = (ticketPrice * serviceFeePercentage) / 100; // R$ 10
}

// No Stripe Checkout Session
stripe.checkout.sessions.create({
  payment_intent_data: {
    application_fee_amount: formatAmountForStripe(platformFee), // Em centavos
    transfer_data: {
      destination: organizer.stripe_account_id,
    },
  },
  // ...
});
```

---

## 🔐 Validações Implementadas

### 1. Validação de Estoque

```typescript
const available = ticket.quantity - ticket.quantity_sold;

if (selectedQuantity > available) {
  throw new Error(`Quantidade não disponível`);
}
```

### 2. Validação de Limites de Compra

```typescript
if (ticket.max_quantity_per_purchase && quantity > ticket.max_quantity_per_purchase) {
  throw new Error(`Máximo ${ticket.max_quantity_per_purchase} por compra`);
}
```

### 3. Validação de Período de Vendas

```typescript
const now = new Date();

if (ticket.sale_start_date && new Date(ticket.sale_start_date) > now) {
  return false; // Venda ainda não começou
}

if (ticket.sale_end_date && new Date(ticket.sale_end_date) < now) {
  return false; // Venda já encerrou
}
```

### 4. Validação de Stripe Connect

```typescript
if (!organizer.stripe_account_id ||
    !organizer.stripe_charges_enabled ||
    !organizer.stripe_onboarding_complete) {
  throw new Error('Organizador não habilitado para pagamentos');
}
```

---

## 🚀 Próximos Passos

### Fase 4: Webhooks e Confirmação (Pendente)

Para completar o fluxo de pagamento, ainda é necessário:

1. **Implementar handlers de webhook**:
   - `payment_intent.succeeded` → Confirmar pagamento e atualizar registration
   - `payment_intent.payment_failed` → Tratar falha
   - `checkout.session.completed` → Log de sessão concluída

2. **Atualizar registration após pagamento**:
   - Mudar `payment_status` de "pending" para "paid"
   - Gerar `ticket_code` único
   - Decrementar `quantity_sold` dos tickets
   - Enviar email de confirmação

3. **Sistema de emails**:
   - Email de confirmação com ingressos
   - Email de lembrete pré-evento
   - QR code para check-in

---

## 🧪 Como Testar

### 1. Preparação

```bash
# Garantir que Directus está rodando
cd directus
docker compose up -d

# Garantir que Next.js está rodando
cd nextjs
pnpm dev

# Stripe CLI para webhooks locais
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

### 2. Teste Manual

1. Criar um evento com ingressos no Directus
2. Garantir que o organizador tem Stripe Connect configurado
3. Acessar a página do evento no frontend
4. Selecionar ingressos e preencher formulário
5. Usar cartão de teste do Stripe:
   - **Sucesso**: `4242 4242 4242 4242`
   - **Falha**: `4000 0000 0000 0002`
6. Verificar redirecionamento e páginas de retorno

### 3. Verificar no Stripe Dashboard

- Acessar [dashboard.stripe.com](https://dashboard.stripe.com)
- Ir em "Payments" → Verificar payment intent criado
- Ir em "Connect" → Verificar transfer para organizador
- Verificar application_fee cobrado

---

## 📊 Diagrama de Fluxo

```
┌─────────────┐
│   Usuário   │
└──────┬──────┘
       │
       │ 1. Seleciona ingressos
       ▼
┌─────────────────────────┐
│  TicketSelection.tsx    │
│  - Valida disponibilidade│
│  - Calcula valores      │
└──────┬──────────────────┘
       │
       │ 2. Preenche dados
       ▼
┌─────────────────────────┐
│  EventCheckout.tsx      │
│  - Captura participante │
└──────┬──────────────────┘
       │
       │ 3. POST /api/stripe/checkout-session
       ▼
┌─────────────────────────┐
│  API Route              │
│  - Valida estoque       │
│  - Cria registration    │
│  - Cria Stripe Session  │
└──────┬──────────────────┘
       │
       │ 4. Redireciona para Stripe
       ▼
┌─────────────────────────┐
│  Stripe Checkout        │
│  - Processa pagamento   │
└──────┬──────────────────┘
       │
       ├─ Sucesso → /checkout/success
       │
       └─ Cancelado → /checkout/cancel
```

---

## 📝 Notas Importantes

1. **CORS**: Garantir que `NEXT_PUBLIC_SITE_URL` está configurado corretamente
2. **Webhooks**: Ainda não implementados - pagamentos ficam em "pending"
3. **Emails**: Sistema de notificações será implementado na Fase 4
4. **Estoque**: Decremento de `quantity_sold` será feito via webhook
5. **Teste**: Sempre usar cartões de teste do Stripe em desenvolvimento

---

## ✅ Status da Fase 3

- [x] Componente TicketSelection
- [x] Componente EventCheckout
- [x] Hook useCheckout
- [x] API Route checkout-session
- [x] Validação de estoque e limites
- [x] Cálculo de valores e split payment
- [x] Criação de registration
- [x] Integração com Stripe Checkout
- [x] Páginas de sucesso e cancelamento
- [x] Documentação de uso

**Status**: ✅ **Fase 3 Completa** - Pronta para testes
**Próximo passo**: Implementar Fase 4 (Webhooks e Confirmação)

---

**Última atualização**: 2025-10-03
**Desenvolvido por**: Claude Code
