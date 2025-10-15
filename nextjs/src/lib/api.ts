/**
 * @fileoverview Wrapper para API Routes com tratamento padronizado de erros
 *
 * Este módulo fornece o helper `withApi` que envolve handlers de rota
 * do Next.js para garantir:
 * - Geração automática de requestId
 * - Retorno padronizado de erros em RFC 7807
 * - Headers de correlação para rastreamento
 * - Proteção contra vazamento de informações em produção
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, isAppError, type ProblemDetails } from './errors';

/**
 * Generates a UUID v4 using Web Crypto API
 * Compatible with both Node.js and Edge Runtime
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Tipo do handler de rota do Next.js 15+
 * Params são agora Promise (async dynamic routes)
 */
export type ApiRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> }
) => Promise<Response> | Response;

/**
 * Opções para configuração do withApi
 */
export interface WithApiOptions {
  /**
   * Se true, inclui stack trace em erros (apenas dev)
   * @default process.env.NODE_ENV === 'development'
   */
  includeStack?: boolean;

  /**
   * Callback executado antes do handler (ex: autenticação)
   */
  before?: (request: NextRequest) => Promise<void> | void;

  /**
   * Callback executado após sucesso do handler
   */
  after?: (response: Response) => Promise<Response> | Response;

  /**
   * Callback executado quando ocorre erro
   */
  onError?: (error: unknown, request: NextRequest) => Promise<void> | void;
}

/**
 * Higher-order function que envolve handlers de API Route
 *
 * Adiciona tratamento consistente de erros, requestId e headers de correlação.
 *
 * @example
 * ```ts
 * // app/api/users/route.ts
 * export const GET = withApi(async (request) => {
 *   const users = await getUsers()
 *   return NextResponse.json(users)
 * })
 *
 * export const POST = withApi(async (request) => {
 *   const body = await request.json()
 *   const user = await createUser(body)
 *   return NextResponse.json(user, { status: 201 })
 * })
 * ```
 */
export function withApi(
  handler: ApiRouteHandler,
  options: WithApiOptions = {}
): ApiRouteHandler {
  const {
    includeStack = process.env.NODE_ENV === 'development',
    before,
    after,
    onError,
  } = options;

  return async (request, context) => {
    // Gera requestId único para rastreamento
    const requestId = request.headers.get('x-request-id') || generateRequestId();

    try {
      // Executa hook before (autenticação, validação, etc)
      if (before) {
        await before(request);
      }

      // Executa handler principal
      let response = await handler(request, context);

      // Executa hook after
      if (after) {
        response = await after(response);
      }

      // Adiciona requestId em todas as respostas de sucesso
      return addCorsAndRequestId(response, requestId);
    } catch (error) {
      // Executa callback de erro (logging, telemetria, etc)
      if (onError) {
        await onError(error, request);
      }

      // Converte para AppError se não for
      const appError = isAppError(error)
        ? error
        : convertToAppError(error, requestId);

      // Gera Problem Details
      const problem = appError.toProblem({
        instance: request.url,
        includeStack,
      });

      // Log em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ API Error:', {
          requestId,
          url: request.url,
          method: request.method,
          status: problem.status,
          code: appError.code,
          message: problem.detail,
          context: problem.context,
        });

        if (problem.stack) {
          console.error(problem.stack);
        }
      }

      // Retorna resposta com Problem Details
      const response = NextResponse.json(problem, {
        status: appError.status,
        headers: {
          'Content-Type': 'application/problem+json',
        },
      });

      return addCorsAndRequestId(response, requestId);
    }
  };
}

/**
 * Converte erros desconhecidos para AppError
 *
 * Trata casos comuns como erro de parse JSON, timeout, etc.
 */
function convertToAppError(error: unknown, requestId: string): AppError {
  // Erro padrão JavaScript
  if (error instanceof Error) {
    // Erro de parse JSON
    if (error.message.includes('JSON')) {
      return new AppError({
        message: 'Payload JSON inválido',
        status: 400,
        code: 'INVALID_JSON',
        requestId,
        cause: error,
      });
    }

    // Erro de timeout
    if (error.message.includes('timeout')) {
      return new AppError({
        message: 'Requisição expirou',
        status: 504,
        code: 'TIMEOUT',
        requestId,
        cause: error,
      });
    }

    // Erro genérico
    return new AppError({
      message: error.message || 'Erro interno do servidor',
      status: 500,
      code: 'INTERNAL_ERROR',
      requestId,
      cause: error,
    });
  }

  // Erro completamente desconhecido
  return new AppError({
    message: 'Erro interno do servidor',
    status: 500,
    code: 'UNKNOWN_ERROR',
    requestId,
    cause: error,
  });
}

/**
 * Adiciona headers de CORS e requestId na resposta
 */
function addCorsAndRequestId(
  response: Response,
  requestId: string
): Response {
  const headers = new Headers(response.headers);

  // Adiciona requestId
  headers.set('x-request-id', requestId);

  // CORS headers (ajuste conforme necessário)
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');
  headers.set('Access-Control-Expose-Headers', 'x-request-id');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Helper para validar body de requisição com Zod
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 *
 * const schema = z.object({
 *   email: z.string().email(),
 *   name: z.string().min(2)
 * })
 *
 * export const POST = withApi(async (request) => {
 *   const body = await validateBody(request, schema)
 *   // body é type-safe e validado
 * })
 * ```
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  try {
    const body = await request.json();
    
return schema.parse(body);
  } catch (error) {
    // Erro de parse do Zod
    if (error && typeof error === 'object' && 'issues' in error) {
      const issues = error.issues as Array<{
        path: (string | number)[];
        message: string;
      }>;

      const errors: Record<string, string[]> = {};

      for (const issue of issues) {
        const path = issue.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(issue.message);
      }

      throw new AppError({
        message: 'Validação falhou',
        status: 422,
        code: 'VALIDATION_ERROR',
        context: { errors },
      });
    }

    throw error;
  }
}

/**
 * Helper para extrair e validar query params com Zod
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   page: z.coerce.number().min(1).default(1),
 *   limit: z.coerce.number().min(1).max(100).default(20)
 * })
 *
 * export const GET = withApi(async (request) => {
 *   const query = validateQuery(request, schema)
 *   // query.page e query.limit são validados e tipados
 * })
 * ```
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T }
): T {
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());

  try {
    return schema.parse(query);
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const issues = error.issues as Array<{
        path: (string | number)[];
        message: string;
      }>;

      const errors: Record<string, string[]> = {};

      for (const issue of issues) {
        const path = issue.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(issue.message);
      }

      throw new AppError({
        message: 'Query params inválidos',
        status: 400,
        code: 'INVALID_QUERY',
        context: { errors },
      });
    }

    throw error;
  }
}

/**
 * Helper para requisições OPTIONS (CORS preflight)
 */
export function createOptionsHandler(): ApiRouteHandler {
  return withApi(() => {
    return new NextResponse(null, { status: 204 });
  });
}
