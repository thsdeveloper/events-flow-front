# Estrutura de Área Administrativa

## Visão Geral

Este projeto possui uma área administrativa separada da área pública, organizada usando Route Groups do Next.js 15.

## Estrutura de Pastas

```
src/app/
├── (public)/                    # Área pública
│   ├── layout.tsx              # Layout público com header/footer
│   ├── [[...permalink]]/       # Páginas dinâmicas do CMS
│   ├── blog/                   # Blog posts
│   └── eventos/                # Listagem pública de eventos
│
├── (admin)/                     # Área administrativa (requer autenticação)
│   ├── layout.tsx              # Layout admin com sidebar
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard principal
│   ├── eventos/
│   │   ├── page.tsx            # Lista de eventos do organizador
│   │   ├── novo/
│   │   │   └── page.tsx        # Criar novo evento
│   │   └── [id]/
│   │       ├── page.tsx        # Detalhes do evento
│   │       ├── participantes/  # Gerenciar participantes
│   │       ├── inscricoes/     # Gerenciar inscrições
│   │       └── configuracoes/  # Configurações do evento
│   └── perfil/
│       └── page.tsx            # Perfil do organizador
│
├── login/
│   └── page.tsx                # Login de organizadores
│
├── register/
│   └── page.tsx                # Registro de novos organizadores
│
├── api/
│   ├── auth/                   # Autenticação
│   │   ├── login/
│   │   ├── logout/
│   │   ├── register/
│   │   ├── refresh/
│   │   └── me/
│   ├── organizer/              # API de organizadores
│   └── user/                   # API de usuários
│
└── layout.tsx                  # Root layout (global)
```

## Autenticação

### Middleware
- `src/middleware.ts` - Protege rotas `/(admin)/*`
- Redireciona usuários não autenticados para `/login`
- Redireciona usuários autenticados de `/login` para `/(admin)/dashboard`
- Usa cookies HTTP-only para segurança

### Fluxo de Autenticação
1. Login → API armazena token em cookie HTTP-only + localStorage
2. Middleware verifica cookie em cada requisição
3. AuthContext gerencia estado do usuário no client-side
4. Logout → Limpa cookies e localStorage, redireciona para `/login`

### Componentes de Autenticação
- `src/contexts/AuthContext.tsx` - Context API para estado de autenticação
- `src/components/admin/AdminSidebar.tsx` - Sidebar com navegação
- `src/components/admin/AdminHeader.tsx` - Header com info do usuário

## Rotas Principais

### Área Pública
- `/` - Home (página dinâmica do CMS)
- `/blog/[slug]` - Post do blog
- `/eventos/[slug]` - Página pública do evento

### Área Administrativa
- `/(admin)/dashboard` - Dashboard do organizador
- `/(admin)/eventos` - Lista de eventos
- `/(admin)/eventos/novo` - Criar evento
- `/(admin)/eventos/[id]` - Detalhes do evento
- `/(admin)/eventos/[id]/participantes` - Gerenciar participantes
- `/(admin)/eventos/[id]/inscricoes` - Gerenciar inscrições
- `/(admin)/eventos/[id]/configuracoes` - Configurações
- `/(admin)/perfil` - Perfil do organizador

### Autenticação
- `/login` - Login de organizadores
- `/register` - Registro de organizadores

## Como Usar

### Desenvolvimento
```bash
cd nextjs
pnpm dev
```

### Acessar Admin
1. Registrar novo organizador em `/register`
2. Fazer login em `/login`
3. Será redirecionado para `/(admin)/dashboard`

### Criar Evento
1. Acessar `/(admin)/eventos`
2. Clicar em "Criar Evento"
3. Preencher formulário
4. Gerenciar participantes, inscrições e configurações

## Segurança

- ✅ Middleware protege todas as rotas admin
- ✅ Cookies HTTP-only para tokens
- ✅ Validação de autenticação em API routes
- ✅ Separação clara entre áreas pública e administrativa
- ✅ Redirecionamento automático baseado em autenticação

## Status da Implementação

✅ **Completo:**
- Estrutura de rotas públicas e administrativas com Route Groups
- Middleware de autenticação com proteção de rotas
- Layout admin com sidebar e header
- Páginas de login e registro
- Dashboard administrativo
- Estrutura de gerenciamento de eventos (lista, criar, detalhes, subpáginas)
- Página de perfil do organizador
- Integração com cookies HTTP-only para segurança
- API routes de autenticação (login, logout, register, refresh, me)

⚠️ **Nota sobre Build:**
Existe um erro de tipo pré-existente em `src/components/blocks/Posts.tsx:67` não relacionado à estrutura admin.
Este erro estava presente antes da implementação da área administrativa.

## Próximos Passos

1. Corrigir erro de tipo em Posts.tsx (não relacionado ao admin)
2. Conectar formulários admin com API do Directus
3. Implementar CRUD completo de eventos
4. Adicionar gerenciamento de participantes e inscrições
5. Implementar upload de imagens
6. Adicionar dashboard com estatísticas reais do Directus
7. Implementar notificações por email
8. Adicionar validação de formulários com Zod
9. Implementar paginação nas listas de eventos/participantes
10. Adicionar filtros e busca avançada
