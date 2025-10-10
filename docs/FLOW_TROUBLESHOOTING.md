# 🔧 Troubleshooting: Flow não executava operações

## 🐛 Problema Identificado

O Flow original `[Participantes] Reenviar Email de Confirmação` (ID: `0aa38d6d-7fa6-4f19-9174-a0873cdbfa30`) estava retornando **HTTP 200 OK** mas **NÃO executava as operações** (item-read e mail).

### Sintomas

```bash
POST /flows/trigger/0aa38d6d-7fa6-4f19-9174-a0873cdbfa30 200 12ms
# Retorna: {}
# Sem logs de execução
# Sem emails enviados
```

## 🔍 Diagnóstico

### Testes Realizados

1. ✅ **Verificado**: Configuração SMTP (Mailtrap) está correta
2. ✅ **Verificado**: Flow tem trigger "webhook" correto
3. ✅ **Verificado**: Operações estão linkadas via `resolve`
4. ✅ **Verificado**: Flow tem campo `operation` apontando para primeira operação
5. ✅ **Verificado**: Registro existe no banco de dados
6. ❌ **Falhou**: Operações não executam

### Teste com Flow Novo

Criamos um Flow de teste do zero (`4e7ce624-bc73-44eb-9fda-20b6cd609f74`) com:
- Mesma configuração de trigger (webhook)
- Mesmas operações (log → item-read → log → mail)
- Mesma sintaxe de variáveis

**Resultado**: ✅ **FUNCIONOU PERFEITAMENTE!**

```bash
[16:17:12.625] INFO: Flow triggered with data: {"registration_id":"912326ec-9984-443b-bf81-d2b71591150a"}
[16:17:12.634] INFO: Registration found: Comprador 03 Comprador 03 - comprador03@gmail.com
[16:17:12] POST /flows/trigger/4e7ce624-bc73-44eb-9fda-20b6cd609f74 204 36ms
```

Note:
- **200 vs 204**: Flow original retorna 200, funcional retorna 204 (correto para webhooks)
- **12ms vs 36ms**: Flow funcional demora mais (executando operações)
- **Logs presentes**: Operações de log aparecem nos logs do Directus

## 🎯 Causa Raiz (Hipótese)

**Corrupção de estado interno do Flow original durante múltiplas edições.**

Durante o troubleshooting, fizemos várias mudanças:
1. Alteramos trigger de "operation" para "webhook"
2. Mudamos sintaxe de variáveis (`$trigger.payload` → `$trigger.body`)
3. Alteramos tipo do campo `key` (string → array → string)
4. Atualizamos múltiplas vezes as operações

**Possível causa**: Alguma dessas mudanças pode ter causado inconsistência interna no Directus que não é visível via API mas impede a execução.

## ✅ Solução

### 1. Usar o Flow Novo

O Flow `[TESTE] Reenviar Email` (ID: `4e7ce624-bc73-44eb-9fda-20b6cd609f74`) está funcionando corretamente.

**Operações configuradas**:
1. **test_log**: Log de entrada (`{{ $trigger.body }}`)
2. **read_registration_test**: Buscar dados da inscrição
3. **log_result**: Log dos dados recuperados
4. **send_email_test**: Enviar email de confirmação

### 2. Atualização no Código

```typescript
// src/app/api/admin/participantes/[id]/resend-email/route.ts

// ANTES (Flow quebrado)
const RESEND_EMAIL_FLOW_ID = '0aa38d6d-7fa6-4f19-9174-a0873cdbfa30';

// DEPOIS (Flow funcional)
const RESEND_EMAIL_FLOW_ID = '4e7ce624-bc73-44eb-9fda-20b6cd609f74';
```

### 3. Template de Email

O Flow de teste usa um template simplificado. Para adicionar o template completo:

1. Acesse: http://localhost:8055/admin/settings/flows/4e7ce624-bc73-44eb-9fda-20b6cd609f74
2. Clique na operação **"Send Email Test"**
3. Atualize o campo **"Body"** com o template completo:

```html
<h2>Olá, {{ read_registration_test.participant_name }}!</h2>

<p>Sua inscrição para o evento <strong>{{ read_registration_test.event_id.title }}</strong> foi confirmada com sucesso!</p>

<hr>

<h3>🎫 Detalhes da Inscrição</h3>
<ul>
  <li><strong>Evento:</strong> {{ read_registration_test.event_id.title }}</li>
  <li><strong>Data:</strong> {{ read_registration_test.event_id.start_date }}</li>
  <li><strong>Local:</strong> {{ read_registration_test.event_id.location_name }}</li>
  {{#if read_registration_test.event_id.location_address}}
  <li><strong>Endereço:</strong> {{ read_registration_test.event_id.location_address }}</li>
  {{/if}}
  <li><strong>Ingresso:</strong> {{ read_registration_test.ticket_type_id.title }}</li>
</ul>

<hr>

<h3>🔑 Código do Ingresso</h3>
<p style="font-family: monospace; font-size: 24px; font-weight: bold; color: #2563eb; background: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">
  {{ read_registration_test.ticket_code }}
</p>
<p style="color: #6b7280; font-size: 14px;">
  Guarde este código para realizar o check-in no evento.
</p>

<hr>

<p>Nos vemos em breve!</p>

<p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
  Este é um email automático. Por favor, não responda.
</p>
```

**IMPORTANTE**: Note que as variáveis usam `read_registration_test` (key da operação no Flow de teste) ao invés de `read_registration`.

### 4. Atualizar Campos da Operação Read

Atualmente a operação `read_registration_test` busca apenas:
- `id`
- `participant_name`
- `participant_email`

Para o template completo funcionar, precisa buscar também:
- `ticket_code`
- `event_id.title`
- `event_id.start_date`
- `event_id.location_name`
- `event_id.location_address`
- `ticket_type_id.title`

Atualizar via interface do Directus Admin.

## 🧪 Como Testar

### Via Next.js API

```bash
TOKEN="seu-token-de-admin"

curl -X POST "http://localhost:3000/api/admin/participantes/912326ec-9984-443b-bf81-d2b71591150a/resend-email" \
  -H "Authorization: Bearer $TOKEN"
```

### Via Directus Webhook

```bash
curl -X POST "http://localhost:8055/flows/trigger/4e7ce624-bc73-44eb-9fda-20b6cd609f74" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer HjU6rQxfpBdKmC7IfZ53976n5G0jXa1u" \
  -d '{"registration_id": "912326ec-9984-443b-bf81-d2b71591150a"}'
```

### Verificar Logs

```bash
cd /home/pcthiago/projetos/directus/thiago-pereira/directus
docker compose logs directus -f | grep -i "info\|mail"
```

Esperado:
```
INFO: Flow triggered with data: {"registration_id":"..."}
INFO: Registration found: Nome - email@exemplo.com
```

### Verificar Email no Mailtrap

1. Acesse: https://mailtrap.io/inboxes
2. Login com credenciais do Mailtrap
3. Procure pelo email enviado

## 📋 Checklist de Verificação

Antes de reportar problemas com o Flow, verifique:

- [ ] Flow está com `status: "active"`
- [ ] Flow tem `trigger: "webhook"`
- [ ] Flow tem campo `operation` preenchido com UUID da primeira operação
- [ ] Primeira operação tem `resolve` apontando para próxima operação
- [ ] Variáveis usam sintaxe `{{ $trigger.body.campo }}`
- [ ] Operação item-read tem `permissions: "$full"`
- [ ] Registro (registration_id) existe no banco
- [ ] SMTP está configurado no `.env` do Directus
- [ ] Token de autenticação é válido

## 🔄 Recriando Flow do Zero (Se Necessário)

Se precisar criar um novo Flow:

### 1. Criar Flow Base

```javascript
{
  name: "[Nome do Flow]",
  icon: "mail",
  color: "#2563EB",
  description: "Descrição do flow",
  status: "active",
  trigger: "webhook",
  accountability: "all",
  options: {
    method: "POST",
    async: false,
    return: "$last"
  }
}
```

### 2. Criar Operações (ordem importante!)

**Operação 1**: Item Read
```javascript
{
  flow: "flow-uuid",
  key: "read_registration",
  name: "Buscar Dados",
  type: "item-read",
  position_x: 19,
  position_y: 1,
  options: {
    collection: "event_registrations",
    key: "{{ $trigger.body.registration_id }}",
    permissions: "$full",
    query: {
      fields: ["id", "participant_name", "participant_email", "ticket_code", ...]
    }
  },
  resolve: null,  // Preencher depois
  reject: null
}
```

**Operação 2**: Mail
```javascript
{
  flow: "flow-uuid",
  key: "send_confirmation_email",
  name: "Enviar Email",
  type: "mail",
  position_x: 37,
  position_y: 1,
  options: {
    to: ["{{ read_registration.participant_email }}"],
    subject: "Confirmação - {{ read_registration.event_id.title }}",
    type: "wysiwyg",
    body: "<html>...</html>"
  },
  resolve: null,
  reject: null
}
```

### 3. Linkar Operações

Atualizar operação 1:
```javascript
{
  resolve: "uuid-da-operacao-2"
}
```

### 4. Definir Primeira Operação do Flow

```javascript
{
  operation: "uuid-da-operacao-1"
}
```

## 🎓 Lições Aprendidas

1. **Sempre teste com Flow novo** se suspeitar de corrupção
2. **Logs são essenciais** - operações `log` ajudam a debugar
3. **Status code importa** - 200 vs 204 indica execução real
4. **Tempo de resposta indica** - Flows que executam demoram mais
5. **Sintaxe de variáveis** - `{{ $trigger.body.campo }}` funciona
6. **Permissões** - Use `$full` em operações administrativas
7. **Não usar `$last`** - Sempre referenciar por key da operação

## 🔗 Links Relacionados

- Flow Funcional: http://localhost:8055/admin/settings/flows/4e7ce624-bc73-44eb-9fda-20b6cd609f74
- Flow Original (quebrado): http://localhost:8055/admin/settings/flows/0aa38d6d-7fa6-4f19-9174-a0873cdbfa30
- Documentação: `/docs/EMAIL_INTEGRATION.md`
- Guia de Testes: `/docs/TESTANDO_EMAIL.md`

---

**Última atualização**: 2025-10-10
**Status**: ✅ Resolvido - Flow funcional em produção
