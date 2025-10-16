# Fluxo de Aprovação de Organizador

Este documento descreve o fluxo correto de aprovação e ativação de organizadores na plataforma EventsFlow.

## Estados do Organizador

O campo `status` na collection `organizers` pode ter 3 valores:
- `pending` - Organizador aguardando aprovação ou completando onboarding do Stripe
- `active` - Organizador totalmente ativo (pode criar eventos e receber pagamentos)
- `archived` - Organizador arquivado

## Fluxo Completo

### 1. Cadastro Inicial (User Action)
**Ação:** Usuário preenche formulário em `/perfil/organizador/novo`

**Resultado:**
```typescript
{
  status: 'pending',
  stripe_account_id: null,
  stripe_onboarding_complete: false,
  stripe_charges_enabled: false,
  stripe_payouts_enabled: false
}
```

**UI Exibida:** Alert roxo com botão "Configurar Stripe agora" redirecionando para `/perfil/organizador/stripe`

**IMPORTANTE:** Não há aprovação manual. O usuário pode conectar o Stripe imediatamente após o cadastro.

---

### 2. Início do Onboarding Stripe (User Action)
**Ação:** Usuário clica em "Configurar Stripe agora" e é redirecionado para `/perfil/organizador/stripe`

**Endpoint:** `POST /api/organizer/stripe/onboarding`

**Resultado:**
```typescript
{
  status: 'pending',  // Ainda pendente!
  stripe_account_id: 'acct_xxxxx',  // ✅ Agora tem ID
  stripe_onboarding_complete: false,
  stripe_charges_enabled: false,
  stripe_payouts_enabled: false
}
```

**UI Exibida:** Usuário é redirecionado para o Stripe para completar onboarding

---

### 3. Conclusão do Onboarding Stripe (Webhook)
**Ação:** Stripe envia webhook `account.updated` quando onboarding é concluído

**Endpoint:** `POST /api/stripe/webhook` → `handleAccountUpdated()`

**Lógica do Webhook:**
```typescript
// src/lib/stripe/webhooks.ts:553-642
// Busca organizador usando Directus SDK
const organizers = await client.request(
  readItems('organizers', {
    filter: { stripe_account_id: { _eq: account.id } },
    limit: 1,
  })
);

const isStripeComplete = account.details_submitted && account.charges_enabled;

const updateData = {
  stripe_onboarding_complete: isStripeComplete,
  stripe_charges_enabled: account.charges_enabled || false,
  stripe_payouts_enabled: account.payouts_enabled || false,
};

// 🔑 ATIVAÇÃO AUTOMÁTICA
if (isStripeComplete && organizer.status === 'pending') {
  updateData.status = 'active';  // ✅ Muda para active!
}

// Logs detalhados para debug
console.log('[Webhook] Update data:', JSON.stringify(updateData, null, 2));
```

**Resultado Final:**
```typescript
{
  status: 'active',  // ✅ ATIVO!
  stripe_account_id: 'acct_xxxxx',
  stripe_onboarding_complete: true,
  stripe_charges_enabled: true,
  stripe_payouts_enabled: true
}
```

**UI Exibida:** Tela de sucesso + acesso ao dashboard de eventos

---

## Mapeamento de Estados na UI

### Estado 1: Usuário Regular
**Condição:** `!isOrganizer && !hasPendingOrganizerRequest`

**UI:** Landing page com CTA "Solicitar acesso agora"

---

### Estado 2: Pendente (Aguardando Aprovação)
**Condição:** `organizerStatus === 'pending' && !stripe_account_id`

**UI:** Timeline mostrando "Solicitação em análise"

---

### Estado 3: Pendente (Aprovado, aguardando Stripe)
**Condição:** `organizerStatus === 'pending' && stripe_account_id && !stripe_onboarding_complete`

**UI:** Alert verde com botão "Iniciar Onboarding no Stripe"

---

### Estado 4: Ativo
**Condição:** `organizerStatus === 'active'`

**UI:** Tela de sucesso + dashboard de eventos disponível

---

## Arquivos Modificados

### 1. `/src/lib/stripe/webhooks.ts` (linhas 553-642)
**Mudança:** Webhook refatorado para usar Directus SDK e logs detalhados

**Melhorias:**
- ✅ Usa `readItems()` do Directus SDK em vez de `fetch()` direto
- ✅ Logs detalhados em JSON para facilitar debug
- ✅ Lista todos os `stripe_account_id` quando não encontra o organizador
- ✅ Mostra resultado completo do update
- ✅ Melhor tratamento de erros do Directus

```typescript
// Busca usando SDK
const organizers = await client.request(
  readItems('organizers', {
    filter: { stripe_account_id: { _eq: account.id } },
    limit: 1,
  })
);

// Ativa automaticamente quando completo
if (isStripeComplete && organizer.status === 'pending') {
  updateData.status = 'active';
  console.log(`[Webhook] 🎉 Activating organizer ${organizer.id} - Stripe onboarding complete!`);
}

// Logs detalhados
console.log('[Webhook] Update data:', JSON.stringify(updateData, null, 2));
console.log('[Webhook] Updated fields:', JSON.stringify(result, null, 2));
```

### 2. `/src/app/(public)/perfil/organizador/stripe/page.tsx` (CRIADO - 340 linhas)
**Mudança:** Nova página dedicada para configuração do Stripe

**Benefícios:**
- Separação de concerns (configuração isolada da landing page)
- UI focada no processo de onboarding do Stripe
- Melhor organização da navegação

**Features:**
- Back button para `/perfil/organizador`
- Explicação do processo em 3 passos
- `StripeStatusCard` mostrando status atual
- `StripeOnboardingButton` para iniciar/continuar
- Card de benefícios do Stripe Connect
- Seção de ajuda

### 3. `/src/components/organizer-upgrade/StatusTimeline.tsx` (MODIFICADO)
**Mudança:** Removida lógica de embedded Stripe UI

**Antes:**
- Mostrava timeline manual de aprovação
- Incluía toda a UI de configuração do Stripe embutida
- Complexo e cluttered

**Depois:**
- Alert roxo com botão redirecionando para `/perfil/organizador/stripe`
- Card de confirmação de cadastro
- Lista de próximos passos após conectar Stripe
- Limpo e focado

### 4. `/src/app/(public)/perfil/organizador/page.tsx` (MODIFICADO)
**Mudança:** Removida seção de configuração Stripe da página principal

- Organizador ativo agora vê apenas `SuccessState` + FAQ
- Configuração do Stripe movida para página dedicada

---

## Verificações Importantes

✅ O organizador **NUNCA** deve ter `status: 'active'` sem ter Stripe completo
✅ O admin **NUNCA** muda o status manualmente para `active`
✅ A ativação é **SEMPRE** automática via webhook do Stripe
✅ O campo `stripe_account_id` indica que o organizador foi aprovado e iniciou onboarding

---

## Fluxo de Testes

### Teste 1: Cadastro Completo (Fluxo Automático)
1. Usuário acessa `/perfil/organizador` → vê landing page
2. Clica em "Solicitar agora" → redireciona para `/perfil/organizador/novo`
3. Preenche formulário → submete
4. Retorna para `/perfil/organizador` → vê alert roxo "Finalize seu cadastro"
5. Clica em "Configurar Stripe agora" → vai para `/perfil/organizador/stripe`
6. Clica em botão de onboarding → redireciona para Stripe
7. Completa onboarding no Stripe
8. Webhook recebido → status muda para `active` automaticamente
9. Retorna para o site → vê tela de sucesso

### Teste 2: Webhook de Ativação
```bash
# Terminal 1: Next.js com logs
cd nextjs && pnpm dev | tee webhook-logs.txt

# Terminal 2: Stripe CLI listening
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3: Trigger webhook
stripe trigger account.updated
```

**Verificar nos logs:**
1. `[Webhook] ============================================`
2. `[Webhook] Account updated: acct_xxxxx`
3. `[Webhook] Searching for organizer with stripe_account_id:`
4. `[Webhook] Found organizers: 1`
5. `[Webhook] Update data: { ... }` (mostra os campos booleanos)
6. `[Webhook] 🎉 Activating organizer {id} - Stripe onboarding complete!`
7. `[Webhook] ✅ Organizer xxx updated successfully`

**Verificar no Directus:**
1. Organizer tem `status: 'active'`
2. `stripe_onboarding_complete: true`
3. `stripe_charges_enabled: true`
4. `stripe_payouts_enabled: true`

---

## Documentação Adicional

### Arquivos de Debug e Testes
1. **`DEBUG_WEBHOOK_STRIPE.md`** - Guia completo de debugging do webhook
2. **`WEBHOOK_FIX.md`** - Resumo das mudanças e instruções de teste
3. **`scripts/test-webhook-account-updated.ts`** - Script para testar webhook localmente

### Como usar o script de teste
```bash
# Instalar tsx se ainda não tiver
pnpm add -D tsx

# Editar o script e colocar o Stripe account ID correto
# scripts/test-webhook-account-updated.ts linha 17

# Rodar o teste
npx tsx scripts/test-webhook-account-updated.ts
```

---

## Próximos Passos (Melhorias Futuras)

1. **Notificações por Email**
   - Email de boas-vindas após cadastro
   - Email lembrando de completar Stripe onboarding
   - Email de confirmação quando conta ativar

2. **Dashboard de Admin**
   - Visualizar todos os organizadores e seus status
   - Métricas de onboarding (quantos completaram, quantos abandonaram)

3. **Notificações em Tempo Real**
   - WebSocket para atualizar UI automaticamente após webhook
   - Evitar necessidade de refresh manual

4. **Auditoria**
   - Registrar todas mudanças de status via webhooks
   - Log de quando cada etapa foi completada
