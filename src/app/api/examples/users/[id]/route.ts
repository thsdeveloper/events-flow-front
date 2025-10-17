/**
 * @fileoverview Exemplo de API Route com Directus e tratamento de erros
 *
 * Este exemplo demonstra:
 * - Uso do withApi wrapper
 * - Integração com Directus
 * - Tratamento de erros com fromDirectusError
 * - Validação com Zod
 * - Retorno padronizado RFC 7807
 */

import { NextRequest } from 'next/server';
import { readItem, updateItem, deleteItem } from '@directus/sdk';
import { z } from 'zod';
import { withApi, validateBody } from '@/lib/api';
import { fromDirectusError, createNotFoundError } from '@/lib/errors';
import { getAuthClient } from '@/lib/directus/directus';

/**
 * Schema de validação para atualização de usuário
 */
const updateUserSchema = z.object({
  first_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
  last_name: z.string().min(2, 'Sobrenome deve ter no mínimo 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional(),
});

/**
 * GET /api/examples/users/:id
 *
 * Busca usuário por ID
 */
export const GET = withApi(async (request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) => {
  const resolvedParams = await context.params;
  const id = resolvedParams.id as string;

  try {
    const client = getAuthClient();

    // Busca usuário no Directus
    const user = await client.request(
      readItem('directus_users', id as string, {
        fields: ['id', 'email', 'first_name', 'last_name', 'status', 'role'],
      })
    );

    if (!user) {
      throw createNotFoundError('Usuário', request.headers.get('x-request-id') || undefined);
    }

    return Response.json(user);
  } catch (error) {
    // Converte erro do Directus para AppError
    throw fromDirectusError(error, request.headers.get('x-request-id') || undefined);
  }
});

/**
 * PUT /api/examples/users/:id
 *
 * Atualiza usuário (validação com Zod)
 */
export const PUT = withApi(async (request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) => {
  const resolvedParams = await context.params;
  const id = resolvedParams.id as string;

  // Valida body com Zod (lança AppError automaticamente se inválido)
  const body = await validateBody(request, updateUserSchema);

  try {
    const client = getAuthClient();

    // Atualiza usuário no Directus
    const user = await client.request(
      updateItem('directus_users', id as string, body)
    );

    return Response.json(user);
  } catch (error) {
    throw fromDirectusError(error, request.headers.get('x-request-id') || undefined);
  }
});

/**
 * DELETE /api/examples/users/:id
 *
 * Deleta usuário
 */
export const DELETE = withApi(async (request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) => {
  const resolvedParams = await context.params;
  const id = resolvedParams.id as string;

  try {
    const client = getAuthClient();

    await client.request(deleteItem('directus_users', id as string));

    return new Response(null, { status: 204 });
  } catch (error) {
    throw fromDirectusError(error, request.headers.get('x-request-id') || undefined);
  }
});
