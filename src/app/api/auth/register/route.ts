import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApi, validateBody } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { getDefaultClientRoleId } from '@/lib/auth/roles';

const registerSchema = z.object({
	email: z.string().email('Email inválido'),
	password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
	firstName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
	lastName: z.string().min(2, 'Sobrenome deve ter no mínimo 2 caracteres'),
});

export const POST = withApi(async (request: NextRequest) => {
	const { email, password, firstName, lastName } = await validateBody(request, registerSchema);

	const roleId = getDefaultClientRoleId();

	if (!roleId) {
		console.error('Missing Directus client role configuration.');
		throw new AppError({
			message: 'Configuração do servidor inválida',
			status: 500,
			code: 'MISSING_ROLE_CONFIG',
			requestId: request.headers.get('x-request-id') || undefined,
		});
	}

	const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
	const publicToken = process.env.DIRECTUS_PUBLIC_TOKEN;

	if (!publicToken) {
		throw new AppError({
			message: 'Configuração do servidor inválida',
			status: 500,
			code: 'MISSING_PUBLIC_TOKEN',
			requestId: request.headers.get('x-request-id') || undefined,
		});
	}

	try {
		// Create user with direct fetch
		const createUserResponse = await fetch(`${directusUrl}/users`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${publicToken}`,
			},
			body: JSON.stringify({
				email,
				password,
				first_name: firstName,
				last_name: lastName,
				role: roleId,
				status: 'active',
			}),
		});

		if (!createUserResponse.ok) {
			const errorData = await createUserResponse.json();
			const errorMessage = errorData.errors?.[0]?.message || 'Erro ao criar usuário';

			throw new AppError({
				message: errorMessage,
				status: createUserResponse.status,
				code: errorData.errors?.[0]?.extensions?.code || 'USER_CREATE_ERROR',
				requestId: request.headers.get('x-request-id') || undefined,
			});
		}

		const createUserData = await createUserResponse.json();
		const newUser = createUserData.data;

		return NextResponse.json(
			{
				success: true,
				message: 'Usuário criado com sucesso',
				user: {
					id: newUser.id,
					email: newUser.email,
					first_name: newUser.first_name,
					last_name: newUser.last_name,
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		throw new AppError({
			message: error instanceof Error ? error.message : 'Erro ao criar usuário',
			status: 500,
			code: 'REGISTRATION_ERROR',
			requestId: request.headers.get('x-request-id') || undefined,
			cause: error,
		});
	}
});
