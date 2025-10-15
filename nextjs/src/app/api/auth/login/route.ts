import { NextRequest, NextResponse } from 'next/server';
import { readMe } from '@directus/sdk';
import { z } from 'zod';
import { withApi, validateBody } from '@/lib/api';
import { fromDirectusError, createUnauthorizedError, AppError } from '@/lib/errors';
import { getAuthClient } from '@/lib/directus/directus';
import { setAuthCookies } from '@/lib/auth/cookies';
import { isOrganizerRole } from '@/lib/auth/roles';

/**
 * Schema de validação para login
 */
const loginSchema = z.object({
	email: z.string().email('Email inválido'),
	password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

export const POST = withApi(async (request: NextRequest) => {
	// Valida body com Zod
	const { email, password } = await validateBody(request, loginSchema);

	try {
		// Use the auth client helper (includes rate limiting and retry logic)
		const client = getAuthClient();

		// Login - returns { access_token, expires, refresh_token }
		const authResult = await client.login(email, password);

		if (!authResult.access_token) {
			throw createUnauthorizedError(
				'Credenciais inválidas',
				request.headers.get('x-request-id') || undefined
			);
		}

		// Get user data using the authenticated client
		// The SDK automatically uses the access_token from login
		const userData = await client.request(
			readMe({
				fields: ['*', { role: ['id', 'name'] }],
			})
		);

		const hasOrganizerRole = isOrganizerRole(
			typeof userData.role === 'string' ? { id: userData.role, name: '' } : userData.role
		);

		const isOrganizer = hasOrganizerRole;
		const redirectUrl = isOrganizer ? '/admin' : '/perfil';

		// ⭐ Validate tokens
		if (!authResult.refresh_token) {
			throw new AppError({
				message: 'Token de atualização não recebido',
				status: 500,
				code: 'MISSING_REFRESH_TOKEN',
				requestId: request.headers.get('x-request-id') || undefined,
			});
		}

		if (authResult.expires === null || authResult.expires === undefined) {
			throw new AppError({
				message: 'Tempo de expiração não recebido',
				status: 500,
				code: 'MISSING_EXPIRATION',
				requestId: request.headers.get('x-request-id') || undefined,
			});
		}

		// ⭐ Set httpOnly cookies (secure, not accessible via JavaScript)
		await setAuthCookies({
			access_token: authResult.access_token,
			refresh_token: authResult.refresh_token,
			expires: authResult.expires,
		});

		// ⭐ Return user data and redirect (NO tokens in response body)
		return NextResponse.json({
			success: true,
			user: {
				id: userData.id,
				email: userData.email,
				first_name: userData.first_name,
				last_name: userData.last_name,
				role: userData.role,
			},
			isOrganizer,
			redirect: redirectUrl,
		});
	} catch (error) {
		// Converte erro do Directus para AppError (RFC 7807)
		throw fromDirectusError(error, request.headers.get('x-request-id') || undefined);
	}
});
