# Configurar Domínio Customizado no Railway

Este guia explica como configurar um domínio customizado para seu app Next.js no Railway.

## Domínio Railway Gratuito

Por padrão, o Railway fornece um domínio `*.up.railway.app`.

### Gerar Domínio Railway

```bash
# Via CLI
railway domain

# Ou no Dashboard:
# Settings → Networking → Generate Domain
```

## Domínio Customizado (Próprio)

### Pré-requisitos

- Domínio registrado (ex: GoDaddy, Namecheap, Registro.br)
- Acesso ao painel de DNS do domínio

### Passo 1: Adicionar Domínio no Railway

#### Via CLI

```bash
railway domain add seudominio.com
```

#### Via Dashboard

1. Acesse seu projeto: https://railway.app/project/events-flow
2. Selecione o serviço do frontend
3. Vá em **Settings → Networking**
4. Em **Custom Domains**, clique em **Add Domain**
5. Digite seu domínio (ex: `app.seudominio.com` ou `seudominio.com`)
6. Clique em **Add**

### Passo 2: Configurar DNS

O Railway mostrará os registros DNS que você precisa adicionar. Normalmente é um dos seguintes:

#### Opção A: Subdomínio (Recomendado)

Para `app.seudominio.com`:

```
Tipo: CNAME
Nome: app
Valor: <id-do-projeto>.up.railway.app
TTL: 300 (ou automático)
```

#### Opção B: Root Domain

Para `seudominio.com`:

```
Tipo: A
Nome: @ (ou deixe em branco)
Valor: <IP fornecido pelo Railway>
TTL: 300 (ou automático)

Tipo: AAAA (IPv6)
Nome: @ (ou deixe em branco)
Valor: <IPv6 fornecido pelo Railway>
TTL: 300 (ou automático)
```

**Nota**: Alguns provedores de DNS não suportam CNAME no root domain. Nesse caso, use os registros A/AAAA.

### Passo 3: Verificar Propagação

A propagação de DNS pode levar de alguns minutos a 48 horas, mas geralmente é rápida (5-30 minutos).

```bash
# Verificar status de DNS
nslookup app.seudominio.com

# Ou online:
# https://dnschecker.org
```

### Passo 4: SSL/TLS Automático

O Railway automaticamente provisiona certificados SSL via Let's Encrypt quando:
- O DNS está propagado corretamente
- O domínio aponta para o Railway

Isso pode levar alguns minutos após a propagação do DNS.

### Passo 5: Atualizar Variáveis de Ambiente

```bash
# Atualizar URL do site
railway variables set NEXT_PUBLIC_SITE_URL=https://app.seudominio.com

# Redeploy para aplicar
railway up
```

## Exemplos de Configuração por Provedor

### Cloudflare

```
Type: CNAME
Name: app
Target: seu-projeto.up.railway.app
Proxy status: Proxied (laranja)
TTL: Auto
```

**Importante**: No Cloudflare, você pode manter o proxy ativado (nuvem laranja).

### GoDaddy

```
Type: CNAME
Host: app
Points to: seu-projeto.up.railway.app
TTL: 600 seconds
```

### Registro.br

```
Tipo: CNAME
Nome: app
Dados: seu-projeto.up.railway.app.
TTL: 300
```

**Nota**: Observe o ponto final (`.`) em alguns provedores.

### Namecheap

```
Type: CNAME Record
Host: app
Value: seu-projeto.up.railway.app
TTL: Automatic
```

## Múltiplos Domínios

Você pode adicionar múltiplos domínios para o mesmo serviço:

```bash
railway domain add www.seudominio.com
railway domain add seudominio.com
railway domain add app.seudominio.com
```

## Redirecionamento de Domínios

Para redirecionar `seudominio.com` → `www.seudominio.com`, configure no seu provedor de DNS ou use Next.js middleware.

### Exemplo com Next.js Middleware

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')

  // Redirecionar domínio sem www para www
  if (hostname === 'seudominio.com') {
    return NextResponse.redirect(
      `https://www.seudominio.com${request.nextUrl.pathname}`,
      301
    )
  }

  return NextResponse.next()
}
```

## Atualizar Configurações Relacionadas

Após configurar o domínio customizado:

### 1. Directus CORS

Adicione o novo domínio no Directus:

```bash
# No Railway (serviço do Directus)
CORS_ORIGIN=https://app.seudominio.com,https://seudominio.com
```

### 2. Stripe Webhooks

Atualize os webhooks no Stripe Dashboard:
- `https://app.seudominio.com/api/stripe/webhook`
- `https://app.seudominio.com/api/organizer/stripe/onboarding`

### 3. Next.js Config

Atualize `next.config.ts` se necessário:

```typescript
const ContentSecurityPolicy = `
  frame-ancestors 'self' https://app.seudominio.com ${process.env.NEXT_PUBLIC_DIRECTUS_URL};
`;
```

## Troubleshooting

### Domínio não resolve

```bash
# Verificar configuração de DNS
dig app.seudominio.com

# Verificar se aponta para Railway
nslookup app.seudominio.com
```

### SSL não provisiona

- Aguarde 10-15 minutos após DNS propagar
- Verifique se DNS está configurado corretamente
- Certifique-se que não há conflito de CNAME/A records
- Contate suporte do Railway se persistir

### Erro "Domain already in use"

O domínio já está em uso em outro projeto/serviço do Railway. Remova-o do outro local primeiro.

### Redirect loop

- Desative proxy do Cloudflare temporariamente
- Verifique configurações de SSL no Cloudflare (use "Full" ou "Full (strict)")
- Remova redirecionamentos duplicados

## Remover Domínio

```bash
# Via CLI
railway domain remove app.seudominio.com

# Via Dashboard
# Settings → Networking → Custom Domains → Delete
```

## Recursos

- Railway Docs: https://docs.railway.app/deploy/exposing-your-app
- DNS Checker: https://dnschecker.org
- SSL Checker: https://www.sslshopper.com/ssl-checker.html
