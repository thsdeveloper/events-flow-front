export interface ParsedDirectusError {
  status?: number;
  code?: string;
  message?: string;
}

type UnknownErrorObject = Record<string, any>;

const AUTH_ERROR_CODES = new Set([
  'INVALID_CREDENTIALS',
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',
  'AUTH_FAILED',
  'AUTH_INVALID',
  'AUTHENTICATION_FAILED',
  'JWT_EXPIRED',
]);

const AUTH_ERROR_MESSAGE_SNIPPETS = [
  'not authenticated',
  'não autenticado',
  'unauthorized',
  'unauthenticated',
  'invalid token',
  'token expired',
  'invalid credentials',
  'jwt expired',
];

function getFirstError(error: UnknownErrorObject | undefined) {
  if (!error) {
    return undefined;
  }

  const errors = error.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors[0] as UnknownErrorObject;
  }

  return undefined;
}

function normalizeMessage(error: UnknownErrorObject | undefined) {
  if (!error) {
    return undefined;
  }

  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error.toString === 'function' && error.toString !== Object.prototype.toString) {
    return String(error.toString());
  }

  return undefined;
}

export function parseDirectusError(error: unknown): ParsedDirectusError {
  if (typeof error === 'string') {
    return { message: error };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (!error || typeof error !== 'object') {
    return {};
  }

  const err = error as UnknownErrorObject;
  const firstError = getFirstError(err);
  const extensions = (firstError?.extensions ?? err.extensions) as UnknownErrorObject | undefined;

  const status =
    err.status ??
    err.response?.status ??
    err.statusCode ??
    extensions?.status ??
    extensions?.statusCode ??
    firstError?.status;

  const code =
    (typeof extensions?.code === 'string' && extensions.code) ??
    (typeof firstError?.code === 'string' && firstError.code) ??
    (typeof err.code === 'string' && err.code) ??
    undefined;

  const message =
    normalizeMessage(err) ??
    normalizeMessage(firstError) ??
    (typeof extensions?.message === 'string' ? extensions.message : undefined);

  return {
    status: typeof status === 'number' ? status : undefined,
    code,
    message,
  };
}

export function isAuthenticationError(error: unknown): boolean {
  const { status, code, message } = parseDirectusError(error);

  if (status === 401) {
    return true;
  }

  if (typeof code === 'string' && AUTH_ERROR_CODES.has(code.toUpperCase())) {
    return true;
  }

  if (typeof message === 'string') {
    const lowerMessage = message.toLowerCase();
    if (AUTH_ERROR_MESSAGE_SNIPPETS.some((snippet) => lowerMessage.includes(snippet))) {
      return true;
    }
  }

  return false;
}
