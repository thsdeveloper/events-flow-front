# Implementação Completa de Tratamento de Erros RFC 7807

Sistema completo de tratamento de erros padronizado para Next.js 14+ com Directus e shadcn/ui.

## 📁 Arquivos Criados

### 1. Core - Sistema de Erros
- **`src/lib/errors.ts`** - Classe `AppError`, mapeamento Directus, helpers
- **`src/lib/api.ts`** - Wrapper `withApi` para API Routes
- **`src/lib/http.ts`** - Cliente `apiFetch` SSR-safe com HttpError
- **`src/middleware.ts`** - Geração e propagação de `x-request-id`

### 2. Client - Toast e UX
- **`src/lib/toast-problem.ts`** - Apresentação de erros via toast
- **`src/lib/http-client.ts`** - Cliente com toast automático

### 3. Exemplos
- **`src/app/api/examples/users/route.ts`** - GET/POST com validação
- **`src/app/api/examples/users/[id]/route.ts`** - GET/PUT/DELETE por ID
- **`src/app/examples/error-handling/page.tsx`** - Componente client demonstrativo
- **`src/app/examples/error-handling/error.tsx`** - Error boundary com toast

## 🚀 Como Usar

### 1. Configurar Toast Global (OBRIGATÓRIO)

No layout root da aplicação:

```tsx
// app/layout.tsx
'use client'

import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { configureToast } from '@/lib/http-client'

export default function RootLayout({ children }) {
  const { toast } = useToast()

  useEffect(() => {
    configureToast(toast, {
      // Opcional: códigos que não devem mostrar toast
      suppressCodes: ['SILENT_ERROR'],
      // Opcional: mostrar requestId
      includeRequestId: process.env.NODE_ENV === 'development'
    })
  }, [toast])

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### 2. API Routes (Backend)

#### Exemplo Básico com Directus

```ts
// app/api/posts/route.ts
import { NextRequest } from 'next/server'
import { readItems } from '@directus/sdk'
import { withApi } from '@/lib/api'
import { fromDirectusError } from '@/lib/errors'
import { getDirectusClient } from '@/lib/directus/directus'

export const GET = withApi(async (request: NextRequest) => {
  try {
    const client = getDirectusClient()
    const posts = await client.request(readItems('posts'))

    return Response.json(posts)
  } catch (error) {
    // Converte erro do Directus para AppError (RFC 7807)
    throw fromDirectusError(error, request.headers.get('x-request-id') || undefined)
  }
})
```

#### Com Validação Zod

```ts
import { z } from 'zod'
import { withApi, validateBody } from '@/lib/api'

const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  status: z.enum(['draft', 'published'])
})

export const POST = withApi(async (request) => {
  // Valida body (lança AppError 422 se inválido)
  const body = await validateBody(request, createPostSchema)

  // Usa body validado...
  const post = await createPost(body)
  return Response.json(post, { status: 201 })
})
```

#### Com Query Params

```ts
import { z } from 'zod'
import { withApi, validateQuery } from '@/lib/api'

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional()
})

export const GET = withApi(async (request) => {
  const query = validateQuery(request, listQuerySchema)

  const posts = await getPosts({
    offset: (query.page - 1) * query.limit,
    limit: query.limit,
    search: query.search
  })

  return Response.json(posts)
})
```

### 3. Client Components (Frontend)

#### Toast Automático (Recomendado)

```tsx
'use client'

import { httpClient } from '@/lib/http-client'
import { Button } from '@/components/ui/button'

function MyComponent() {
  async function handleSubmit() {
    try {
      // Toast é mostrado automaticamente em caso de erro
      const result = await httpClient.post('/api/posts', {
        title: 'Novo Post',
        content: 'Conteúdo...'
      })

      // Sucesso - sem toast
      console.log('Post criado:', result)
    } catch (error) {
      // Erro já foi exibido via toast
      // Opcional: lógica adicional aqui
    }
  }

  return <Button onClick={handleSubmit}>Criar Post</Button>
}
```

#### Sem Toast (Manual)

```tsx
import { httpClient } from '@/lib/http-client'

async function handleDelete() {
  try {
    await httpClient.delete(`/api/posts/${id}`, {
      toastOnError: false // Desabilita toast
    })

    // Trata sucesso
    router.push('/posts')
  } catch (error) {
    // Trata erro manualmente
    console.error('Erro ao deletar:', error)
  }
}
```

#### Toast Customizado

```tsx
await httpClient.get('/api/posts/123', {
  toastOptions: {
    suppressCodes: ['NOT_FOUND'], // Não mostra toast para 404
    duration: 3000,
    onAction: () => router.push('/login') // Ação customizada
  }
})
```

#### Usar apiFetch Direto (sem toast)

```tsx
import { apiFetch } from '@/lib/http'
import { useToast } from '@/hooks/use-toast'
import { presentProblemToast } from '@/lib/toast-problem'

function MyComponent() {
  const { toast } = useToast()

  async function handleSubmit() {
    try {
      const result = await apiFetch('/api/posts', {
        method: 'POST',
        body: data
      })
    } catch (error) {
      // Customiza completamente como mostrar o erro
      presentProblemToast(toast, error, {
        suppressCodes: ['VALIDATION_ERROR'],
        includeRequestId: true
      })
    }
  }
}
```

## 📊 Códigos de Erro Mapeados

### Directus (automático via `fromDirectusError`)

| Código               | Status | Mensagem Toast                           |
| -------------------- | ------ | ---------------------------------------- |
| FAILED_VALIDATION    | 400    | Validação falhou                         |
| INVALID_CREDENTIALS  | 401    | Credenciais inválidas                    |
| TOKEN_EXPIRED        | 401    | Sessão expirada. Faça login novamente   |
| FORBIDDEN            | 403    | Acesso negado                            |
| ROUTE_NOT_FOUND      | 404    | Não encontrado                           |
| UNPROCESSABLE_CONTENT| 422    | Dados inválidos (lista erros)            |
| REQUESTS_EXCEEDED    | 429    | Muitas requisições. Tente mais tarde     |
| SERVICE_UNAVAILABLE  | 503    | Serviço indisponível                     |

### Customizados (use helpers do `errors.ts`)

```ts
import {
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createRateLimitError
} from '@/lib/errors'

// Exemplo: validação customizada
throw createValidationError({
  email: ['Email já existe'],
  password: ['Senha muito curta', 'Deve conter números']
})

// Exemplo: não encontrado
throw createNotFoundError('Post', requestId)

// Exemplo: rate limit com retry
throw createRateLimitError(60, requestId) // retry em 60s
```

## 🎨 Mensagens de Toast (PT-BR)

### Tipos de Toast com Ícones e Cores

O sistema de toast suporta 4 variantes visuais:

| Variante      | Cor        | Ícone          | Uso                           |
| ------------- | ---------- | -------------- | ----------------------------- |
| `success`     | Verde      | CheckCircle2   | Operações bem-sucedidas       |
| `destructive` | Vermelho   | XCircle        | Erros e falhas                |
| `warning`     | Amarelo    | AlertCircle    | Avisos e atenções             |
| `info`        | Azul       | Info           | Informações gerais            |

#### Usando Toast de Sucesso

```tsx
import { toastSuccess } from '@/lib/toast-helpers'

// Exemplo: após criar um post
toastSuccess({
  title: 'Post criado!',
  description: 'Seu post foi publicado com sucesso.',
  duration: 3000
})
```

#### Usando Toast de Warning

```tsx
import { toastWarning } from '@/lib/toast-helpers'

toastWarning({
  title: 'Atenção',
  description: 'Você tem alterações não salvas.'
})
```

#### Usando Toast de Info

```tsx
import { toastInfo } from '@/lib/toast-helpers'

toastInfo({
  title: 'Dica',
  description: 'Você pode usar atalhos de teclado para navegar.'
})
```

### Mensagens Automáticas de Erro

Os erros HTTP são automaticamente convertidos em toasts vermelhos com ícone de erro:

### 401 - Sessão Expirada
- **Cor:** Vermelho
- **Ícone:** XCircle
- **Título:** "Sessão expirada"
- **Descrição:** "Sua sessão expirou. Faça login novamente para continuar."

### 403 - Acesso Negado
- **Cor:** Vermelho
- **Ícone:** XCircle
- **Título:** "Acesso negado"
- **Descrição:** "Você não tem permissão para realizar esta ação."

### 404 - Não Encontrado
- **Cor:** Vermelho
- **Ícone:** XCircle
- **Título:** "Não encontrado"
- **Descrição:** "O recurso solicitado não foi encontrado."

### 422 - Validação
- **Cor:** Vermelho
- **Ícone:** XCircle
- **Título:** "Dados inválidos"
- **Descrição:** Lista formatada dos erros:
  ```
  Os seguintes campos possuem erros:
  • Email: Email inválido, Email já existe
  • Senha: Senha muito curta
  ```

### 429 - Rate Limit
- **Cor:** Vermelho
- **Ícone:** XCircle
- **Título:** "Muitas requisições"
- **Descrição:** "Você está fazendo muitas requisições. Tente novamente em X segundos."

### 500+ - Erro de Servidor
- **Cor:** Vermelho
- **Ícone:** XCircle
- **Título:** "Erro no servidor"
- **Descrição:** "Ocorreu um erro no servidor. Tente novamente mais tarde."

### 0 - Erro de Rede
- **Cor:** Vermelho
- **Ícone:** XCircle
- **Título:** "Erro de conexão"
- **Descrição:** "Não foi possível conectar ao servidor. Verifique sua conexão."

## 🔧 Casos de Uso Avançados

### 1. Cliente HTTP Customizado

Crie clientes especializados com configuração pré-definida:

```ts
// lib/cms-client.ts
import { createHttpClient } from '@/lib/http-client'

export const cmsClient = createHttpClient('/api/cms', {
  toastOnError: true,
  toastOptions: {
    suppressCodes: ['NOT_FOUND'] // CMS não mostra 404
  },
  headers: {
    'X-CMS-Version': '1.0'
  }
})

// Uso
const posts = await cmsClient.get<Post[]>('/posts')
const post = await cmsClient.post<Post>('/posts', newPost)
```

### 2. Hooks Before/After em API Routes

```ts
export const POST = withApi(
  async (request) => {
    // Handler principal
    const user = await createUser(data)
    return Response.json(user)
  },
  {
    // Executado antes do handler
    before: async (request) => {
      // Exemplo: verificar autenticação
      const token = request.headers.get('authorization')
      if (!token) throw createUnauthorizedError()
    },

    // Executado após sucesso
    after: async (response) => {
      // Exemplo: adicionar headers customizados
      response.headers.set('X-Custom', 'value')
      return response
    },

    // Executado quando erro ocorre
    onError: async (error, request) => {
      // Exemplo: log para serviço externo
      await logError(error, request)
    }
  }
)
```

### 3. Error Boundary com Toast

```tsx
// app/error.tsx
'use client'

import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { presentProblemToast } from '@/lib/toast-problem'

export default function Error({ error, reset }) {
  const { toast } = useToast()

  useEffect(() => {
    // Mostra toast para erro não capturado
    presentProblemToast(toast, error)
  }, [error, toast])

  return (
    <div>
      <h2>Algo deu errado!</h2>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  )
}
```

## 🔐 Segurança

### Produção vs Desenvolvimento

```ts
// Stack trace APENAS em desenvolvimento
const problem = appError.toProblem({
  includeStack: process.env.NODE_ENV === 'development'
})

// RequestId APENAS em desenvolvimento no toast
presentProblemToast(toast, error, {
  includeRequestId: process.env.NODE_ENV === 'development'
})
```

### Sanitização Automática

O sistema já protege contra vazamento de informações:

- ✅ Stack trace nunca vaza em produção
- ✅ Mensagens de erro são genéricas por padrão
- ✅ Contexto sensível não é exposto
- ✅ Request ID permite rastreamento sem expor detalhes

## 📝 Exemplo de Fluxo Completo

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ POST /api/users
       │ { email: "invalid" }
       ▼
┌─────────────────┐
│   Middleware    │ ◄── Gera requestId: "abc-123"
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  API Route      │
│  withApi(...)   │
└──────┬──────────┘
       │ validateBody(schema)
       │ ▼ ERRO: email inválido
       │
       │ throw AppError({
       │   status: 422,
       │   code: 'VALIDATION_ERROR',
       │   context: { errors: {...} },
       │   requestId: "abc-123"
       │ })
       ▼
┌─────────────────┐
│   withApi       │ ◄── Captura erro
│                 │     toProblem()
└──────┬──────────┘
       │
       │ Response 422
       │ Content-Type: application/problem+json
       │ x-request-id: abc-123
       │
       │ {
       │   "type": "https://api.errors/validation_error",
       │   "title": "Entidade não processável",
       │   "status": 422,
       │   "detail": "Validação falhou",
       │   "requestId": "abc-123",
       │   "context": {
       │     "errors": { "email": ["Email inválido"] }
       │   }
       │ }
       ▼
┌─────────────────┐
│  apiFetch       │ ◄── Parseia Problem Details
│                 │     throw HttpError
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  httpClient     │ ◄── Captura HttpError
│                 │     presentProblemToast()
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│     Toast       │ ◄── Mostra ao usuário
│                 │
│  📛 Dados inválidos
│  Os seguintes campos possuem erros:
│  • Email: Email inválido
│
│  ID: abc-123
└─────────────────┘
```

## ✅ Checklist de Implementação

- [x] Criar `lib/errors.ts` com AppError
- [x] Criar `lib/api.ts` com withApi (Edge Runtime compatible)
- [x] Atualizar `middleware.ts` com requestId (Edge Runtime compatible)
- [x] Criar `lib/http.ts` com apiFetch
- [x] Criar `lib/toast-problem.ts`
- [x] Criar `lib/http-client.ts`
- [ ] Configurar toast no layout root
- [ ] Migrar API routes para usar withApi
- [ ] Migrar componentes para usar httpClient
- [ ] Testar todos os cenários de erro

## 🔧 Compatibilidade Edge Runtime

A implementação usa `crypto.randomUUID()` da Web Crypto API (disponível globalmente) em vez de `randomUUID` do módulo `crypto` do Node.js. Isso garante compatibilidade com:

- ✅ Next.js Middleware (Edge Runtime)
- ✅ API Routes (Node.js Runtime)
- ✅ Edge Functions (Vercel, Netlify, etc)
- ✅ Server Components

## 🎯 Próximos Passos

1. **Configure o toast global** no `app/layout.tsx`
2. **Teste os exemplos** acessando `/examples/error-handling`
3. **Migre suas API routes** para usar `withApi`
4. **Migre seus componentes** para usar `httpClient`
5. **Customize mensagens** de erro conforme sua necessidade

## 📚 Referências

- [RFC 7807 - Problem Details](https://datatracker.ietf.org/doc/html/rfc7807)
- [Directus Error Codes](https://docs.directus.io/reference/error-codes.html)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [shadcn/ui Toast](https://ui.shadcn.com/docs/components/toast)
