# Plano de Ação - Implementação Gestão de Participantes

**Feature:** Sistema de Gestão de Participantes
**Documento Base:** [FEATURE_SPEC_PARTICIPANTES.md](./FEATURE_SPEC_PARTICIPANTES.md)
**Data de Criação:** 10 de Janeiro de 2025
**Estimativa Total:** 18-25 horas

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Fases de Implementação](#fases-de-implementação)
4. [Checklist Detalhado](#checklist-detalhado)
5. [Comandos Úteis](#comandos-úteis)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### Objetivos
Implementar página administrativa completa para gestão de participantes dos eventos, incluindo:
- Listagem com TanStack Table
- Filtros inteligentes
- Funcionalidade de check-in
- Página de detalhes
- Exportação CSV

### Estrutura de Entregas

```
Sprint 1 (Semana 1): Setup + Listagem Básica
  ├─ Fase 1: Setup e Estrutura (2-3h)
  └─ Fase 2: Listagem Básica (3-4h)

Sprint 2 (Semana 2): Filtros + Check-in
  ├─ Fase 3: Filtros e Busca (4-5h)
  └─ Fase 4: Check-in (2-3h)

Sprint 3 (Semana 3): Detalhes + Finalização
  ├─ Fase 5: Detalhes e Ações (3-4h)
  ├─ Fase 6: Polimento (2-3h)
  └─ Fase 7: Testes (2-3h)
```

---

## ✅ Pré-requisitos

### Conhecimento Técnico
- [ ] Next.js 15 App Router
- [ ] React Server Components
- [ ] TanStack Table v8
- [ ] Directus SDK
- [ ] TypeScript
- [ ] Tailwind CSS
- [ ] Shadcn/UI

### Ambiente de Desenvolvimento
- [ ] Node.js 18+ instalado
- [ ] pnpm instalado
- [ ] Directus rodando localmente (porta 8055)
- [ ] Next.js dev server configurado
- [ ] VS Code com extensões TypeScript

### Acesso e Tokens
- [ ] Usuário com perfil de organizador criado
- [ ] Token de autenticação válido
- [ ] Eventos de teste criados
- [ ] Participantes de teste criados

---

## 🚀 Fases de Implementação

---

## FASE 1: Setup e Estrutura (2-3 horas)

### Objetivos
- Configurar dependências
- Criar estrutura de arquivos
- Definir types TypeScript

### Passo 1.1: Instalar Dependências

**Comandos:**
```bash
cd nextjs
pnpm add @tanstack/react-table@^8.20.5
```

**Verificação:**
```bash
pnpm list @tanstack/react-table
```

**Resultado esperado:**
```
@tanstack/react-table 8.20.5
```

---

### Passo 1.2: Criar Estrutura de Pastas

**Comandos:**
```bash
mkdir -p src/app/admin/participantes/_components
mkdir -p src/app/admin/participantes/_lib
mkdir -p src/app/admin/participantes/\[id\]
```

**Estrutura criada:**
```
src/app/admin/participantes/
├── page.tsx
├── [id]/
│   └── page.tsx
├── _components/
│   └── (arquivos criados nas próximas fases)
└── _lib/
    ├── types.ts
    ├── queries.ts
    ├── utils.ts
    └── export.ts
```

---

### Passo 1.3: Criar Types TypeScript

**Arquivo:** `src/app/admin/participantes/_lib/types.ts`

**Conteúdo:**
```typescript
import type { EventRegistration, Event, EventTicket, DirectusUser } from '@/types/directus-schema';

// Tipo expandido com relações
export interface ParticipantRow extends Omit<EventRegistration, 'event_id' | 'ticket_type_id' | 'user_id'> {
  event_id: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    location_name: string | null;
    organizer_id: string;
  };
  ticket_type_id: {
    id: string;
    title: string;
    price: number;
  } | null;
  user_id: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar: string | null;
  } | null;
}

// Filtros disponíveis
export interface ParticipantFilters {
  search: string;
  eventIds: string[];
  ticketTypeIds: string[];
  registrationStatus: EventRegistration['status'][];
  paymentStatus: EventRegistration['payment_status'][];
  hasCheckedIn: boolean | null;
  checkInDateRange: {
    start: string | null;
    end: string | null;
  };
}

// Estado da tabela
export interface ParticipantTableState {
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
  };
  filters: ParticipantFilters;
}

// Métricas do dashboard
export interface ParticipantMetrics {
  total: number;
  checkedIn: number;
  pending: number;
  checkInRate: number;
}

// Resposta da API
export interface ParticipantsResponse {
  data: ParticipantRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
  metrics: ParticipantMetrics;
}
```

**Verificação:**
```bash
pnpm tsc --noEmit
```

---

### Passo 1.4: Criar Arquivo de Queries

**Arquivo:** `src/app/admin/participantes/_lib/queries.ts`

**Conteúdo:**
```typescript
import { directus } from '@/lib/directus/directus';
import { readItems, readItem, updateItem } from '@directus/sdk';
import type { ParticipantFilters } from './types';

/**
 * Busca ID do organizador pelo user_id
 */
export async function getOrganizerByUserId(userId: string) {
  try {
    const organizers = await directus.request(
      readItems('organizers', {
        filter: {
          user_id: { _eq: userId },
        },
        limit: 1,
        fields: ['id', 'name'],
      })
    );

    return organizers[0] || null;
  } catch (error) {
    console.error('Error fetching organizer:', error);
    return null;
  }
}

/**
 * Constrói filtro Directus baseado nos filtros da UI
 */
export function buildDirectusFilter(organizerId: string, filters: ParticipantFilters) {
  const baseFilter: any = {
    event_id: {
      organizer_id: { _eq: organizerId },
    },
  };

  // Busca
  if (filters.search) {
    baseFilter._or = [
      { participant_name: { _icontains: filters.search } },
      { participant_email: { _icontains: filters.search } },
      { participant_phone: { _icontains: filters.search } },
      { participant_document: { _icontains: filters.search } },
      { ticket_code: { _icontains: filters.search } },
    ];
  }

  // Filtro de eventos
  if (filters.eventIds.length > 0) {
    baseFilter.event_id.id = { _in: filters.eventIds };
  }

  // Filtro de tipos de ingresso
  if (filters.ticketTypeIds.length > 0) {
    baseFilter.ticket_type_id = { _in: filters.ticketTypeIds };
  }

  // Filtro de status de inscrição
  if (filters.registrationStatus.length > 0) {
    baseFilter.status = { _in: filters.registrationStatus };
  }

  // Filtro de status de pagamento
  if (filters.paymentStatus.length > 0) {
    baseFilter.payment_status = { _in: filters.paymentStatus };
  }

  // Filtro de check-in
  if (filters.hasCheckedIn === true) {
    baseFilter.check_in_date = { _nnull: true };
  } else if (filters.hasCheckedIn === false) {
    baseFilter.check_in_date = { _null: true };
  }

  // Filtro de data de check-in
  if (filters.checkInDateRange.start && filters.checkInDateRange.end) {
    baseFilter.check_in_date = {
      _between: [filters.checkInDateRange.start, filters.checkInDateRange.end],
    };
  }

  return baseFilter;
}

/**
 * Busca participantes com paginação e filtros
 */
export async function fetchParticipants(
  organizerId: string,
  page: number = 1,
  limit: number = 25,
  filters: ParticipantFilters,
  sortField: string = 'date_created',
  sortDirection: 'asc' | 'desc' = 'desc'
) {
  const offset = (page - 1) * limit;
  const filter = buildDirectusFilter(organizerId, filters);

  try {
    const [data, total] = await Promise.all([
      directus.request(
        readItems('event_registrations', {
          filter,
          limit,
          offset,
          sort: sortDirection === 'desc' ? `-${sortField}` : sortField,
          fields: [
            'id',
            'ticket_code',
            'participant_name',
            'participant_email',
            'participant_phone',
            'participant_document',
            'status',
            'payment_status',
            'check_in_date',
            'quantity',
            'unit_price',
            'service_fee',
            'total_amount',
            'payment_method',
            'date_created',
            'date_updated',
            {
              event_id: [
                'id',
                'title',
                'slug',
                'start_date',
                'location_name',
                { organizer_id: ['id'] },
              ],
            },
            {
              ticket_type_id: ['id', 'title', 'price'],
            },
            {
              user_id: ['id', 'first_name', 'last_name', 'email', 'avatar'],
            },
          ],
        })
      ),
      directus.request(
        readItems('event_registrations', {
          filter,
          aggregate: { count: 'id' },
        })
      ),
    ]);

    return {
      data,
      total: total[0]?.count?.id || 0,
    };
  } catch (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }
}

/**
 * Calcula métricas dos participantes
 */
export async function fetchParticipantMetrics(organizerId: string, filters: ParticipantFilters) {
  const filter = buildDirectusFilter(organizerId, filters);

  try {
    const [allParticipants, checkedInParticipants] = await Promise.all([
      directus.request(
        readItems('event_registrations', {
          filter,
          aggregate: { count: 'id' },
        })
      ),
      directus.request(
        readItems('event_registrations', {
          filter: {
            ...filter,
            check_in_date: { _nnull: true },
          },
          aggregate: { count: 'id' },
        })
      ),
    ]);

    const total = allParticipants[0]?.count?.id || 0;
    const checkedIn = checkedInParticipants[0]?.count?.id || 0;
    const pending = total - checkedIn;
    const checkInRate = total > 0 ? (checkedIn / total) * 100 : 0;

    return {
      total,
      checkedIn,
      pending,
      checkInRate: Math.round(checkInRate * 10) / 10, // 1 casa decimal
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return {
      total: 0,
      checkedIn: 0,
      pending: 0,
      checkInRate: 0,
    };
  }
}

/**
 * Busca participante por ID
 */
export async function fetchParticipantById(id: string, organizerId: string) {
  try {
    const participant = await directus.request(
      readItem('event_registrations', id, {
        fields: [
          '*',
          {
            event_id: [
              'id',
              'title',
              'slug',
              'start_date',
              'end_date',
              'location_name',
              'location_address',
              { organizer_id: ['id'] },
            ],
          },
          {
            ticket_type_id: ['id', 'title', 'price', 'description'],
          },
          {
            user_id: ['id', 'first_name', 'last_name', 'email', 'avatar', 'phone'],
          },
        ],
      })
    );

    // Verificar se o participante pertence ao organizador
    if (participant?.event_id?.organizer_id?.id !== organizerId) {
      return null;
    }

    return participant;
  } catch (error) {
    console.error('Error fetching participant:', error);
    return null;
  }
}

/**
 * Realiza check-in do participante
 */
export async function performCheckIn(id: string, organizerId: string) {
  // Primeiro verificar se pertence ao organizador
  const participant = await fetchParticipantById(id, organizerId);

  if (!participant) {
    throw new Error('Participante não encontrado ou não autorizado');
  }

  if (participant.status === 'cancelled') {
    throw new Error('Não é possível fazer check-in de inscrição cancelada');
  }

  try {
    const updated = await directus.request(
      updateItem('event_registrations', id, {
        check_in_date: new Date().toISOString(),
        status: 'checked_in',
      })
    );

    return updated;
  } catch (error) {
    console.error('Error performing check-in:', error);
    throw error;
  }
}

/**
 * Desfaz check-in do participante
 */
export async function undoCheckIn(id: string, organizerId: string) {
  // Primeiro verificar se pertence ao organizador
  const participant = await fetchParticipantById(id, organizerId);

  if (!participant) {
    throw new Error('Participante não encontrado ou não autorizado');
  }

  try {
    const updated = await directus.request(
      updateItem('event_registrations', id, {
        check_in_date: null,
        status: 'confirmed',
      })
    );

    return updated;
  } catch (error) {
    console.error('Error undoing check-in:', error);
    throw error;
  }
}
```

---

### Passo 1.5: Criar Utilitários

**Arquivo:** `src/app/admin/participantes/_lib/utils.ts`

**Conteúdo:**
```typescript
import type { ParticipantRow } from './types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data para exibição
 */
export function formatDate(dateString: string | null, formatStr: string = 'dd/MM/yyyy HH:mm') {
  if (!dateString) return '—';

  try {
    return format(parseISO(dateString), formatStr, { locale: ptBR });
  } catch {
    return '—';
  }
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Obtém nome completo do participante
 */
export function getParticipantFullName(participant: ParticipantRow) {
  if (participant.user_id) {
    const { first_name, last_name } = participant.user_id;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
  }
  return participant.participant_name;
}

/**
 * Obtém iniciais para avatar
 */
export function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Labels de status
 */
export const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendente',
  cancelled: 'Cancelado',
  checked_in: 'Check-in feito',
};

export const paymentStatusLabels: Record<string, string> = {
  free: 'Gratuito',
  paid: 'Pago',
  pending: 'Pendente',
  refunded: 'Reembolsado',
};

export const paymentMethodLabels: Record<string, string> = {
  card: 'Cartão',
  pix: 'PIX',
  boleto: 'Boleto',
  free: 'Gratuito',
};

/**
 * Classes CSS para badges de status
 */
export const statusBadgeClasses: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  checked_in: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export const paymentStatusBadgeClasses: Record<string, string> = {
  free: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  refunded: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

---

### ✅ Checklist Fase 1
- [ ] @tanstack/react-table instalado
- [ ] Estrutura de pastas criada
- [ ] types.ts criado e sem erros
- [ ] queries.ts criado e sem erros
- [ ] utils.ts criado e sem erros
- [ ] Build TypeScript sem erros

---

## FASE 2: Listagem Básica (3-4 horas)

### Objetivos
- Criar página principal
- Implementar TanStack Table
- Definir colunas
- Paginação básica

### Passo 2.1: Criar API Route

**Arquivo:** `src/app/api/admin/participantes/route.ts`

**Conteúdo:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrganizerByUserId, fetchParticipants, fetchParticipantMetrics } from '@/app/admin/participantes/_lib/queries';
import type { ParticipantFilters } from '@/app/admin/participantes/_lib/types';

export async function GET(request: NextRequest) {
  try {
    // 1. Autenticação
    const cookieStore = await cookies();
    const authToken = cookieStore.get('directus_token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // TODO: Decodificar token para pegar user_id
    // Por enquanto, usar user_id mock ou implementar decode
    const userId = 'user-id-here'; // IMPLEMENTAR

    // 2. Verificar se é organizador
    const organizer = await getOrganizerByUserId(userId);

    if (!organizer) {
      return NextResponse.json({ error: 'Organizador não encontrado' }, { status: 403 });
    }

    // 3. Parsear query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const sortField = searchParams.get('sortField') || 'date_created';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';

    // Filtros
    const filters: ParticipantFilters = {
      search: searchParams.get('search') || '',
      eventIds: searchParams.get('eventIds')?.split(',').filter(Boolean) || [],
      ticketTypeIds: searchParams.get('ticketTypeIds')?.split(',').filter(Boolean) || [],
      registrationStatus: (searchParams.get('registrationStatus')?.split(',').filter(Boolean) || []) as any[],
      paymentStatus: (searchParams.get('paymentStatus')?.split(',').filter(Boolean) || []) as any[],
      hasCheckedIn: searchParams.get('hasCheckedIn') === 'true' ? true : searchParams.get('hasCheckedIn') === 'false' ? false : null,
      checkInDateRange: {
        start: searchParams.get('checkInStart') || null,
        end: searchParams.get('checkInEnd') || null,
      },
    };

    // 4. Buscar dados
    const [participantsData, metrics] = await Promise.all([
      fetchParticipants(organizer.id, page, limit, filters, sortField, sortDirection),
      fetchParticipantMetrics(organizer.id, filters),
    ]);

    // 5. Retornar resposta
    return NextResponse.json({
      data: participantsData.data,
      meta: {
        total: participantsData.total,
        page,
        limit,
        pageCount: Math.ceil(participantsData.total / limit),
      },
      metrics,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/participantes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar participantes' },
      { status: 500 }
    );
  }
}
```

---

### Passo 2.2: Definir Colunas da Tabela

**Arquivo:** `src/app/admin/participantes/_components/columns.tsx`

**Conteúdo:**
```typescript
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ParticipantRow } from '../_lib/types';
import {
  formatDate,
  formatCurrency,
  getInitials,
  statusLabels,
  statusBadgeClasses,
  paymentStatusLabels,
  paymentStatusBadgeClasses,
} from '../_lib/utils';

export const columns: ColumnDef<ParticipantRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'participant_name',
    header: 'Participante',
    cell: ({ row }) => {
      const participant = row.original;
      const initials = getInitials(participant.participant_name);
      const avatar = participant.user_id?.avatar;

      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            {avatar && <AvatarImage src={avatar} alt={participant.participant_name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-white">
              {participant.participant_name}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {participant.participant_email}
            </span>
            {participant.participant_phone && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {participant.participant_phone}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'event_id.title',
    header: 'Evento',
    cell: ({ row }) => {
      const event = row.original.event_id;
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white">{event.title}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(event.start_date, 'dd MMM yyyy, HH:mm')}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'ticket_type_id.title',
    header: 'Tipo Ingresso',
    cell: ({ row }) => {
      const ticket = row.original.ticket_type_id;
      const quantity = row.original.quantity;

      if (!ticket) {
        return <span className="text-gray-500">—</span>;
      }

      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">{ticket.title}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Quantidade: {quantity}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'payment_status',
    header: 'Pagamento',
    cell: ({ row }) => {
      const status = row.original.payment_status;
      const total = row.original.total_amount;
      const method = row.original.payment_method;

      return (
        <div className="flex flex-col gap-1">
          <Badge className={paymentStatusBadgeClasses[status || ''] || ''}>
            {paymentStatusLabels[status || ''] || status}
          </Badge>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatCurrency(total)}
          </span>
          {method && method !== 'free' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {method === 'card' ? 'Cartão' : method === 'pix' ? 'PIX' : 'Boleto'}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'check_in_date',
    header: 'Check-in',
    cell: ({ row }) => {
      const checkInDate = row.original.check_in_date;

      if (checkInDate) {
        return (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Check className="size-4" />
            <span className="text-sm font-medium">{formatDate(checkInDate)}</span>
          </div>
        );
      }

      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // TODO: Implementar check-in
            console.log('Check-in:', row.original.id);
          }}
        >
          Fazer Check-in
        </Button>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const participant = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            {!participant.check_in_date && (
              <DropdownMenuItem>Fazer check-in</DropdownMenuItem>
            )}
            {participant.check_in_date && (
              <DropdownMenuItem>Desfazer check-in</DropdownMenuItem>
            )}
            <DropdownMenuItem>Editar</DropdownMenuItem>
            <DropdownMenuItem>Reenviar email</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600">Cancelar inscrição</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
```

---

### Passo 2.3: Criar Componente da Tabela

**Arquivo:** `src/app/admin/participantes/_components/ParticipantsTable.tsx`

**Conteúdo:**
```typescript
'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { columns } from './columns';
import type { ParticipantRow } from '../_lib/types';

interface ParticipantsTableProps {
  data: ParticipantRow[];
  isLoading: boolean;
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function ParticipantsTable({
  data,
  isLoading,
  pageCount,
  currentPage,
  onPageChange,
}: ParticipantsTableProps) {
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    manualPagination: true,
    pageCount,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
        Nenhum participante encontrado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Página {currentPage} de {Math.max(pageCount, 1)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

### Passo 2.4: Criar Página Principal

**Arquivo:** `src/app/admin/participantes/page.tsx`

**Conteúdo:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ParticipantsTable } from './_components/ParticipantsTable';
import type { ParticipantsResponse } from './_lib/types';

export default function ParticipantesPage() {
  const [data, setData] = useState<ParticipantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/participantes?page=${currentPage}`);
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Error loading participants:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gerenciar Participantes
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Visualize e gerencie todos os participantes dos seus eventos
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <ParticipantsTable
          data={data?.data || []}
          isLoading={isLoading}
          pageCount={data?.meta.pageCount || 1}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
```

---

### ✅ Checklist Fase 2
- [ ] API route criada
- [ ] Colunas definidas
- [ ] Componente de tabela criado
- [ ] Página principal criada
- [ ] Tabela renderiza dados
- [ ] Paginação funciona
- [ ] Build sem erros

---

## FASE 3-7: Continua...

> **Nota:** As fases 3-7 seguem estrutura similar com passos detalhados.
> Por questões de espaço, o plano completo está resumido no checklist abaixo.

---

## 📋 Checklist Detalhado

### Setup (Fase 1)
- [ ] Instalar @tanstack/react-table
- [ ] Criar estrutura de pastas
- [ ] Criar types.ts
- [ ] Criar queries.ts
- [ ] Criar utils.ts
- [ ] Build TypeScript OK

### Listagem (Fase 2)
- [ ] API route GET /api/admin/participantes
- [ ] Autenticação implementada
- [ ] Verificação de organizador
- [ ] Definir colunas TanStack
- [ ] Componente ParticipantsTable
- [ ] Página principal criada
- [ ] Paginação funcionando

### Filtros (Fase 3)
- [ ] Componente de busca com debounce
- [ ] Filtro de eventos (multi-select)
- [ ] Filtro de ingressos
- [ ] Filtro de status
- [ ] Filtro de pagamento
- [ ] Integrar filtros com API
- [ ] Cards de métricas

### Check-in (Fase 4)
- [ ] API route POST /api/admin/participantes/[id]/checkin
- [ ] API route DELETE /api/admin/participantes/[id]/checkin
- [ ] Dialog de confirmação
- [ ] Atualização otimista
- [ ] Toast de sucesso/erro
- [ ] Validações

### Detalhes (Fase 5)
- [ ] Página /admin/participantes/[id]
- [ ] Layout de informações
- [ ] Todas as seções
- [ ] Navegação funcionando
- [ ] Ações disponíveis

### Exportação (Fase 5)
- [ ] Função de exportação CSV
- [ ] Botão exportar
- [ ] Respeitar filtros
- [ ] Download funcionando

### Polimento (Fase 6)
- [ ] Mobile responsivo
- [ ] Dark mode
- [ ] Loading states
- [ ] Empty states
- [ ] Error boundaries

### Testes (Fase 7)
- [ ] Teste de carregamento
- [ ] Teste de filtros
- [ ] Teste de check-in
- [ ] Teste de segurança
- [ ] Teste mobile

---

## 🛠️ Comandos Úteis

### Desenvolvimento
```bash
# Instalar dependências
pnpm install

# Dev server
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Gerar tipos Directus
pnpm generate:types
```

### Git
```bash
# Criar branch
git checkout -b feature/participantes-management

# Commit incremental
git add .
git commit -m "feat(admin): add participants table"

# Push
git push origin feature/participantes-management
```

### Directus
```bash
# Ver logs
cd ../directus
docker compose logs -f

# Reiniciar
docker compose restart
```

---

## 🔍 Troubleshooting

### Erro: "Cannot find module @tanstack/react-table"
**Solução:**
```bash
pnpm add @tanstack/react-table
pnpm install
```

### Erro: "Organizador não encontrado"
**Solução:**
- Verificar se usuário tem organizador criado no Directus
- Verificar relação user_id

### Tabela não carrega dados
**Solução:**
1. Verificar console do navegador
2. Verificar console do servidor Next.js
3. Verificar logs do Directus
4. Testar API route diretamente: `curl localhost:3000/api/admin/participantes`

### Build falha com erro de tipos
**Solução:**
```bash
pnpm generate:types
pnpm tsc --noEmit
```

---

**Última atualização:** 10 de Janeiro de 2025
**Versão:** 1.0
