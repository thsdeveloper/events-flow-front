/**
 * @fileoverview Exemplo de API Route com listagem e criação
 *
 * Demonstra:
 * - Query params com validação
 * - Paginação
 * - Criação com validação Zod
 */

import { NextRequest, NextResponse } from 'next/server';
import { readItems, createItem } from '@directus/sdk';
import { z } from 'zod';
import { withApi, validateBody, validateQuery } from '@/lib/api';
import { fromDirectusError } from '@/lib/errors';
import { getAuthClient } from '@/lib/directus/directus';

/**
 * Schema para query params de listagem
 */
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional(),
});

/**
 * Schema para criação de usuário
 */
const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  first_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  last_name: z.string().min(2, 'Sobrenome deve ter no mínimo 2 caracteres'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.string().uuid('Role inválido'),
});

/**
 * GET /api/examples/users
 *
 * Lista usuários com paginação e filtros
 */
export const GET = withApi(async (request: NextRequest) => {
  // Valida e extrai query params
  const query = validateQuery(request, listQuerySchema);

  try {
    const client = getAuthClient();

    // Monta filtros do Directus
    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = { _eq: query.status };
    }

    if (query.search) {
      filter._or = [
        { first_name: { _contains: query.search } },
        { last_name: { _contains: query.search } },
        { email: { _contains: query.search } },
      ];
    }

    // Busca usuários com paginação
    const users = await client.request(
      readItems('directus_users', {
        fields: ['id', 'email', 'first_name', 'last_name', 'status', 'role'],
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        sort: ['-id'],
      })
    );

    return NextResponse.json({
      data: users,
      meta: {
        page: query.page,
        limit: query.limit,
      },
    });
  } catch (error) {
    throw fromDirectusError(error, request.headers.get('x-request-id') || undefined);
  }
});

/**
 * POST /api/examples/users
 *
 * Cria novo usuário
 */
export const POST = withApi(async (request: NextRequest) => {
  // Valida body
  const body = await validateBody(request, createUserSchema);

  try {
    const client = getAuthClient();

    // Cria usuário no Directus
    const user = await client.request(
      createItem('directus_users', {
        ...body,
        status: 'active', // Status padrão
      })
    );

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    throw fromDirectusError(error, request.headers.get('x-request-id') || undefined);
  }
});
