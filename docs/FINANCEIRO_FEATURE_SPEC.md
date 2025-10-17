# Especificação de Feature: Módulo Financeiro para Organizadores

## 📋 Resumo Executivo

Implementação de um módulo financeiro completo na área administrativa que permite aos organizadores de eventos visualizarem e gerenciarem todas as informações financeiras relacionadas às suas vendas através do Stripe Connect.

---

## 🎯 Objetivos

1. **Visibilidade Financeira**: Fornecer uma visão completa das transações, saldo e repasses
2. **Transparência**: Mostrar detalhes de cada transação, taxas de serviço e valores líquidos
3. **Gestão**: Permitir filtros, busca e exportação de dados financeiros
4. **Dashboard**: Apresentar métricas consolidadas e KPIs financeiros

---

## 📊 Análise da Estrutura Atual

### Collections do Directus Relevantes

#### 1. **organizers**
- `stripe_account_id` - ID da conta Stripe Connect
- `stripe_onboarding_complete` - Status do onboarding
- `stripe_charges_enabled` - Habilitado para receber pagamentos
- `stripe_payouts_enabled` - Habilitado para transferências

#### 2. **payment_transactions** (Auditoria)
- `stripe_event_id` - ID do evento webhook
- `stripe_object_id` - ID do objeto Stripe (payment_intent, refund, etc)
- `event_type` - Tipo do evento (payment_intent.succeeded, charge.refunded, etc)
- `amount` - Valor em reais
- `status` - succeeded, failed, pending, refunded
- `metadata` - JSON completo do webhook
- `registration_id` - Inscrição relacionada
- `date_created` - Data da transação

#### 3. **event_registrations**
- `stripe_payment_intent_id` - ID do Payment Intent
- `payment_amount` - Valor pago
- `payment_status` - free, paid, pending, refunded
- `service_fee` - Taxa de serviço aplicada
- `total_amount` - Valor total
- `unit_price` - Preço unitário
- `quantity` - Quantidade de ingressos
- `event_id` - Evento relacionado
- `ticket_type_id` - Tipo de ingresso

#### 4. **events**
- `organizer_id` - Organizador do evento
- `title` - Título do evento
- `is_free` - Evento gratuito?

#### 5. **event_tickets**
- `price` - Valor a receber pelo organizador
- `service_fee_type` - absorbed ou passed_to_buyer
- `buyer_price` - Preço final para comprador
- `quantity_sold` - Quantidade vendida

### Integração Stripe Existente

- **Webhook Handler**: `src/app/api/stripe/webhook/route.ts`
- **Processamento**: `src/lib/stripe/webhooks.ts`
- **Client Stripe**: `src/lib/stripe/server.ts`
- **Eventos Processados**:
  - `payment_intent.succeeded` - Pagamento bem-sucedido
  - `payment_intent.payment_failed` - Pagamento falhou
  - `checkout.session.completed` - Checkout completado
  - `charge.refunded` - Reembolso processado
  - `account.updated` - Atualização da conta Connect

---

## 🏗️ Arquitetura da Solução

### 1. Frontend Components

#### 1.1 Nova Página: `/admin/financeiro`
```
src/app/admin/financeiro/
├── page.tsx                    # Página principal
├── loading.tsx                 # Loading state
└── _components/
    ├── FinanceOverview.tsx     # Cards de métricas principais
    ├── TransactionsTable.tsx   # Tabela com TanStack Table
    ├── FinanceFilters.tsx      # Filtros de busca
    ├── PayoutHistory.tsx       # Histórico de repasses
    └── StripeAccountStatus.tsx # Status da conta Stripe
```

#### 1.2 Atualização do Sidebar
- Adicionar item "Financeiro" ao menu de navegação
- Ícone: `DollarSign` ou `Wallet` do lucide-react
- Posição: Entre "Análises" e "Configurações"

### 2. Backend APIs

#### 2.1 Nova API Route: `/api/organizer/finance`
```
src/app/api/organizer/finance/
├── transactions/
│   └── route.ts               # GET - Lista transações com filtros
├── overview/
│   └── route.ts               # GET - Métricas consolidadas
├── payouts/
│   └── route.ts               # GET - Histórico de repasses Stripe
└── export/
    └── route.ts               # POST - Exportar dados (CSV/Excel)
```

**Funcionalidades das APIs:**

1. **GET /api/organizer/finance/transactions**
   - Lista transações filtradas do organizador
   - Parâmetros: `page`, `limit`, `status`, `date_from`, `date_to`, `event_id`
   - Retorna: Transações com dados de evento, ingresso e participante
   - Usa Directus SDK para buscar `payment_transactions` + `event_registrations`

2. **GET /api/organizer/finance/overview**
   - Calcula métricas financeiras:
     - Total vendido (bruto)
     - Total em taxas
     - Total líquido (a receber)
     - Quantidade de transações
     - Ticket médio
   - Período: últimos 30 dias, 90 dias, ano, ou customizado
   - Agrupa por status (succeeded, pending, refunded)

3. **GET /api/organizer/finance/payouts**
   - Busca repasses na API do Stripe
   - Usa `stripe.payouts.list({ destination: organizer.stripe_account_id })`
   - Retorna histórico de transferências para conta do organizador

4. **POST /api/organizer/finance/export**
   - Exporta transações em CSV/Excel
   - Usa biblioteca `exceljs` ou `csv-writer`
   - Inclui: Data, Evento, Participante, Valor, Taxa, Líquido, Status

#### 2.2 Helpers para Cálculos Financeiros
```typescript
// src/lib/finance/calculations.ts

export function calculateNetAmount(
  totalAmount: number,
  serviceFee: number
): number {
  return totalAmount - serviceFee;
}

export function calculateServiceFee(
  price: number,
  feeType: 'absorbed' | 'passed_to_buyer',
  feePercentage: number = 0.10 // 10% padrão
): { serviceFee: number; buyerPrice: number; organizerRevenue: number } {
  if (feeType === 'absorbed') {
    const serviceFee = price * feePercentage;
    return {
      serviceFee,
      buyerPrice: price,
      organizerRevenue: price - serviceFee
    };
  } else {
    const serviceFee = price * feePercentage;
    return {
      serviceFee,
      buyerPrice: price + serviceFee,
      organizerRevenue: price
    };
  }
}
```

### 3. Integração com Stripe Connect

#### 3.1 Dados Financeiros da Conta Connect
```typescript
// Buscar saldo da conta
const balance = await stripe.balance.retrieve({
  stripeAccount: organizer.stripe_account_id
});

// Listar transações (Balance Transactions)
const balanceTransactions = await stripe.balanceTransactions.list(
  {
    limit: 100,
    created: { gte: startDate, lte: endDate }
  },
  { stripeAccount: organizer.stripe_account_id }
);

// Listar repasses (Payouts)
const payouts = await stripe.payouts.list(
  { limit: 100 },
  { stripeAccount: organizer.stripe_account_id }
);
```

---

## 🎨 Interface do Usuário

### 1. Cards de Overview (Dashboard)

**Métricas Principais:**
- 💰 **Vendas Totais** - Valor bruto vendido no período
- 📊 **Taxa de Serviço** - Total em taxas cobradas
- ✅ **Receita Líquida** - Valor líquido a receber
- 🎫 **Ingressos Vendidos** - Quantidade total
- 📈 **Ticket Médio** - Valor médio por venda
- ⏳ **Pendentes** - Transações aguardando confirmação

**Indicadores Visuais:**
- Gráficos de linha para evolução temporal
- Comparação com período anterior (variação %)
- Badges de status (sucesso, pendente, reembolso)

### 2. Tabela de Transações (TanStack Table)

**Colunas:**
| Coluna | Descrição | Filtro |
|--------|-----------|--------|
| Data | Data/hora da transação | Date range |
| ID Transação | Stripe Payment Intent ID | Search |
| Evento | Nome do evento | Select |
| Participante | Nome e email | Search |
| Quantidade | Qtd de ingressos | - |
| Valor Bruto | Valor total pago | Sort |
| Taxa | Taxa de serviço | Sort |
| Valor Líquido | Valor a receber | Sort |
| Status | succeeded/pending/refunded | Select |
| Ações | Ver detalhes, reembolsar | - |

**Funcionalidades:**
- ✅ Paginação server-side
- ✅ Ordenação por coluna
- ✅ Filtros múltiplos (data, evento, status)
- ✅ Busca por nome/email/ID
- ✅ Exportação para CSV/Excel
- ✅ Ver detalhes da transação (modal)

### 3. Histórico de Repasses

**Tabela de Payouts:**
| Data | ID Payout | Valor | Status | Chegada Prevista | Ações |
|------|-----------|-------|--------|------------------|-------|
| 05/10 | po_xxx | R$ 1.500,00 | paid | 06/10 | Ver detalhes |
| 28/09 | po_yyy | R$ 2.300,00 | in_transit | 30/09 | Ver detalhes |

**Status possíveis:**
- `paid` - Transferido com sucesso
- `in_transit` - Em trânsito
- `pending` - Aguardando processamento
- `failed` - Falhou
- `canceled` - Cancelado

### 4. Status da Conta Stripe

**Indicadores de Habilitação:**
```
✅ Onboarding Completo
✅ Pagamentos Habilitados (Charges Enabled)
✅ Transferências Habilitadas (Payouts Enabled)

Ou:
⚠️ Onboarding Pendente - [Completar Cadastro]
```

---

## 📦 Dependências a Instalar

### NPM Packages
```bash
# TanStack Table v8
pnpm add @tanstack/react-table

# Exportação de dados
pnpm add exceljs
pnpm add csv-writer

# Formatação de números/moeda
pnpm add dinero.js
# Ou usar Intl.NumberFormat nativo

# Gráficos (opcional)
pnpm add recharts
```

---

## 🔐 Segurança e Permissões

### Validações Obrigatórias

1. **Autenticação**: Todas as rotas financeiras devem usar `requireOrganizer()`
2. **Isolamento de Dados**: Organizador só acessa suas próprias transações
3. **Stripe Account Validation**: Verificar que `stripe_account_id` existe
4. **Rate Limiting**: Aplicar limites nas APIs de exportação

### Filtros de Segurança (Directus)
```typescript
// Garantir que organizador só vê suas transações
const transactions = await client.request(
  readItems('payment_transactions', {
    filter: {
      registration_id: {
        event_id: {
          organizer_id: { _eq: organizer.id }
        }
      }
    }
  })
);
```

---

## 📈 Métricas e KPIs

### Cálculos Necessários

1. **Vendas Brutas**
   ```typescript
   SUM(event_registrations.total_amount)
   WHERE payment_status = 'paid'
   ```

2. **Taxas Totais**
   ```typescript
   SUM(event_registrations.service_fee)
   WHERE payment_status = 'paid'
   ```

3. **Receita Líquida**
   ```typescript
   SUM(event_registrations.payment_amount)
   WHERE payment_status = 'paid'
   ```

4. **Ticket Médio**
   ```typescript
   AVG(event_registrations.total_amount)
   WHERE payment_status = 'paid'
   ```

5. **Taxa de Conversão**
   ```typescript
   (COUNT paid / COUNT total) * 100
   ```

### Dashboard Analytics
- Gráfico de evolução de vendas (últimos 30/90/365 dias)
- Breakdown por evento (top eventos por receita)
- Métodos de pagamento mais usados
- Taxa de reembolso (refunded / paid)

---

## 🚀 Plano de Execução

### Fase 1: Setup Inicial (1-2h)
- [ ] Instalar dependências (TanStack Table, exceljs, etc)
- [ ] Criar estrutura de pastas `/admin/financeiro`
- [ ] Adicionar item "Financeiro" no menu lateral
- [ ] Criar página básica com layout

### Fase 2: APIs Backend (3-4h)
- [ ] Implementar `/api/organizer/finance/transactions`
  - [ ] Buscar transações do Directus
  - [ ] Aplicar filtros e paginação
  - [ ] Incluir relações (event, registration)
- [ ] Implementar `/api/organizer/finance/overview`
  - [ ] Calcular métricas agregadas
  - [ ] Suportar filtros de período
- [ ] Implementar `/api/organizer/finance/payouts`
  - [ ] Integrar com Stripe API
  - [ ] Listar histórico de repasses
- [ ] Implementar `/api/organizer/finance/export`
  - [ ] Gerar CSV/Excel
  - [ ] Validar permissões

### Fase 3: UI Components (4-5h)
- [ ] FinanceOverview - Cards de métricas
  - [ ] Consumir API `/overview`
  - [ ] Renderizar KPIs
  - [ ] Adicionar gráficos (opcional)
- [ ] TransactionsTable - Tabela principal
  - [ ] Configurar TanStack Table
  - [ ] Implementar colunas
  - [ ] Adicionar paginação server-side
  - [ ] Implementar filtros
  - [ ] Adicionar busca
- [ ] FinanceFilters - Filtros de busca
  - [ ] Date range picker
  - [ ] Select de eventos
  - [ ] Select de status
- [ ] PayoutHistory - Histórico de repasses
  - [ ] Consumir API `/payouts`
  - [ ] Renderizar tabela
- [ ] StripeAccountStatus - Status da conta
  - [ ] Mostrar indicadores de habilitação
  - [ ] Link para completar onboarding

### Fase 4: Features Avançadas (2-3h)
- [ ] Modal de detalhes da transação
- [ ] Exportação CSV/Excel
- [ ] Gráficos de evolução temporal
- [ ] Breakdown por evento
- [ ] Filtros avançados salvos

### Fase 5: Testes e Refinamentos (2h)
- [ ] Testar com dados reais do Stripe
- [ ] Validar cálculos financeiros
- [ ] Ajustar responsividade mobile
- [ ] Melhorar estados de loading/erro
- [ ] Adicionar tooltips explicativos

### Fase 6: Documentação (1h)
- [ ] Documentar novas APIs no README
- [ ] Adicionar comentários no código
- [ ] Criar guia de uso para organizadores
- [ ] Atualizar variáveis de ambiente (.env.example)

---

## 🔄 Integrações Stripe a Implementar

### 1. Balance API
```typescript
// Buscar saldo disponível e pendente
const balance = await stripe.balance.retrieve({
  stripeAccount: organizer.stripe_account_id
});

// balance.available[] - Saldo disponível para saque
// balance.pending[] - Saldo pendente de liquidação
```

### 2. Balance Transactions API
```typescript
// Listar todas as transações de saldo
const transactions = await stripe.balanceTransactions.list({
  limit: 100,
  type: 'payment', // ou 'refund', 'adjustment', etc
}, {
  stripeAccount: organizer.stripe_account_id
});
```

### 3. Payouts API
```typescript
// Listar repasses programados e realizados
const payouts = await stripe.payouts.list({
  limit: 100,
}, {
  stripeAccount: organizer.stripe_account_id
});
```

### 4. Transfer API (Se aplicável)
```typescript
// Se usar Stripe Transfers ao invés de direto para conta
const transfers = await stripe.transfers.list({
  destination: organizer.stripe_account_id,
  limit: 100
});
```

---

## 📝 Considerações Importantes

### 1. Taxas de Serviço
- A plataforma cobra 10% de taxa de serviço (configurável)
- Pode ser absorvida pelo organizador ou repassada ao comprador
- Campo `service_fee_type` em `event_tickets` define o modelo

### 2. Moeda e Formatação
- Valores armazenados em decimal no Directus (BRL)
- Stripe usa centavos (multiplicar por 100)
- Usar `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`

### 3. Timezone
- Transações têm timestamp UTC
- Converter para timezone do Brasil (America/Sao_Paulo)

### 4. Idempotência
- Webhooks podem ser reenviados pelo Stripe
- Sistema já tem proteção contra duplicatas no webhook handler

### 5. Performance
- Usar paginação server-side obrigatoriamente
- Limitar queries com `limit` e `offset`
- Cachear métricas de overview (considerar cache de 5 minutos)

---

## 🎯 Critérios de Aceite

### Funcional
- [ ] Organizador visualiza todas as transações de seus eventos
- [ ] Filtros funcionam corretamente (data, evento, status)
- [ ] Métricas consolidadas são precisas
- [ ] Histórico de repasses Stripe é exibido
- [ ] Exportação CSV/Excel funciona
- [ ] Responsivo em mobile/tablet/desktop

### Performance
- [ ] Página carrega em < 2s
- [ ] Paginação não trava com muitos registros
- [ ] Exportação não causa timeout

### Segurança
- [ ] Organizador só acessa seus próprios dados
- [ ] Rotas protegidas com autenticação
- [ ] Sem vazamento de dados sensíveis

### UX
- [ ] Interface intuitiva e clara
- [ ] Loading states visíveis
- [ ] Mensagens de erro amigáveis
- [ ] Tooltips explicativos nos campos

---

## 📚 Referências Técnicas

### Documentação Stripe
- [Balance API](https://stripe.com/docs/api/balance)
- [Balance Transactions](https://stripe.com/docs/api/balance_transactions)
- [Payouts](https://stripe.com/docs/api/payouts)
- [Connect Account Balance](https://stripe.com/docs/connect/account-balances)

### TanStack Table
- [Docs v8](https://tanstack.com/table/v8/docs/guide/introduction)
- [Server-side Pagination](https://tanstack.com/table/v8/docs/examples/react/pagination-controlled)
- [Filtering](https://tanstack.com/table/v8/docs/examples/react/filters)

### Directus SDK
- [Query Guide](https://docs.directus.io/guides/sdk/query/)
- [Filtering](https://docs.directus.io/reference/filter-rules.html)
- [Aggregation](https://docs.directus.io/reference/query.html#aggregate)

---

## 🔮 Melhorias Futuras (Pós-MVP)

1. **Dashboard Analytics Avançado**
   - Comparação entre períodos
   - Previsão de receita
   - Análise de sazonalidade

2. **Relatórios Personalizados**
   - Criar e salvar filtros customizados
   - Agendamento de relatórios por email
   - Dashboards personalizáveis

3. **Integração Contábil**
   - Exportar para sistemas contábeis
   - Geração de notas fiscais
   - Conciliação bancária

4. **Multi-moeda**
   - Suporte a eventos internacionais
   - Conversão automática de moeda

5. **Webhooks para Organizador**
   - Notificar organizador de novas vendas
   - Alertas de reembolsos
   - Avisos de repasses realizados

---

## ✅ Checklist de Validação Final

Antes de considerar a feature completa:

- [ ] Código revisado e sem warnings
- [ ] Types TypeScript 100% corretos
- [ ] Tratamento de erros implementado
- [ ] Loading states em todas as APIs
- [ ] Testes manuais com dados reais
- [ ] Validação de cálculos financeiros
- [ ] Documentação completa
- [ ] Screenshots/vídeo de demonstração
- [ ] Deploy em staging testado
- [ ] Feedback do usuário coletado

---

**Estimativa Total de Desenvolvimento: 12-16 horas**

**Prioridade: Alta**

**Complexidade: Média-Alta**
