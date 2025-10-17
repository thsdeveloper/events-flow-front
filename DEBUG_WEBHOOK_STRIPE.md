# Debug: Webhook Stripe não está atualizando campos

## Problema Reportado

O webhook está apenas atualizando o campo `stripe_account_id` (valor: `acct_1SIvP2DgTrQjIg8i`), mas não está atualizando os outros campos booleanos:
- `stripe_onboarding_complete`
- `stripe_charges_enabled`
- `stripe_payouts_enabled`

## Fluxo Esperado

Quando a conta Stripe é atualizada (evento `account.updated`):

1. Webhook recebe o evento em `/api/stripe/webhook`
2. Chama `handleAccountUpdated(account)` em `src/lib/stripe/webhooks.ts:553`
3. Busca o organizador pelo `stripe_account_id`
4. Atualiza os campos:
   ```typescript
   {
     stripe_onboarding_complete: account.details_submitted && account.charges_enabled,
     stripe_charges_enabled: account.charges_enabled || false,
     stripe_payouts_enabled: account.payouts_enabled || false,
     status: 'active' // SE isStripeComplete && organizer.status === 'pending'
   }
   ```

## Logs Adicionados

Já foram adicionados logs detalhados no `handleAccountUpdated`:

```typescript
console.log('[Webhook] ============================================');
console.log('[Webhook] Account updated:', account.id);
console.log('[Webhook] Account details_submitted:', account.details_submitted);
console.log('[Webhook] Account charges_enabled:', account.charges_enabled);
console.log('[Webhook] Account payouts_enabled:', account.payouts_enabled);
console.log('[Webhook] ============================================');

// ... busca organizer ...

console.log('[Webhook] Found organizers:', organizers.length);
console.log('[Webhook] Organizer found:', { ... });
console.log('[Webhook] Is Stripe complete?', isStripeComplete);
console.log('[Webhook] Update data:', updateData);

// após update
console.log(`[Webhook] ✅ Organizer ${organizer.id} updated with Stripe status`);
```

## Checklist de Verificação

### 1. Verificar se o webhook está sendo chamado
```bash
# No terminal onde o Next.js está rodando
# Procurar por:
grep "Account updated" logs.txt
# ou
tail -f logs.txt | grep "Webhook"
```

**O que verificar:**
- [ ] Vê a linha `[Webhook] ============================================`?
- [ ] Vê `[Webhook] Account updated: acct_1SIvP2DgTrQjIg8i`?
- [ ] Se SIM → Webhook está sendo chamado ✅
- [ ] Se NÃO → Webhook não está sendo acionado ❌

### 2. Verificar valores do Stripe
Se o webhook está sendo chamado, verificar os valores que o Stripe está enviando:

```bash
# Procurar por:
grep "details_submitted" logs.txt
grep "charges_enabled" logs.txt
grep "payouts_enabled" logs.txt
```

**Valores esperados:**
- `details_submitted: true` (onboarding completo)
- `charges_enabled: true` (pode aceitar pagamentos)
- `payouts_enabled: true` (pode receber repasses)

**Se algum valor for `false`:**
- O organizador ainda não completou o onboarding no Stripe
- Precisa completar mais informações na plataforma do Stripe

### 3. Verificar se o organizador foi encontrado
```bash
grep "Found organizers" logs.txt
grep "Organizer found" logs.txt
```

**O que verificar:**
- [ ] `Found organizers: 1` → Organizador encontrado ✅
- [ ] `Found organizers: 0` → Organizador NÃO encontrado ❌

**Se organizador não foi encontrado:**
- Verificar se `stripe_account_id` no banco é exatamente `acct_1SIvP2DgTrQjIg8i`
- Pode ter espaços extras ou caracteres invisíveis

### 4. Verificar dados do update
```bash
grep "Update data:" logs.txt
```

**Deve mostrar:**
```json
{
  stripe_onboarding_complete: true/false,
  stripe_charges_enabled: true/false,
  stripe_payouts_enabled: true/false,
  status: 'active' // apenas se isStripeComplete === true
}
```

### 5. Verificar se o update foi bem-sucedido
```bash
grep "✅ Organizer .* updated" logs.txt
```

**Se NÃO aparecer:**
- Houve erro no update
- Procurar por `❌ Error in handleAccountUpdated`

## Testes Manuais

### Teste 1: Simular evento Stripe localmente
```bash
# Com Stripe CLI instalado e configurado
stripe trigger account.updated
```

Verificar os logs conforme checklist acima.

### Teste 2: Verificar diretamente no Directus
```bash
# Consultar o organizador no Directus
curl "http://localhost:8055/items/organizers?filter[stripe_account_id][_eq]=acct_1SIvP2DgTrQjIg8i" \
  -H "Authorization: Bearer SEU_DIRECTUS_ADMIN_TOKEN"
```

**Campos esperados:**
```json
{
  "data": [{
    "id": "...",
    "stripe_account_id": "acct_1SIvP2DgTrQjIg8i",
    "stripe_onboarding_complete": true,
    "stripe_charges_enabled": true,
    "stripe_payouts_enabled": true,
    "status": "active"
  }]
}
```

### Teste 3: Forçar update manual (debug only)
```bash
# Atualizar manualmente no Directus para testar UI
curl -X PATCH "http://localhost:8055/items/organizers/ID_DO_ORGANIZER" \
  -H "Authorization: Bearer SEU_DIRECTUS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stripe_onboarding_complete": true,
    "stripe_charges_enabled": true,
    "stripe_payouts_enabled": true,
    "status": "active"
  }'
```

Depois, recarregar a página `/perfil/organizador` e verificar se a UI muda para o estado de sucesso.

## Possíveis Causas do Problema

### Causa 1: Webhook não está sendo acionado
**Como verificar:** Logs não mostram `[Webhook] Account updated`

**Solução:**
1. Verificar se `STRIPE_WEBHOOK_SECRET` está configurado no `.env`
2. Verificar se Stripe CLI está rodando: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Verificar se o webhook está registrado no dashboard do Stripe (produção)

### Causa 2: Organizador não está sendo encontrado
**Como verificar:** Logs mostram `Found organizers: 0`

**Solução:**
1. Verificar se `stripe_account_id` no banco está correto
2. Query de busca: verificar se a URL do Directus está correta
3. Verificar se o token admin tem permissão de leitura na collection `organizers`

### Causa 3: Update está falhando silenciosamente
**Como verificar:** Logs mostram `Update data` mas não mostram `✅ Organizer updated`

**Solução:**
1. Verificar se `DIRECTUS_ADMIN_TOKEN` está configurado
2. Verificar se o token tem permissão de escrita na collection `organizers`
3. Verificar logs de erro: `❌ Error in handleAccountUpdated`

### Causa 4: Conta Stripe não está completa
**Como verificar:** Logs mostram `charges_enabled: false` ou `details_submitted: false`

**Solução:**
1. Organizador precisa completar mais informações no Stripe
2. Acessar o painel do Stripe Connect e verificar requisitos pendentes
3. Pode estar faltando documentos, informações bancárias, etc.

## Próximos Passos

1. ✅ Verificar logs conforme checklist acima
2. ⏳ Identificar em qual etapa o processo está falhando
3. ⏳ Aplicar solução específica baseada na causa identificada
4. ⏳ Testar novamente com `stripe trigger account.updated`

## Comandos Úteis

```bash
# Ver logs do Next.js em tempo real
pnpm dev | tee logs.txt

# Em outro terminal, filtrar apenas logs do webhook
tail -f logs.txt | grep -i webhook

# Simular evento Stripe
stripe trigger account.updated

# Verificar conta no Stripe CLI
stripe accounts retrieve acct_1SIvP2DgTrQjIg8i

# Verificar organizador no Directus
pnpm mcp-directus items organizers --filter stripe_account_id=acct_1SIvP2DgTrQjIg8i
```
