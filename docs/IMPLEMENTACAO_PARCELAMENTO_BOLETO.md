# Implementação de Parcelamento para Venda de Ingressos

## Análise da Arquitetura Atual

### Collections Existentes

#### 1. **events** (Eventos)
- Gerencia eventos com informações básicas, datas, localização
- Relacionamento com `organizers` (M2O) e `event_tickets` (O2M)
- Suporte para eventos gratuitos, presenciais, online e híbridos

#### 2. **event_tickets** (Tipos de Ingressos)
- Múltiplos tipos de ingresso por evento
- Configuração de preço base (`price`) e preço final ao comprador (`buyer_price`)
- Controle de quantidade, período de venda e visibilidade
- Campo `service_fee_type`: quem paga a taxa (organizador ou comprador)

#### 3. **event_registrations** (Compras/Inscrições)
- Registro de compras com dados do participante
- Campos de pagamento: `payment_status`, `payment_amount`, `payment_method`
- Integração Stripe: `stripe_payment_intent_id`, `stripe_checkout_session_id`
- Métodos suportados: `card`, `pix`, `boleto`, `free`

#### 4. **payment_transactions** (Auditoria)
- Log de todos os eventos de webhook do Stripe
- Rastreamento de status: `succeeded`, `failed`, `pending`, `refunded`

#### 5. **event_configurations** (Configurações Globais)
- Taxas da plataforma e Stripe configuráveis
- Método de cálculo: `buyer_pays` ou `organizer_absorbs`

### Integração Stripe Atual

**Arquitetura Implementada:**
- Stripe Connect para repasse aos organizadores
- Webhook handler em `nextjs/src/app/api/stripe/webhook/route.ts`
- Payment Intents e Checkout Sessions
- Suporte a PIX e boleto (pagamento único)

---

## Limitações do Stripe para Boleto Parcelado

### Contexto Técnico

**O Stripe no Brasil NÃO suporta parcelamento em boleto bancário.**

**Métodos de parcelamento disponíveis no Stripe:**
1. **Cartão de Crédito** - parcelamento nativo com taxas
2. **Carnê/Boletos Múltiplos** - emissão de vários boletos com vencimentos distintos

**Boleto bancário no Stripe:**
- Sempre pagamento à vista
- Vencimento único configurável
- Confirmação em 1-3 dias úteis

---

## Soluções Propostas

### Opção 1: Parcelamento com Cartão de Crédito (Recomendado)

**Vantagens:**
- ✅ Nativo do Stripe
- ✅ Confirmação instantânea
- ✅ Menor complexidade técnica
- ✅ Experiência de usuário superior

**Implementação:**

```typescript
// nextjs/src/lib/stripe/checkout.ts

export async function createCheckoutSession({
  ticketTypeId,
  quantity,
  eventId,
  organizerStripeAccountId,
}: {
  ticketTypeId: string;
  quantity: number;
  eventId: string;
  organizerStripeAccountId: string;
}) {
  const ticketType = await fetchTicketType(ticketTypeId);
  const totalAmount = ticketType.buyer_price * quantity;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'], // Habilitar cartão
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: ticketType.title,
          },
          unit_amount: Math.round(ticketType.buyer_price * 100), // centavos
        },
        quantity,
      },
    ],
    payment_intent_data: {
      application_fee_amount: calculatePlatformFee(totalAmount),
      transfer_data: {
        destination: organizerStripeAccountId, // Stripe Connect
      },
      // PARCELAMENTO
      setup_future_usage: 'off_session', // opcional para pagamentos futuros
    },
    // Configurar parcelamento
    payment_method_options: {
      card: {
        installments: {
          enabled: true,
          plan: {
            count: 12, // até 12 parcelas
            interval: 'month',
            type: 'fixed_count',
          },
        },
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/${eventId}`,
    metadata: {
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      quantity: quantity.toString(),
    },
  }, {
    stripeAccount: organizerStripeAccountId, // Conectar à conta do organizador
  });

  return session;
}
```

**Taxas do Stripe (Cartão Parcelado - Brasil):**
- 1x: 4,35% + R$ 0,50
- 2-6x: 5,64% + R$ 0,50
- 7-12x: 6,69% + R$ 0,50

**Mudanças necessárias:**

1. **Atualizar `event_configurations`:**
```sql
ALTER TABLE event_configurations
ADD COLUMN max_installments INTEGER DEFAULT 12;
ADD COLUMN enable_installments BOOLEAN DEFAULT true;
```

2. **Atualizar `event_registrations`:**
```sql
ALTER TABLE event_registrations
ADD COLUMN installments INTEGER DEFAULT 1;
ADD COLUMN installment_fee DECIMAL(10,2);
```

3. **Criar campo no Directus:**
```bash
cd nextjs
pnpm mcp-directus fields create event_configurations installments_enabled
pnpm mcp-directus fields create event_configurations max_installments
```

---

### Opção 2: Carnê de Boletos (Múltiplos Boletos)

**Vantagens:**
- ✅ Aceita clientes sem cartão de crédito
- ✅ Parcelamento "real" em boleto

**Desvantagens:**
- ❌ Alta complexidade de implementação
- ❌ Risco de inadimplência maior
- ❌ Cada boleto tem taxa Stripe (~R$ 3,70)
- ❌ Gestão de cobrança manual

**Arquitetura:**

```typescript
// nextjs/src/lib/stripe/installments.ts

interface InstallmentPlan {
  ticketTypeId: string;
  quantity: number;
  totalAmount: number;
  installments: number;
  buyerEmail: string;
}

export async function createBoletoInstallmentPlan(plan: InstallmentPlan) {
  const installmentAmount = plan.totalAmount / plan.installments;
  const paymentIntents: string[] = [];

  for (let i = 0; i < plan.installments; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i + 1); // vencimento mensal

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(installmentAmount * 100), // centavos
      currency: 'brl',
      payment_method_types: ['boleto'],
      payment_method_options: {
        boleto: {
          expires_after_days: 3, // validade do boleto
        },
      },
      metadata: {
        installment_number: i + 1,
        installment_total: plan.installments,
        ticket_type_id: plan.ticketTypeId,
        parent_registration_id: 'xxx', // ID da compra principal
      },
    });

    paymentIntents.push(paymentIntent.id);
  }

  return paymentIntents;
}
```

**Mudanças no schema:**

1. **Nova collection `installment_payments`:**
```json
{
  "collection": "installment_payments",
  "fields": [
    {
      "field": "id",
      "type": "uuid",
      "schema": { "is_primary_key": true }
    },
    {
      "field": "registration_id",
      "type": "uuid",
      "schema": {
        "foreign_key_table": "event_registrations",
        "foreign_key_column": "id"
      }
    },
    {
      "field": "installment_number",
      "type": "integer"
    },
    {
      "field": "total_installments",
      "type": "integer"
    },
    {
      "field": "amount",
      "type": "decimal"
    },
    {
      "field": "due_date",
      "type": "date"
    },
    {
      "field": "payment_status",
      "type": "string",
      "meta": {
        "interface": "select-dropdown",
        "options": {
          "choices": ["pending", "paid", "overdue", "cancelled"]
        }
      }
    },
    {
      "field": "stripe_payment_intent_id",
      "type": "string"
    },
    {
      "field": "boleto_url",
      "type": "string"
    },
    {
      "field": "boleto_barcode",
      "type": "string"
    }
  ]
}
```

2. **Webhook handler atualizado:**
```typescript
// nextjs/src/lib/stripe/webhooks.ts

export async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  if (paymentIntent.metadata.installment_number) {
    // É uma parcela de carnê
    await updateInstallmentStatus(
      paymentIntent.metadata.parent_registration_id,
      parseInt(paymentIntent.metadata.installment_number),
      'paid'
    );

    // Verificar se todas as parcelas foram pagas
    const allPaid = await checkAllInstallmentsPaid(
      paymentIntent.metadata.parent_registration_id
    );

    if (allPaid) {
      // Atualizar status da inscrição principal
      await updateRegistrationStatus(
        paymentIntent.metadata.parent_registration_id,
        'confirmed'
      );
    }
  } else {
    // Lógica existente para pagamento único
  }
}
```

---

### Opção 3: Híbrida (Cartão Parcelado + Boleto à Vista)

**Estratégia recomendada para maior conversão:**

1. **Oferecer ambas as opções no checkout:**
   - Cartão: parcelamento em até 12x
   - Boleto: apenas à vista com desconto (ex: 5% off)

2. **Interface de seleção:**
```tsx
// nextjs/src/components/checkout/PaymentMethodSelector.tsx

export function PaymentMethodSelector() {
  const [method, setMethod] = useState<'card' | 'boleto'>('card');
  const [installments, setInstallments] = useState(1);

  return (
    <div>
      <RadioGroup value={method} onValueChange={setMethod}>
        <RadioGroupItem value="card">
          <div>
            <h3>Cartão de Crédito</h3>
            <p>Parcele em até 12x sem juros</p>
          </div>
        </RadioGroupItem>

        <RadioGroupItem value="boleto">
          <div>
            <h3>Boleto Bancário</h3>
            <p>À vista com 5% de desconto</p>
            <span className="text-xs text-muted-foreground">
              Compensação em até 3 dias úteis
            </span>
          </div>
        </RadioGroupItem>
      </RadioGroup>

      {method === 'card' && (
        <Select value={installments} onValueChange={setInstallments}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <SelectItem key={num} value={num}>
                {num}x de R$ {(totalAmount / num).toFixed(2)}
                {num > 1 && ` (taxa adicional ${getFee(num)}%)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
```

---

## Plano de Implementação Recomendado

### Fase 1: Parcelamento com Cartão (Sprint 1-2)

**Tasks:**

1. ✅ Atualizar schema do Directus
   - Adicionar campos de parcelamento em `event_configurations`
   - Adicionar `installments` em `event_registrations`

2. ✅ Implementar cálculo de taxas de parcelamento
   - Criar função `calculateInstallmentFee(amount, installments)`
   - Atualizar `calculateServiceFee()` para considerar parcelas

3. ✅ Atualizar Stripe Checkout
   - Habilitar `payment_method_options.card.installments`
   - Configurar número máximo de parcelas

4. ✅ Atualizar webhook handler
   - Capturar número de parcelas do Payment Intent
   - Salvar em `event_registrations.installments`

5. ✅ UI/UX no frontend
   - Componente de seleção de parcelas
   - Exibir valor de cada parcela
   - Mostrar taxa adicional (se houver)

**Código exemplo:**

```typescript
// nextjs/src/lib/stripe/fees.ts

export function getStripeFeeByInstallments(installments: number): number {
  if (installments === 1) return 4.35;
  if (installments >= 2 && installments <= 6) return 5.64;
  if (installments >= 7 && installments <= 12) return 6.69;
  return 4.35; // fallback
}

export function calculateTotalWithInstallments(
  baseAmount: number,
  installments: number,
  serviceFeeType: 'absorbed' | 'passed_to_buyer'
): {
  installmentValue: number;
  totalAmount: number;
  stripeFee: number;
} {
  const stripeFeePercentage = getStripeFeeByInstallments(installments);
  const stripeFee = (baseAmount * stripeFeePercentage / 100) + 0.50;

  const totalAmount = serviceFeeType === 'passed_to_buyer'
    ? baseAmount + stripeFee
    : baseAmount;

  return {
    installmentValue: totalAmount / installments,
    totalAmount,
    stripeFee,
  };
}
```

### Fase 2: Boleto à Vista com Desconto (Sprint 3)

**Tasks:**

1. ✅ Adicionar campo `boleto_discount_percentage` em `event_configurations`
2. ✅ Implementar lógica de desconto no checkout
3. ✅ Atualizar UI para mostrar desconto
4. ✅ Webhook handler para confirmação de boleto

### Fase 3: (Opcional) Carnê de Boletos (Sprint 4-6)

⚠️ **Só implementar se houver demanda real dos organizadores**

**Tasks:**

1. Criar collection `installment_payments`
2. Implementar geração de múltiplos Payment Intents
3. Sistema de notificação de vencimento
4. Dashboard de gestão de parcelas
5. Relatório de inadimplência

---

## Configuração e Deploy

### 1. Variáveis de Ambiente

```bash
# nextjs/.env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Configurações de parcelamento
MAX_INSTALLMENTS=12
ENABLE_INSTALLMENTS=true
BOLETO_DISCOUNT_PERCENTAGE=5
```

### 2. Configuração no Stripe Dashboard

1. Acessar [Stripe Dashboard](https://dashboard.stripe.com)
2. **Settings → Payment methods**
3. Habilitar:
   - ✅ Cards (com parcelamento)
   - ✅ Boleto (pagamento à vista)
4. **Settings → Installments**
   - Ativar parcelamento para Brasil
   - Definir taxas (usar padrão Stripe ou customizar)

### 3. Teste Local

```bash
# Terminal 1: Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 2: Next.js
cd nextjs
pnpm dev

# Usar cartão de teste
# Número: 4000 0000 0000 0077 (parcela com sucesso)
# CVC: qualquer 3 dígitos
# Data: qualquer data futura
```

### 4. Testes de Boleto

```bash
# Boleto de teste - confirma automaticamente após 3 segundos
# Usar evento simulado no Stripe CLI:
stripe trigger payment_intent.succeeded \
  --add payment_intent:payment_method_types=boleto
```

---

## Métricas e Monitoramento

### Dashboards Recomendados

1. **Conversão por Método de Pagamento**
   - Taxa de conversão cartão vs boleto
   - Parcelas mais escolhidas (1x, 3x, 6x, 12x)

2. **Receita e Taxas**
   - Total de taxas Stripe
   - Repasse líquido aos organizadores
   - Receita da plataforma

3. **Inadimplência (se carnê for implementado)**
   - Taxa de inadimplência por parcela
   - Valor em atraso
   - Notificações enviadas

### Queries Úteis

```sql
-- Taxa de conversão por método de pagamento
SELECT
  payment_method,
  COUNT(*) as total_purchases,
  AVG(installments) as avg_installments,
  SUM(total_amount) as revenue
FROM event_registrations
WHERE payment_status = 'paid'
GROUP BY payment_method;

-- Parcelas mais populares
SELECT
  installments,
  COUNT(*) as count,
  AVG(total_amount) as avg_ticket_value
FROM event_registrations
WHERE payment_method = 'card'
GROUP BY installments
ORDER BY count DESC;
```

---

## Considerações de UX

### Boas Práticas

1. **Transparência nas Taxas**
   - Sempre mostrar o valor final antes do checkout
   - Explicar quem paga a taxa (organizador ou comprador)

2. **Simulador de Parcelas**
   - Mostrar valor de cada parcela em tempo real
   - Destacar parcelas sem juros vs com juros

3. **Informações de Boleto**
   - Explicar tempo de compensação (1-3 dias)
   - Mostrar desconto à vista (se aplicável)
   - Link para visualizar boleto após checkout

4. **Confirmação de Compra**
   - Email com detalhes do pagamento
   - Link para boleto (se boleto)
   - Detalhamento das parcelas (se cartão)

---

## Referências

- [Stripe Installments Docs](https://stripe.com/docs/payments/installments)
- [Stripe Boleto Guide](https://stripe.com/docs/payments/boleto)
- [Stripe Connect Brazil](https://stripe.com/docs/connect/country-guide/brazil)
- [Stripe Webhook Events](https://stripe.com/docs/api/events/types)

---

## Resumo Executivo

**Recomendação:** Implementar **Opção 3 - Híbrida** em 2 fases:

1. **Fase 1 (Prioritária):** Parcelamento com cartão de crédito
   - ROI alto, complexidade baixa
   - Confirmação instantânea
   - Experiência de usuário superior

2. **Fase 2 (Complementar):** Boleto à vista com desconto
   - Atende público sem cartão
   - Incentiva pagamento à vista
   - Menor risco de inadimplência

3. **Fase 3 (Opcional):** Carnê de boletos
   - Avaliar demanda após Fase 1 e 2
   - Alto custo de desenvolvimento e manutenção
   - Risco de inadimplência significativo

**Estimativa de Esforço:**
- Fase 1: 3-5 dias de desenvolvimento
- Fase 2: 2-3 dias de desenvolvimento
- Fase 3: 10-15 dias de desenvolvimento

**Impacto Esperado:**
- ↑ 30-40% na taxa de conversão (parcelamento)
- ↑ 15-20% no ticket médio
- ↓ 50% em abandono de carrinho
