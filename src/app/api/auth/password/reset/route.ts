import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApi, validateBody } from '@/lib/api';
import { AppError } from '@/lib/errors';

const schema = z.object({
	token: z.string().min(1, 'Token é obrigatório'),
	password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
});

export const POST = withApi(async (request: NextRequest) => {
	const { token, password } = await validateBody(request, schema);

	const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

	// Reset the password using the token from the email
	const response = await fetch(`${directusUrl}/auth/password/reset`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			token,
			password,
		}),
	});

	// Directus returns 204 No Content on success
	if (response.status === 204 || response.ok) {
		return NextResponse.json({
			success: true,
			message: 'Senha redefinida com sucesso. Você pode fazer login agora.'
		});
	}

	// Handle error responses
	const errorData = await response.json().catch(() => ({}));
	const errorMessage = errorData.errors?.[0]?.message || 'Token inválido ou expirado';

	throw new AppError(errorMessage, response.status);
});
