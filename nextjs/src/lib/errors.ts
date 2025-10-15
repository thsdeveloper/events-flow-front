/**
 * @fileoverview Sistema de erros padronizado RFC 7807 (Problem Details)
 *
 * Esta implementação segue o padrão RFC 7807 para representar erros HTTP
 * de forma consistente e estruturada.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */

/**
 * Mapeamento oficial dos códigos de erro do Directus
 * @see https://docs.directus.io/reference/error-codes.html
 */
export const DIRECTUS_ERROR_CODES = {
  FAILED_VALIDATION: { status: 400, title: 'Validação falhou' },
  FORBIDDEN: { status: 403, title: 'Acesso negado' },
  INVALID_TOKEN: { status: 403, title: 'Token inválido' },
  TOKEN_EXPIRED: { status: 401, title: 'Token expirado' },
  INVALID_CREDENTIALS: { status: 401, title: 'Credenciais inválidas' },
  INVALID_IP: { status: 401, title: 'IP não autorizado' },
  INVALID_OTP: { status: 401, title: 'Código OTP incorreto' },
  INVALID_PAYLOAD: { status: 400, title: 'Payload inválido' },
  INVALID_QUERY: { status: 400, title: 'Parâmetros de consulta inválidos' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, title: 'Tipo de mídia não suportado' },
  REQUESTS_EXCEEDED: { status: 429, title: 'Limite de requisições excedido' },
  ROUTE_NOT_FOUND: { status: 404, title: 'Rota não encontrada' },
  SERVICE_UNAVAILABLE: { status: 503, title: 'Serviço indisponível' },
  UNPROCESSABLE_CONTENT: { status: 422, title: 'Conteúdo não processável' },
} as const;

export type DirectusErrorCode = keyof typeof DIRECTUS_ERROR_CODES;

/**
 * Estrutura RFC 7807 Problem Details
 */
export interface ProblemDetails {
  /** URI de referência que identifica o tipo do problema */
  type: string;
  /** Título legível do problema (não deve mudar entre ocorrências) */
  title: string;
  /** Código de status HTTP */
  status: number;
  /** Explicação específica desta ocorrência do problema */
  detail?: string;
  /** URI que identifica a instância específica do problema */
  instance?: string;
  /** ID único da requisição para rastreamento */
  requestId?: string;
  /** Contexto adicional (validações, campos, etc) */
  context?: Record<string, unknown>;
  /** Stack trace (apenas em desenvolvimento) */
  stack?: string;
}

/**
 * Classe base para todos os erros da aplicação
 *
 * Encapsula informações necessárias para gerar Problem Details
 * compatíveis com RFC 7807.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly type: string;
  public readonly context?: Record<string, unknown>;
  public readonly requestId?: string;

  constructor(options: {
    message: string;
    status: number;
    code: string;
    type?: string;
    context?: Record<string, unknown>;
    requestId?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.status = options.status;
    this.code = options.code;
    this.type = options.type || `https://api.errors/${options.code.toLowerCase()}`;
    this.context = options.context;
    this.requestId = options.requestId;

    // Mantém stack trace correto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Converte o erro para formato RFC 7807 Problem Details
   */
  toProblem(options?: {
    instance?: string;
    includeStack?: boolean;
  }): ProblemDetails {
    const problem: ProblemDetails = {
      type: this.type,
      title: this.getTitle(),
      status: this.status,
      detail: this.message,
      instance: options?.instance,
      requestId: this.requestId,
    };

    // Adiciona contexto se disponível
    if (this.context && Object.keys(this.context).length > 0) {
      problem.context = this.context;
    }

    // Adiciona stack apenas em desenvolvimento
    if (options?.includeStack && this.stack) {
      problem.stack = this.stack;
    }

    return problem;
  }

  /**
   * Retorna título baseado no status HTTP
   */
  private getTitle(): string {
    // Tenta encontrar título no mapeamento do Directus
    const directusError = Object.entries(DIRECTUS_ERROR_CODES).find(
      ([code]) => code === this.code
    );

    if (directusError) {
      return directusError[1].title;
    }

    // Fallback para títulos genéricos baseados no status
    const statusTitles: Record<number, string> = {
      400: 'Requisição inválida',
      401: 'Não autenticado',
      403: 'Acesso negado',
      404: 'Não encontrado',
      409: 'Conflito',
      422: 'Entidade não processável',
      429: 'Muitas requisições',
      500: 'Erro interno do servidor',
      502: 'Gateway inválido',
      503: 'Serviço indisponível',
      504: 'Timeout do gateway',
    };

    return statusTitles[this.status] || 'Erro desconhecido';
  }
}

/**
 * Converte erros do Directus para AppError
 *
 * O Directus retorna erros em formato próprio que precisa ser
 * traduzido para o padrão RFC 7807.
 *
 * @example
 * ```ts
 * try {
 *   await directus.request(...)
 * } catch (error) {
 *   throw fromDirectusError(error, requestId)
 * }
 * ```
 */
export function fromDirectusError(
  error: unknown,
  requestId?: string
): AppError {
  // Se já é AppError, apenas retorna
  if (error instanceof AppError) {
    return error;
  }

  // Estrutura típica de erro do Directus
  interface DirectusError {
    errors?: Array<{
      message: string;
      extensions?: {
        code?: DirectusErrorCode;
        [key: string]: unknown;
      };
    }>;
    message?: string;
  }

  const directusError = error as DirectusError;

  // Extrai primeiro erro se houver array
  const firstError = directusError.errors?.[0];
  const code = firstError?.extensions?.code;
  const message = firstError?.message || directusError.message || 'Erro desconhecido';

  // Busca mapeamento do código
  let status = 500;
  let errorCode = 'INTERNAL_ERROR';

  if (code && code in DIRECTUS_ERROR_CODES) {
    const mapping = DIRECTUS_ERROR_CODES[code];
    status = mapping.status;
    errorCode = code;
  }

  // Extrai contexto adicional (validações, etc)
  const context: Record<string, unknown> = {};

  if (firstError?.extensions) {
    const { code: _, ...rest } = firstError.extensions;
    if (Object.keys(rest).length > 0) {
      context.extensions = rest;
    }
  }

  // Adiciona todos os erros se houver múltiplos
  if (directusError.errors && directusError.errors.length > 1) {
    context.errors = directusError.errors.map(e => ({
      message: e.message,
      ...e.extensions,
    }));
  }

  return new AppError({
    message,
    status,
    code: errorCode,
    context: Object.keys(context).length > 0 ? context : undefined,
    requestId,
    cause: error,
  });
}

/**
 * Cria erro de validação (422) com detalhes dos campos
 *
 * @example
 * ```ts
 * throw createValidationError({
 *   email: ['Email inválido', 'Email já existe'],
 *   password: ['Senha muito curta']
 * })
 * ```
 */
export function createValidationError(
  errors: Record<string, string[]>,
  requestId?: string
): AppError {
  const fieldCount = Object.keys(errors).length;
  const totalErrors = Object.values(errors).flat().length;

  return new AppError({
    message: `Validação falhou em ${fieldCount} campo(s) com ${totalErrors} erro(s)`,
    status: 422,
    code: 'VALIDATION_ERROR',
    context: { errors },
    requestId,
  });
}

/**
 * Cria erro de não encontrado (404)
 */
export function createNotFoundError(
  resource: string,
  requestId?: string
): AppError {
  return new AppError({
    message: `${resource} não encontrado`,
    status: 404,
    code: 'NOT_FOUND',
    requestId,
  });
}

/**
 * Cria erro de não autorizado (401)
 */
export function createUnauthorizedError(
  message = 'Autenticação necessária',
  requestId?: string
): AppError {
  return new AppError({
    message,
    status: 401,
    code: 'UNAUTHORIZED',
    requestId,
  });
}

/**
 * Cria erro de acesso negado (403)
 */
export function createForbiddenError(
  message = 'Você não tem permissão para acessar este recurso',
  requestId?: string
): AppError {
  return new AppError({
    message,
    status: 403,
    code: 'FORBIDDEN',
    requestId,
  });
}

/**
 * Cria erro de rate limit (429)
 */
export function createRateLimitError(
  retryAfter?: number,
  requestId?: string
): AppError {
  return new AppError({
    message: 'Você excedeu o limite de requisições. Tente novamente mais tarde.',
    status: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    context: retryAfter ? { retryAfter } : undefined,
    requestId,
  });
}

/**
 * Verifica se um erro é do tipo AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
