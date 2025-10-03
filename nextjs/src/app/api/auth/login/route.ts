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

		// Get user data using the logged in user's token
		const userData = await client.request(
			readMe({
				fields: ['id', 'email', 'first_name', 'last_name'],
			})
		);

		const response = NextResponse.json({
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

		// Set cookies for middleware authentication
		response.cookies.set('directus_token', loginResult.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: loginResult.expires ? loginResult.expires / 1000 : 86400, // 24h default
		});

		if (loginResult.refresh_token) {
			response.cookies.set('directus_refresh_token', loginResult.refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 604800, // 7 days
			});
		}

		return response;
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
