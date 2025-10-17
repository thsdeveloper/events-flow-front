# Fix: Webhook Stripe não atualizava campos booleanos

## Problema

O webhook `account.updated` apenas atualizava o `stripe_account_id`, mas não os campos:
- `stripe_onboarding_complete`
- `stripe_charges_enabled`
- `stripe_payouts_enabled`

## Mudanças Implementadas

### 1. Refatoração do `handleAccountUpdated` (src/lib/stripe/webhooks.ts:553-642)

**Antes:**
- Usava `fetch()` direto para consultar Directus
- Logs básicos
- Pouco feedback em caso de erro

**Depois:**
- ✅ Usa Directus SDK consistentemente (`readItems`)
- ✅ Logs detalhados em JSON para facilitar debug
- ✅ Lista todos os `stripe_account_id` quando não encontra o organizador
- ✅ Mostra resultado completo do update
- ✅ Melhor tratamento de erros do Directus

### 2. Logs Adicionados

```typescript
// Logs de busca
console.log('[Webhook] Searching for organizer with stripe_account_id:', account.id);

// Logs de dados encontrados
console.log('[Webhook] Organizer found:', { ...organizer });

// Logs do cálculo
console.log('[Webhook] Is Stripe complete?', isStripeComplete);

// Logs do update (JSON formatado)
console.log('[Webhook] Update data:', JSON.stringify(updateData, null, 2));

// Logs do resultado
console.log('[Webhook] Updated fields:', JSON.stringify(result, null, 2));

// Debug quando não encontra (lista todos os IDs)
console.log('[Webhook] All organizers in database:', allOrganizers.length);
console.log('[Webhook] Stripe account IDs:', allOrganizers.map(o => o.stripe_account_id));
```

## Como Testar

### Teste 1: Trigger Manual com Stripe CLI

```bash
# Terminal 1: Rodar o Next.js
cd nextjs
pnpm dev | tee webhook-logs.txt

# Terminal 2: Stripe CLI listening
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3: Trigger o evento
stripe trigger account.updated
```

**O que procurar nos logs:**
1. `[Webhook] ============================================`
2. `[Webhook] Account updated: acct_xxxxx`
3. `[Webhook] Searching for organizer with stripe_account_id:`
4. `[Webhook] Found organizers: 1` (deve ser 1, não 0)
5. `[Webhook] Update data: { ... }` (deve mostrar os campos booleanos)
6. `[Webhook] ✅ Organizer xxx updated successfully`

### Teste 2: Script de Teste Node.js

```bash
# Instalar tsx (se ainda não tiver)
pnpm add -D tsx

# Editar o arquivo e colocar o ID correto
# scripts/test-webhook-account-updated.ts
# Linha 17: const TEST_ACCOUNT_ID = 'acct_1SIvP2DgTrQjIg8i';

# Rodar o script
npx tsx scripts/test-webhook-account-updated.ts
```

### Teste 3: Verificar Diretamente no Directus

```bash
# Listar todos os organizers
curl "http://localhost:8055/items/organizers?fields=id,name,stripe_account_id,status,stripe_onboarding_complete,stripe_charges_enabled,stripe_payouts_enabled&access_token=HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u"

# Buscar o organizador específico
curl "http://localhost:8055/items/organizers?filter[stripe_account_id][_eq]=acct_1SIvP2DgTrQjIg8i&access_token=HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u"
```

### Teste 4: Atualizar Manualmente (Debug Only)

Para testar a UI sem depender do webhook:

```bash
# Substitua ID_DO_ORGANIZADOR pelo ID real
curl -X PATCH "http://localhost:8055/items/organizers/ID_DO_ORGANIZADOR" \
  -H "Authorization: Bearer HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u" \
  -H "Content-Type: application/json" \
  -d '{
    "stripe_onboarding_complete": true,
    "stripe_charges_enabled": true,
    "stripe_payouts_enabled": true,
    "status": "active"
  }'
```

Depois, acesse `/perfil/organizador` e verifique se a UI mostra o estado de sucesso.

## Possíveis Causas do Problema Original

### 1. Webhook não estava sendo acionado
**Como verificar:** Não aparece nenhum log com `[Webhook] Account updated`

**Soluções:**
- Verificar `STRIPE_WEBHOOK_SECRET` no `.env`
- Verificar se Stripe CLI está rodando: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Em produção: verificar webhook configurado no dashboard do Stripe

### 2. Query com `fetch()` estava falhando
**Como verificar:** Log mostra `Found organizers: 0`

**Soluções:**
- Agora usa Directus SDK que é mais confiável
- Lista todos os `stripe_account_id` para debug

### 3. Update estava falhando silenciosamente
**Como verificar:** Não aparece `✅ Organizer xxx updated`

**Soluções:**
- Logs agora mostram erros específicos do Directus
- Mostra o resultado do update para confirmar

### 4. Conta Stripe ainda não estava completa
**Como verificar:** Logs mostram `charges_enabled: false` ou `details_submitted: false`

**Solução:**
- Organizador precisa completar o onboarding no Stripe
- Acessar https://dashboard.stripe.com/connect/accounts/overview
- Verificar requisitos pendentes

## Verificação do Estado Atual

Para verificar o estado atual do organizador no banco:

```bash
# Método 1: Via Directus API
curl "http://localhost:8055/items/organizers?filter[stripe_account_id][_eq]=acct_1SIvP2DgTrQjIg8i&fields=*&access_token=HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u"

# Método 2: Via interface do Directus
# Acessar: http://localhost:8055/admin/content/organizers
# Filtrar por stripe_account_id = acct_1SIvP2DgTrQjIg8i
```

**Campos esperados após webhook bem-sucedido:**
```json
{
  "id": "...",
  "stripe_account_id": "acct_1SIvP2DgTrQjIg8i",
  "stripe_onboarding_complete": true,
  "stripe_charges_enabled": true,
  "stripe_payouts_enabled": true,
  "status": "active"
}
```

## Arquivos Modificados

1. **`src/lib/stripe/webhooks.ts`** (linhas 553-642)
   - Mudança de `fetch()` para Directus SDK
   - Logs detalhados adicionados
   - Melhor tratamento de erros

2. **`scripts/test-webhook-account-updated.ts`** (CRIADO)
   - Script para testar o webhook localmente
   - Simula um evento `account.updated` completo

3. **`DEBUG_WEBHOOK_STRIPE.md`** (CRIADO)
   - Guia de debugging detalhado
   - Checklist de verificação

4. **`WEBHOOK_FIX.md`** (ESTE ARQUIVO)
   - Resumo das mudanças
   - Instruções de teste

## Próximos Passos

1. ✅ Código refatorado com logs detalhados
2. ⏳ **TESTE AGORA**: Rodar `stripe trigger account.updated` e verificar logs
3. ⏳ Verificar se os campos são atualizados no Directus
4. ⏳ Verificar se a UI em `/perfil/organizador` mostra o estado correto
5. ⏳ Se ainda não funcionar: compartilhar os logs completos para análise

## Comandos Rápidos

```bash
# Terminal 1: Next.js com logs
cd nextjs && pnpm dev | tee webhook-logs.txt

# Terminal 2: Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3: Trigger webhook
stripe trigger account.updated

# Ver logs filtrados
grep -i "webhook" webhook-logs.txt
grep -i "account updated" webhook-logs.txt
```

---

**Status**: ✅ Código atualizado e pronto para teste
**Ação necessária**: Rodar os testes acima e compartilhar os logs se ainda não funcionar
