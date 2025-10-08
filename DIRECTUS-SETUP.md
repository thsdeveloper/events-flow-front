# Configuração do Directus para Checkout

Este documento descreve como configurar as roles e permissões necessárias para o sistema de checkout funcionar corretamente.

## 1. Role: API Frontend (Checkout Bot)

Esta role é usada para operações automatizadas de checkout e criação de registros via API.

### Criar a Role

1. Acesse o Directus Admin: `http://localhost:8055/admin`
2. Vá em **Settings → Roles & Permissions**
3. Clique em **Create Role**
4. Configure:
   - **Name**: `API Frontend`
   - **Description**: `Role para operações automatizadas de checkout, registro de participantes e integrações frontend`
   - **Icon**: `api` ou `shopping_cart`
   - **Admin Access**: ❌ Não (desabilitado)
   - **App Access**: ❌ Não (desabilitado)

### Configurar Permissões

Para cada collection, configure as seguintes permissões:

#### ✅ **events** (Eventos)
- **Read**: ✅ All Access (necessário para validar eventos durante checkout)
- **Create**: ❌
- **Update**: ❌
- **Delete**: ❌

#### ✅ **event_tickets** (Tipos de Ingressos)
- **Read**: ✅ All Access (necessário para validar tickets durante checkout)
- **Create**: ❌
- **Update**: ❌
- **Delete**: ❌

#### ✅ **event_registrations** (Inscrições/Registros)
- **Read**: ✅ Custom Access (filtro: `user_id._eq.$CURRENT_USER` - apenas registros do próprio usuário)
- **Create**: ✅ All Access (necessário para criar registros de checkout)
- **Update**: ✅ Custom Access (filtro: `user_id._eq.$CURRENT_USER` OR `status._eq.pending`)
- **Delete**: ❌

#### ✅ **event_configurations** (Configurações de Taxas)
- **Read**: ✅ All Access (necessário para calcular taxas no checkout)
- **Create**: ❌
- **Update**: ❌
- **Delete**: ❌

#### ✅ **organizers** (Organizadores)
- **Read**: ✅ Custom Access (filtro: `stripe_onboarding_complete._eq.true`)
- **Create**: ❌
- **Update**: ❌
- **Delete**: ❌

#### ✅ **directus_users** (Usuários)
- **Read**: ✅ Custom Access (filtro: `id._eq.$CURRENT_USER`)
- **Create**: ❌
- **Update**: ✅ Custom Access (filtro: `id._eq.$CURRENT_USER`)
- **Delete**: ❌

#### ✅ **directus_files** (Arquivos)
- **Read**: ✅ All Access (necessário para imagens de eventos)
- **Create**: ❌
- **Update**: ❌
- **Delete**: ❌

### Permissões de Campos Sensíveis

Para a collection `event_registrations`, **ocultar campos sensíveis** da API:

**Campos Read-Only (apenas leitura):**
- `payment_status`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `ticket_code`
- `checked_in_at`

**Campos Write-Only no Create:**
- `participant_name` ✅
- `participant_email` ✅
- `participant_phone` ✅
- `participant_document` ✅
- `event_id` ✅
- `ticket_type_id` ✅
- `quantity` ✅
- `unit_price` ✅
- `service_fee` ✅
- `total_amount` ✅
- `payment_amount` ✅
- `payment_method` ✅

## 2. Criar Usuário API Frontend

1. Vá em **User Directory → Create User**
2. Configure:
   - **First Name**: `API`
   - **Last Name**: `Frontend`
   - **Email**: `api-frontend@localhost` (ou seu domínio)
   - **Password**: Gere uma senha forte e segura
   - **Role**: Selecione `API Frontend` (criada no passo anterior)
   - **Status**: Active

3. **Importante**: Anote o email e senha, você vai precisar deles

## 3. Gerar Token Estático

Existem duas formas de gerar o token:

### Opção A: Via API (Recomendado)

Execute no terminal:

```bash
curl -X POST http://localhost:8055/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-frontend@localhost",
    "password": "SUA_SENHA_AQUI"
  }'
```

Resposta:
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "expires": 900000
  }
}
```

**Use o `access_token` no próximo passo.**

### Opção B: Via Static Token (Mais seguro)

1. No Directus Admin, vá no usuário `API Frontend`
2. Role até **Admin Options**
3. Clique em **Generate Token**
4. Copie o token gerado

## 4. Configurar Variáveis de Ambiente

Adicione no arquivo `nextjs/.env`:

```bash
# Token para operações de checkout e formulários
DIRECTUS_FORM_TOKEN="seu_token_gerado_aqui"
```

**Exemplo:**
```bash
DIRECTUS_FORM_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQiLCJyb2xlIjoiYXBpLWZyb250ZW5kIiwiaWF0IjoxNjk..."
```

## 5. Reiniciar Aplicação

```bash
cd nextjs
npm run dev
```

## 6. Testar Configuração

Execute o teste de configuração:

```bash
curl http://localhost:3001/api/event-config
```

Resposta esperada:
```json
{
  "platformFeePercentage": 4.99,
  "stripePercentageFee": 4.35,
  "stripeFixedFee": 0.39
}
```

## Troubleshooting

### ❌ "Configuração de taxas não encontrada"

**Causa**: Role `API Frontend` não tem permissão de leitura em `event_configurations`

**Solução**:
1. Vá em Settings → Roles & Permissions → API Frontend
2. Encontre `event_configurations`
3. Habilite **Read** com All Access

### ❌ "Not authenticated" ou 401

**Causa**: Token inválido ou expirado

**Solução**:
1. Gere um novo token seguindo o passo 3
2. Atualize o `.env` com o novo token
3. Reinicie o servidor Next.js

### ❌ "You don't have permission to create"

**Causa**: Role não tem permissão de Create na collection

**Solução**:
1. Verifique as permissões da role `API Frontend`
2. Habilite **Create** com All Access para `event_registrations`

## Segurança

### ⚠️ Boas Práticas

1. **Nunca commite o token** no Git
2. **Use .env.local** para desenvolvimento local
3. **Rotacione tokens** periodicamente em produção
4. **Monitore uso** do token nos logs do Directus
5. **Limite permissões** ao mínimo necessário (princípio do menor privilégio)

### 🔒 Produção

Em produção, use variáveis de ambiente secretas:

**Vercel:**
```bash
vercel env add DIRECTUS_FORM_TOKEN
```

**Netlify:**
```bash
netlify env:set DIRECTUS_FORM_TOKEN "seu_token_aqui"
```

**Docker:**
```bash
docker run -e DIRECTUS_FORM_TOKEN="..." ...
```

## Resumo de Configuração

- ✅ Role criada: `API Frontend`
- ✅ Usuário criado: `api-frontend@localhost`
- ✅ Token gerado e configurado em `.env`
- ✅ Permissões configuradas para 7 collections
- ✅ Aplicação reiniciada
- ✅ Teste de configuração passou

---

**Última atualização**: 2025-01-06
**Versão do Directus**: 10.x
**Versão do Next.js**: 15.x
