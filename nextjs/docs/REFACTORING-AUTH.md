# 🔐 Refatoração do Sistema de Autenticação - SSR com httpOnly Cookies

**Data de Início:** 05/10/2025
**Objetivo:** Migrar autenticação de Client-Side (localStorage) para Server-Side Rendering (SSR) com httpOnly cookies

---

## 📊 Status Geral

**Progresso Total:** 29/45 tarefas concluídas (64%)
**Fase Atual:** Fase 2 - Migração Gradual ✅ COMPLETA | Reestruturação de Rotas ✅ COMPLETA

### Legenda de Status
- ✅ Concluído
- 🔄 Em Progresso
- ⏸️ Pausado
- ❌ Bloqueado
- ⬜ Pendente

---

## 🎯 Problemas Identificados (Análise Inicial)

### Críticos
- ✅ **Tokens em localStorage** - Vulnerável a XSS attacks
- ✅ **Ausência de middleware** - Proteção de rotas apenas client-side
- ✅ **Arquitetura 100% CSR** - Performance ruim, sem Server Components
- ✅ **Sem diferenciação de roles** - Não valida se usuário é organizador
- ✅ **Nomenclatura confusa** - `(admin)` na verdade é área de usuário comum
- ✅ **Layout organizer sem proteção** - Qualquer usuário logado pode acessar

### Estrutura Atual (Antes)
```
Authentication: Client-Side (localStorage)
Protection: ProtectedRoute component (CSR)
Routes:
  - (public)/ ✓ Área pública
  - (admin)/  ❌ Confusão de nomenclatura
  - organizer/ ❌ Sem proteção de role
```

### Estrutura Implementada (Atual) ✅
```
Authentication: Server-Side (httpOnly cookies)
Protection: Middleware + Server Components
Routes:
  - (public)/         ✓ Área pública + rotas autenticadas de usuários compradores
    ├── eventos/      ✓ Visualização e compra de ingressos
    ├── perfil/       ✓ Perfil do usuário comprador (protegido)
    ├── meus-ingressos/ ✓ Ingressos do usuário (protegido)
    └── blog/         ✓ Conteúdo público
  - /admin/           ✓ Área do organizador (gerenciamento de eventos)
    ├── dashboard/    ✓ Dashboard do organizador
    ├── eventos/      ✓ Gerenciar eventos
    │   ├── novo/     ✓ Criar evento
    │   └── [id]/     ✓ Editar, participantes, inscrições, configurações
    └── configuracoes/ ✓ Configurações do organizador
```

---

## 📋 Checklist de Implementação

## **Fase 1: Fundação SSR** (Sem Quebrar o Sistema Atual)

### 1.1 Criar Helpers de Autenticação Server-Side ✅
- [x] Criar `src/lib/auth/server-auth.ts`
  - [x] Implementar `getServerAuth()`
  - [x] Implementar `requireAuth()`
  - [x] Implementar `requireOrganizer()`
  - [x] Implementar `requireUser()`
  - [x] Implementar `getAuthenticatedServerClient()`
  - [x] Implementar `isAuthenticated()`
- [x] Criar `src/lib/auth/cookies.ts`
  - [x] Implementar `setAuthCookies()`
  - [x] Implementar `updateAccessToken()`
  - [x] Implementar `clearAuthCookies()`
  - [x] Implementar `getAccessToken()`
  - [x] Implementar `getRefreshToken()`
  - [x] Implementar `hasAuthCookies()`
  - [x] Implementar `getTokenExpiration()`
  - [x] Implementar `isTokenExpired()`
- [x] Criar `src/lib/auth/permissions.ts`
  - [x] Implementar `checkIfUserIsOrganizer()`
  - [x] Implementar `hasStripeOnboarding()`
  - [x] Implementar `canReceivePayouts()`
  - [x] Implementar `getUserRoleName()`
  - [x] Implementar objeto `Permissions` com helpers

### 1.2 Modificar API Routes para Usar httpOnly Cookies ✅
- [x] Atualizar `src/app/api/auth/login/route.ts`
  - [x] Remover retorno de tokens no body
  - [x] Adicionar `setAuthCookies()` para access_token e refresh_token
  - [x] Adicionar verificação de role (isOrganizer)
  - [x] Retornar URL de redirect apropriada
- [x] Atualizar `src/app/api/auth/logout/route.ts`
  - [x] Implementar `clearAuthCookies()` para todos os tokens
  - [x] Ler refresh_token do cookie (não do body)
  - [x] Manter invalidação de token no Directus
- [x] Atualizar `src/app/api/auth/refresh/route.ts`
  - [x] Ler refresh_token do cookie
  - [x] Atualizar cookies com novos tokens via `setAuthCookies()`
  - [x] Limpar cookies se refresh falhar
- [ ] Criar `src/app/api/auth/me/route.ts` (nova versão SSR)
  - [ ] Ler token do cookie (não do header)
  - [ ] Retornar dados do usuário + isOrganizer

### 1.3 Implementar Middleware ✅
- [x] Criar `src/middleware.ts`
  - [x] Definir configuração de rotas (publicRoutes, userRoutes, organizerRoutes)
  - [x] Implementar leitura de cookies
  - [x] Implementar validação de token
  - [x] Implementar auto-refresh quando token expira
  - [x] Implementar verificação de role para `/organizer/*`
  - [x] Implementar redirecionamento baseado em role
  - [x] Adicionar headers `x-user-id`, `x-is-organizer` para Server Components
  - [x] Configurar matcher para ignorar `_next/static`, `api`, etc
- [ ] Testar middleware em rotas públicas
- [ ] Testar middleware em rotas protegidas
- [ ] Testar auto-refresh de token

---

## **Fase 2: Migração Gradual (Convivência Híbrida)** ✅ COMPLETA

### 2.1 Reestruturar Route Groups ✅
- [x] Renomear `src/app/(admin)/` → `src/app/(user)/`
  - [x] Mover pasta fisica
  - [x] Atualizar imports nos componentes
  - [x] Atualizar links de navegação
- [x] Criar novo route group `src/app/(organizer)/`
  - [x] Criar `(organizer)/layout.tsx`
  - [x] Copiar `dashboard/`, `events/`, `settings/` do organizer antigo
- [x] Migrar conteúdo de `src/app/organizer/` → `src/app/(organizer)/`
  - [x] Copiar componentes
  - [x] Manter pasta antiga temporariamente (para compatibilidade)

### 2.2 Converter Layouts para Server Components ✅
- [x] Atualizar `src/app/(user)/layout.tsx`
  - [x] Remover `'use client'`
  - [x] Remover `ProtectedRoute` wrapper
  - [x] Adicionar `requireUser()` no topo (valida e redireciona organizers)
  - [x] Buscar dados do usuário SSR
  - [x] Passar user como prop para componentes
- [x] Atualizar `src/app/(organizer)/layout.tsx`
  - [x] Implementar `requireOrganizer()` no topo
  - [x] Buscar dados do organizador SSR
  - [x] Passar dados para componentes de navegação

### 2.3 Atualizar Componentes de Navegação ✅
- [x] Atualizar `AdminSidebar.tsx`
  - [x] Remover dependência de `useAuth()`
  - [x] Receber `user` como prop
  - [x] Implementar logout via API route
  - [x] Atualizar menu items (Dashboard, Meus Ingressos, Perfil)
- [x] Atualizar `AdminHeader.tsx`
  - [x] Remover dependência de `useAuth()`
  - [x] Receber `user` como prop
- [x] Criar `OrganizerNavigation.tsx`
  - [x] Menu de navegação para área do organizador
  - [x] Indicador de status Stripe
  - [x] Botão de logout
  - [x] Active state nos links

### 2.4 Atualizar Página de Login ✅
- [x] Remover dependência de `useAuth()`
- [x] Fazer login via API route diretamente
- [x] Usar redirect URL retornada pela API (baseada em role)
- [x] Usar `window.location.href` para redirect (força reload e SSR)

---

## **Fase 2.5: Reestruturação de Rotas** ✅ COMPLETA

### 2.5.1 Reorganizar Estrutura de Rotas ✅
- [x] Criar `/admin/` para gerenciamento de eventos (organizadores)
  - [x] Criar `/admin/layout.tsx` com `requireOrganizer()`
  - [x] Criar `/admin/page.tsx` (redirect para dashboard)
  - [x] Criar `/admin/page.tsx`
  - [x] Criar `/admin/eventos/page.tsx` (lista de eventos)
  - [x] Criar `/admin/configuracoes/page.tsx`
- [x] Mover rotas de gerenciamento de eventos
  - [x] Mover `(user)/admin-eventos/` → `/admin/eventos/`
  - [x] Mover `(user)/admin-eventos/novo/` → `/admin/eventos/novo/`
  - [x] Mover `(user)/admin-eventos/[evento_id]/` → `/admin/eventos/[evento_id]/`
  - [x] Atualizar todas as referências de `/admin-eventos` para `/admin/eventos`
- [x] Mover rotas de usuários compradores para `(public)/`
  - [x] Mover `(user)/meus-ingressos/` → `(public)/meus-ingressos/`
  - [x] Mover `(user)/perfil/` → `(public)/perfil/`

### 2.5.2 Atualizar Middleware ✅
- [x] Atualizar configuração de rotas
  - [x] Mudar `ROUTES.organizer` → `ROUTES.admin`
  - [x] Atualizar `ROUTES.user` para rotas autenticadas de compradores
  - [x] Remover lógica de redirect de organizadores em rotas de usuário
- [x] Atualizar lógica de proteção
  - [x] `/admin/*` requer role de organizador
  - [x] `/perfil` e `/meus-ingressos` acessíveis a todos autenticados

### 2.5.3 Atualizar Componentes e API ✅
- [x] Atualizar `OrganizerNavigation.tsx`
  - [x] Mudar links de `/organizer/dashboard` → `/admin/dashboard`
  - [x] Mudar links de `/organizer/events` → `/admin/eventos`
  - [x] Mudar links de `/organizer/settings` → `/admin/configuracoes`
- [x] Atualizar API de login
  - [x] Mudar redirect de organizador: `/organizer/dashboard` → `/admin`
  - [x] Mudar redirect de usuário: `/dashboard` → `/perfil`
- [x] Limpar rotas antigas
  - [x] Remover pasta `(user)/`
  - [x] Remover pasta `organizer/`

---

## **Fase 3: Deprecação do Sistema Client-Side**

### 3.1 Remover AuthContext e localStorage
- [ ] Criar `src/hooks/useServerAuth.ts` (alternativa client-side)
  - [ ] Hook que faz fetch para `/api/auth/me`
  - [ ] Apenas para componentes que precisam de reatividade
- [ ] Atualizar `src/app/login/page.tsx`
  - [ ] Remover uso de `useAuth()`
  - [ ] Fazer POST direto para `/api/auth/login`
  - [ ] Redirecionar baseado em response.redirect
- [ ] Remover `src/contexts/AuthContext.tsx`
- [ ] Remover `AuthProvider` de `src/app/layout.tsx`
- [ ] Remover `src/components/auth/ProtectedRoute.tsx`

### 3.2 Atualizar Componentes que Usavam useAuth()
- [ ] Listar todos os arquivos que importam `useAuth`
- [ ] Refatorar cada componente:
  - [ ] Se Server Component: usar `getServerAuth()`
  - [ ] Se Client Component: usar `useServerAuth()` ou receber props do pai
- [ ] Remover todas as referências a localStorage

### 3.3 Otimizar com Suspense e Loading States
- [ ] Adicionar `loading.tsx` em rotas principais
  - [ ] `(user)/loading.tsx`
  - [ ] `(organizer)/loading.tsx`
  - [ ] `(organizer)/eventos/loading.tsx`
- [ ] Implementar Suspense boundaries onde apropriado
- [ ] Adicionar error.tsx para tratamento de erros

---

## **Fase 4: Refinamento e Testes**

### 4.1 Implementar Recursos Avançados
- [ ] Auto-refresh de token em background (middleware)
- [ ] Remember me (cookie de longa duração opcional)
- [ ] Rate limiting no login
- [ ] CSRF protection adicional
- [ ] Logs de auditoria de login/logout

### 4.2 Melhorar UX
- [ ] Animações de transição entre rotas
- [ ] Feedback visual de carregamento
- [ ] Mensagens de erro amigáveis
- [ ] Toast notifications para logout
- [ ] Confirmação de logout

### 4.3 Testes
- [ ] Testar fluxo completo de login
- [ ] Testar expiração e refresh de token
- [ ] Testar proteção de rotas (user tentando acessar organizer)
- [ ] Testar logout
- [ ] Testar navegação entre áreas
- [ ] Testar com JavaScript desabilitado (progressive enhancement)
- [ ] Testar em diferentes navegadores
- [ ] Teste de performance (comparar antes/depois)

### 4.4 Documentação
- [ ] Atualizar README.md com novo fluxo de autenticação
- [ ] Documentar helpers de auth em CLAUDE.md
- [ ] Adicionar comentários JSDoc nos helpers
- [ ] Criar diagrama de fluxo de autenticação
- [ ] Documentar variáveis de ambiente necessárias

---

## 📈 Métricas de Sucesso

### Performance
- [ ] Reduzir tempo de carregamento inicial em rotas protegidas (meta: -40%)
- [ ] Eliminar flash de conteúdo não autenticado
- [ ] Reduzir número de requisições na autenticação inicial (de 3 para 1)

### Segurança
- [ ] ✅ Tokens não acessíveis via JavaScript (httpOnly)
- [ ] ✅ Proteção contra XSS
- [ ] ✅ Proteção contra CSRF (sameSite cookies)
- [ ] ✅ Validação de roles server-side

### Developer Experience
- [ ] ✅ API consistente para autenticação SSR
- [ ] ✅ TypeScript types para auth helpers
- [ ] ✅ Documentação clara e atualizada

---

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebrar login existente durante migração | Média | Alto | Manter sistema dual (cookies + localStorage) durante transição |
| Usuários logados perderem sessão | Alta | Médio | Comunicar manutenção programada, forçar re-login |
| Problemas de CORS com cookies | Baixa | Alto | Configurar corretamente sameSite e secure flags |
| Performance pior em Server Components | Baixa | Médio | Implementar caching adequado, usar Suspense |
| Middleware muito pesado | Média | Alto | Otimizar queries, cachear verificação de role |

---

## 🔄 Rollback Plan

Caso seja necessário reverter:

1. **Fase 1-2**: Simplesmente não usar os novos helpers (sistema antigo continua funcionando)
2. **Fase 3**:
   - Restaurar `AuthContext.tsx` do git
   - Restaurar `ProtectedRoute.tsx` do git
   - Reverter alterações em API routes
3. **Fase 4**:
   - Deletar `middleware.ts`
   - Reverter modificações em layouts

**Comando de emergência:**
```bash
git revert <commit-range>
# ou
git checkout main -- src/contexts/AuthContext.tsx src/components/auth/ProtectedRoute.tsx
```

---

## 📝 Notas de Implementação

### Decisões Técnicas

**Por que httpOnly cookies ao invés de localStorage?**
- ✅ Imune a XSS (JavaScript não pode acessar)
- ✅ Enviado automaticamente em requests (Server Components)
- ✅ Suporta SSR nativamente
- ✅ Padrão da indústria para tokens sensíveis

**Por que middleware ao invés de apenas getServerSideProps?**
- ✅ Executa antes da renderização (mais rápido)
- ✅ Pode fazer redirect sem renderizar
- ✅ Centraliza lógica de autenticação
- ✅ Funciona com Server Components e Pages Router

**Estrutura de roles:**
- **User comum**: Perfil, meus ingressos, dashboard simples
- **Organizador**: Gerenciar eventos, financeiro, configurações
- **Distinção**: Campo `organizers.user_id` no Directus

### Comandos Úteis Durante Migração

```bash
# Verificar arquivos que usam AuthContext
grep -r "useAuth" nextjs/src --include="*.tsx" --include="*.ts"

# Verificar localStorage
grep -r "localStorage" nextjs/src --include="*.tsx" --include="*.ts"

# Listar todos os componentes client
grep -r "'use client'" nextjs/src --include="*.tsx"

# Testar build após mudanças
cd nextjs && pnpm build

# Gerar types do Directus
cd nextjs && pnpm generate:types
```

---

## ✅ Critérios de Aceitação Final

A refatoração será considerada completa quando:

- [ ] ✅ Nenhum token armazenado em localStorage
- [ ] ✅ Todas as rotas protegidas usam middleware
- [ ] ✅ Layouts e páginas principais são Server Components
- [ ] ✅ Organizadores não conseguem acessar área de usuário comum
- [ ] ✅ Usuários comuns não conseguem acessar área de organizador
- [ ] ✅ Sem flash de conteúdo não autenticado
- [ ] ✅ Build sem erros TypeScript
- [ ] ✅ Todos os testes passando
- [ ] ✅ Performance melhorada (verificado via Lighthouse)
- [ ] ✅ Documentação atualizada

---

**Última Atualização:** 05/10/2025
**Responsável:** Thiago Pereira
**Revisado por:** Claude Code (Assistant)
