# Implementação: Tela de Gerenciamento de Ingressos

**Data:** 13/10/2025
**Rota:** `/admin/ingressos`
**Status:** ✅ Implementação completa

---

## 📋 Estrutura Criada

### Frontend Components

```
nextjs/src/app/admin/ingressos/
├── page.tsx                              # Página principal
├── _lib/
│   └── types.ts                          # TypeScript types
├── _hooks/
│   └── useAuthToken.ts                   # Hook de autenticação
└── _components/
    ├── SearchBar.tsx                     # Barra de busca
    ├── TicketFilters.tsx                 # Filtros em Sheet
    ├── ActiveFilterBadges.tsx            # Badges de filtros ativos
    ├── TicketsTable.tsx                  # Tabela responsiva
    ├── TicketDrawer.tsx                  # Drawer principal com Steps
    └── steps/
        ├── BasicInfoStep.tsx             # Step 1: Info básicas
        ├── PricingStep.tsx               # Step 2: Preços e taxas
        ├── AvailabilityStep.tsx          # Step 3: Disponibilidade
        └── SalePeriodStep.tsx            # Step 4: Período de vendas
```

### Backend API Routes

```
nextjs/src/app/api/admin/ingressos/
├── route.ts                              # GET (listar), POST (criar)
├── [id]/
│   ├── route.ts                          # PATCH (editar), DELETE (excluir)
│   └── duplicate/
│       └── route.ts                      # POST (duplicar)
└── filter-options/
    └── route.ts                          # GET (opções de filtro)
```

---

## ✨ Funcionalidades Implementadas

### 1. Listagem de Ingressos
- ✅ Tabela responsiva com todas as informações
- ✅ Paginação (20 itens por página)
- ✅ Ordenação por data de criação (mais recentes primeiro)
- ✅ Progress bar visual de ocupação (vendidos/total)
- ✅ Badges de status (Ativo, Esgotado, Inativo)
- ✅ Estado vazio com CTA

### 2. Busca e Filtros
- ✅ Busca por nome do ingresso ou evento (debounce 300ms)
- ✅ Filtro por evento (multi-select)
- ✅ Filtro por status (Ativo, Esgotado, Inativo)
- ✅ Badge contador de filtros ativos
- ✅ Badges de filtros aplicados com opção de remover
- ✅ Botão "Limpar todos os filtros"

### 3. Cadastro/Edição (Drawer com 4 Steps)

#### **Step 1: Informações Básicas** 🎫
- ✅ Seleção de evento (dropdown com busca)
- ✅ Nome do ingresso (obrigatório, máx. 100 caracteres)
- ✅ Descrição (opcional, máx. 500 caracteres)
- ✅ Visibilidade (Público, Convidados, Manual)
- ✅ Contador de caracteres em tempo real

#### **Step 2: Preços e Taxas** 💰
- ✅ Input de preço (obrigatório, formato moeda)
- ✅ Escolha de taxa de serviço (Absorver ou Repassar)
- ✅ **Calculadora visual em tempo real** mostrando:
  - Preço base
  - Taxa de serviço (5%)
  - Valor que o organizador recebe
  - Valor que o comprador paga
- ✅ Parcelamento Pix (toggle)
  - Máximo de parcelas (2-12)
  - Valor mínimo para parcelar
- ✅ Seção de parcelamento colapsável

#### **Step 3: Disponibilidade** 📦
- ✅ Quantidade total (obrigatório)
- ✅ Quantidade mínima por compra (opcional)
- ✅ Quantidade máxima por compra (opcional)
- ✅ Quantidade vendida (read-only, apenas em edição)
- ✅ **Card de resumo visual** com:
  - Total, vendidos, disponíveis
  - Progress bar
  - Percentual de ocupação
- ✅ Validação: quantidade >= quantidade vendida

#### **Step 4: Período de Vendas** 📅
- ✅ Data/hora de início (opcional)
- ✅ Data/hora de término (opcional)
- ✅ Card de referência do evento selecionado
- ✅ **Mensagem de status dinâmica**:
  - "Vendas abertas até o evento começar"
  - "Vendas iniciarão em DD/MM/AAAA às HH:MM"
  - "Vendas abertas até DD/MM/AAAA"
  - "Período de vendas encerrado"
- ✅ Validação: início < fim < data do evento

### 4. Ações Rápidas
- ✅ **Editar** - Abre drawer com dados pré-preenchidos
- ✅ **Duplicar** - Cria cópia com título modificado e status inativo
- ✅ **Ativar/Desativar** - Toggle rápido de status
- ✅ **Excluir** - Com confirmação e alerta se há vendas

### 5. Validações
- ✅ Campos obrigatórios por step
- ✅ Validação de formato (email, moeda, números)
- ✅ Validação de lógica (datas, limites)
- ✅ Mensagens de erro inline
- ✅ Impede avanço de step com erros
- ✅ Toast de sucesso/erro

### 6. UX Details
- ✅ Progress bar visual no drawer (4 steps)
- ✅ Steps clicáveis (navegação direta)
- ✅ Ícones emoji nos steps
- ✅ Botão "Salvar Rascunho" (status: inactive)
- ✅ Botão "Publicar Ingresso" (status: active)
- ✅ Loading states em todas as ações
- ✅ Skeleton loading na tabela
- ✅ Confirmação ao fechar drawer com alterações

---

## 🔧 Configurações Técnicas

### Taxas
```typescript
const SERVICE_FEE_PERCENTAGE = 0.05; // 5%
```

### Paginação
```typescript
const ITEMS_PER_PAGE = 20;
```

### Cálculo de Preço para o Comprador
```typescript
buyer_price = service_fee_type === 'absorbed'
  ? price
  : price + (price * SERVICE_FEE_PERCENTAGE);
```

---

## 🎨 Design System Utilizado

- **Componentes:** Shadcn/ui
- **Estilos:** Tailwind CSS
- **Icons:** Lucide React
- **Formulários:** React Hook Form (implícito via state)
- **Validação:** Custom validation (pode ser migrado para Zod)

### Paleta de Cores (Status)
- **Ativo:** `green-500` (#22C55E)
- **Esgotado:** `red-500` (#EF4444)
- **Inativo:** `gray-400` (#9CA3AF)

---

## 🔌 Integração com Directus

### Collection: `event_tickets`

**Campos utilizados:**
- `id` (uuid, PK)
- `event_id` (M2O → events)
- `title`, `description`, `visibility`
- `quantity`, `quantity_sold`
- `price`, `service_fee_type`, `buyer_price`
- `sale_start_date`, `sale_end_date`
- `min_quantity_per_purchase`, `max_quantity_per_purchase`
- `allow_installments`, `max_installments`, `min_amount_for_installments`
- `status`, `sort`
- `date_created`, `date_updated`

**Relacionamentos:**
- `event_id` → `events` (M2O)

---

## 📱 Responsividade

### Desktop (≥1024px)
- Tabela completa com todas as colunas
- Drawer lateral (600px)
- Filtros inline

### Tablet (768px - 1023px)
- Tabela simplificada
- Drawer ocupa 70% da tela

### Mobile (<768px)
- Cards ao invés de tabela (pendente)
- Drawer fullscreen
- Steps com ícones apenas

---

## 🚀 Como Usar

### 1. Acessar a Página
```
/admin/ingressos
```

### 2. Criar Novo Ingresso
1. Clicar em "Novo Ingresso"
2. Preencher Step 1 → Clicar "Próximo"
3. Preencher Step 2 → Clicar "Próximo"
4. Preencher Step 3 → Clicar "Próximo"
5. Preencher Step 4 → Clicar "Publicar Ingresso"

### 3. Editar Ingresso
1. Clicar no ícone de lápis na tabela
2. Drawer abre com dados pré-preenchidos
3. Modificar campos desejados
4. Clicar "Atualizar Ingresso"

### 4. Duplicar Ingresso
1. Clicar no menu (⋮) → "Duplicar"
2. Novo ingresso criado com título " - Cópia"
3. Status inicial: Inativo

### 5. Ativar/Desativar
1. Clicar no menu (⋮) → "Ativar" ou "Desativar"
2. Status atualizado instantaneamente

### 6. Excluir
1. Clicar no menu (⋮) → "Excluir"
2. Confirmar exclusão
3. Se houver vendas, alerta é exibido

---

## ⚠️ Considerações Importantes

### Limitações Atuais
1. **Quantidade vendida** é read-only e deve ser calculada por webhook/flow
2. **Status "sold_out"** deve ser atualizado automaticamente quando quantity_sold >= quantity
3. **Permissões** não estão filtradas por organizador (implementar filtro por `event.organizer_id`)
4. **Cards mobile** ainda não implementados (apenas tabela)

### Próximos Passos Recomendados
1. Adicionar filtro de permissões por organizador
2. Implementar cards para mobile
3. Adicionar exportação CSV/Excel
4. Criar hook do Directus para atualizar `quantity_sold` automaticamente
5. Criar hook para mudar status para `sold_out` quando esgotado
6. Adicionar histórico de alterações (audit log)
7. Implementar bulk actions (ativar/desativar múltiplos)

---

## 🐛 Troubleshooting

### Erro: "Unauthorized"
- Verificar se o token está sendo passado corretamente
- Verificar se o usuário tem permissões na collection `event_tickets`

### Drawer não abre
- Verificar console do browser para erros
- Verificar se `eventOptions` está carregando corretamente

### Calculadora não atualiza
- Verificar se `price` e `service_fee_type` estão no state
- Verificar se `SERVICE_FEE_PERCENTAGE` está definido

### Filtros não aplicam
- Verificar se API está retornando dados corretos
- Verificar query params na network tab

---

## 📚 Referências

- **Especificação UX:** `/docs/ux-admin-ingressos.md`
- **Collection Schema:** Directus Admin → Data Model → `event_tickets`
- **Shadcn/ui Docs:** https://ui.shadcn.com/
- **Directus SDK:** https://docs.directus.io/guides/sdk/

---

**Última atualização:** 13/10/2025
**Versão:** 1.0
**Desenvolvido por:** Claude Code
