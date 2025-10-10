# 🧪 Testando o Envio de Email

## ✅ Status Atual

O Flow de email está **funcionando** e configurado para enviar emails via **Mailtrap** (servidor de testes).

### Configuração SMTP Atual

```env
EMAIL_TRANSPORT=smtp
EMAIL_SMTP_HOST=sandbox.smtp.mailtrap.io
EMAIL_SMTP_PORT=2525
EMAIL_SMTP_USER=68664c11adc1c7
EMAIL_SMTP_PASSWORD=eed79771ef0d07
EMAIL_FROM=noreply@yourdomain.com
```

---

## 📬 Onde Verificar os Emails Enviados

### **Mailtrap Inbox**

1. Acesse: https://mailtrap.io/inboxes
2. Faça login com as credenciais do Mailtrap
3. Todos os emails enviados aparecem lá (não são enviados para destinatários reais)

**Vantagens do Mailtrap:**
- ✅ Perfeito para desenvolvimento/testes
- ✅ Não envia emails reais (seguro)
- ✅ Visualiza HTML renderizado
- ✅ Verifica spam score
- ✅ Analisa headers

---

## 🧪 Como Testar

### **Opção 1: Via Interface Admin do Next.js** (Recomendado)

1. Inicie o servidor Next.js:
   ```bash
   cd /home/pcthiago/projetos/directus/thiago-pereira/nextjs
   pnpm dev
   ```

2. Acesse: http://localhost:3000/admin/participantes

3. Faça login como organizador

4. Clique no menu (⋮) de qualquer participante

5. Selecione **"Reenviar email"**

6. Confirme o envio

7. Verifique no **Mailtrap Inbox**

---

### **Opção 2: Via Directus Admin** (Teste Direto)

1. Acesse: http://localhost:8055/admin

2. Vá em **Settings → Flows**

3. Clique no flow: `[Participantes] Reenviar Email de Confirmação`

4. No canto superior direito, clique em **"Run Flow"** ⚡

5. Insira o payload de teste:
   ```json
   {
     "registration_id": "912326ec-9984-443b-bf81-d2b71591150a"
   }
   ```

6. Clique em **"Run"**

7. Verifique o **Activity Log** do flow para ver se executou

8. Confira o email no **Mailtrap Inbox**

---

### **Opção 3: Via cURL** (Teste Técnico)

```bash
curl -X POST "http://localhost:8055/flows/trigger/0aa38d6d-7fa6-4f19-9174-a0873cdbfa30" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_id": "912326ec-9984-443b-bf81-d2b71591150a"
  }'
```

**Resposta esperada**: `{}`

Se retornar erro, verifique:
- O Flow ID está correto?
- A inscrição (registration_id) existe?
- O Directus está rodando?

---

### **Opção 4: Via Next.js API Route**

```bash
# Primeiro, pegue um token de autenticação válido
TOKEN="seu-token-aqui"

curl -X POST "http://localhost:3000/api/admin/participantes/912326ec-9984-443b-bf81-d2b71591150a/resend-email" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 Verificando Logs

### **Logs do Directus**

```bash
cd /home/pcthiago/projetos/directus/thiago-pereira/directus
docker compose logs -f directus | grep -i "flow\|email\|mail"
```

**O que procurar:**
- ✅ `POST /flows/trigger/... 200` = Flow executado com sucesso
- ❌ `POST /flows/trigger/... 403` = Permissão negada
- ❌ `POST /flows/trigger/... 500` = Erro interno

### **Logs do Next.js**

```bash
cd /home/pcthiago/projetos/directus/thiago-pereira/nextjs
pnpm dev
```

Procure por:
```
Email sent successfully via Directus Flow: {
  to: 'email@exemplo.com',
  participantName: 'Nome do Participante',
  eventTitle: 'Título do Evento',
  ticketCode: 'CODIGO-123',
  flowId: '0aa38d6d-7fa6-4f19-9174-a0873cdbfa30'
}
```

---

## 📊 Activity Log do Flow

No Directus Admin:

1. **Settings → Flows**
2. Clique no flow `[Participantes] Reenviar Email de Confirmação`
3. Aba **"Activity"** (canto superior direito)

Aqui você vê:
- 📅 Data/hora de cada execução
- 👤 Usuário que executou
- ✅/❌ Status (sucesso/erro)
- 📝 Payload enviado
- 🔍 Detalhes de cada operação

---

## 🐛 Troubleshooting

### Erro: "Couldn't find webhook triggered flow"

**Causa**: O trigger do flow não está configurado como `webhook`

**Solução**:
```javascript
// Já corrigido! O flow está com trigger: "webhook"
// Se o problema persistir, verifique no Directus Admin
```

### Erro: "Invalid registration_id"

**Causa**: O ID da inscrição não existe ou está incorreto

**Solução**: Use um ID válido. Para pegar IDs válidos:

```bash
# Via Directus API
curl "http://localhost:8055/items/event_registrations?limit=5&fields=id,participant_name,participant_email"
```

### Erro: "SMTP connection failed"

**Causa**: Configuração de SMTP incorreta

**Solução**:
1. Verifique as credenciais do Mailtrap
2. Teste a conexão:
   ```bash
   docker compose exec directus env | grep EMAIL
   ```

### Email não aparece no Mailtrap

**Possíveis causas:**

1. **Credenciais erradas**: Verifique se o `EMAIL_SMTP_USER` e `EMAIL_SMTP_PASSWORD` estão corretos

2. **Inbox errado**: Certifique-se de estar olhando o inbox correto no Mailtrap

3. **Flow não executou**: Verifique o Activity Log do flow

4. **Operação de email falhou**: Verifique os logs do Directus

---

## 🚀 Exemplo de Email Enviado

Quando o flow executa com sucesso, o participante recebe um email assim:

```
Assunto: Confirmação de Inscrição - [Nome do Evento]

Corpo:
┌─────────────────────────────────────────┐
│                                         │
│  Olá, [Nome do Participante]!           │
│                                         │
│  Sua inscrição para o evento           │
│  [Nome do Evento] foi confirmada        │
│  com sucesso!                           │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  🎫 Detalhes da Inscrição               │
│                                         │
│  • Evento: [Nome do Evento]             │
│  • Data: [Data do Evento]               │
│  • Local: [Local do Evento]             │
│  • Ingresso: [Tipo de Ingresso]        │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  🔑 Código do Ingresso                  │
│                                         │
│     [CODIGO-UNICO-123]                  │
│                                         │
│  Guarde este código para realizar o    │
│  check-in no evento.                    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Nos vemos em breve!                    │
│                                         │
└─────────────────────────────────────────┘

Este é um email automático. Por favor, não responda.
```

---

## 📝 Próximos Passos

### Para Desenvolvimento

✅ Continuar usando Mailtrap
- Seguro (não envia emails reais)
- Rápido para testar
- Visualiza HTML renderizado

### Para Produção

Alterar para provedor real:

**Opção 1: SendGrid** (Recomendado)
```env
EMAIL_TRANSPORT=smtp
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASSWORD=SG.xxxxx
EMAIL_FROM=noreply@seudominio.com
```

**Opção 2: Resend** (Moderno)
```env
EMAIL_TRANSPORT=smtp
EMAIL_SMTP_HOST=smtp.resend.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=resend
EMAIL_SMTP_PASSWORD=re_xxxxx
EMAIL_FROM=noreply@seudominio.com
```

**Opção 3: AWS SES** (Escalável)
```env
EMAIL_TRANSPORT=smtp
EMAIL_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=AKIA...
EMAIL_SMTP_PASSWORD=xxxxx
EMAIL_FROM=noreply@seudominio.com
```

---

## 📚 Links Úteis

- **Mailtrap**: https://mailtrap.io/inboxes
- **Directus Flows**: http://localhost:8055/admin/settings/flows
- **Activity Log**: http://localhost:8055/admin/settings/flows/0aa38d6d-7fa6-4f19-9174-a0873cdbfa30
- **Documentação**: `/docs/EMAIL_INTEGRATION.md`

---

**Última atualização**: 2025-10-10
