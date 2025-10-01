import { NextRequest, NextResponse } from 'next/server';
import { createDirectus, rest, authentication, readMe, readUser, withToken } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';

export async function POST(request: NextRequest) {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: 'Email e senha são obrigatórios' },
				{ status: 400 }
			);
		}

		const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
		const client = createDirectus<Schema>(directusUrl)
			.with(rest())
			.with(authentication('json'));

		// Authenticate with Directus
		const loginResult = await client.login(email, password);

		if (!loginResult.access_token) {
			return NextResponse.json(
				{ error: 'Falha ao fazer login' },
				{ status: 401 }
			);
		}

		// Get user ID from basic readMe
		const basicUser = await client.request(readMe());

		// Use admin token to fetch full user data
		const adminToken = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_PUBLIC_TOKEN;
		const adminClient = createDirectus<Schema>(directusUrl).with(rest());

		const userData = await adminClient.request(
			withToken(
				adminToken as string,
				readUser(basicUser.id, {
					fields: ['id', 'email', 'first_name', 'last_name'],
				})
			)
		);

		return NextResponse.json({
			success: true,
			access_token: loginResult.access_token,
			refresh_token: loginResult.refresh_token,
			expires: loginResult.expires,
			user: {
				id: userData.id,
				email: userData.email,
				first_name: userData.first_name,
				last_name: userData.last_name,
			}
		});
	} catch (error: any) {
		console.error('Login error:', error);

		if (error.errors) {
			const firstError = error.errors[0];
			return NextResponse.json(
				{ error: firstError.message || 'Credenciais inválidas' },
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{ error: 'Erro ao fazer login. Tente novamente.' },
			{ status: 500 }
		);
	}
}
