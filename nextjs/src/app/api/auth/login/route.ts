import { NextRequest, NextResponse } from 'next/server';
import { readMe } from '@directus/sdk';
import { getAuthClient } from '@/lib/directus/directus';

export async function POST(request: NextRequest) {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: 'Email e senha são obrigatórios' },
				{ status: 400 }
			);
		}

		// Use the auth client helper (includes rate limiting and retry logic)
		const client = getAuthClient();

		// Login - returns { access_token, expires, refresh_token }
		const authResult = await client.login(email, password);

		if (!authResult.access_token) {
			return NextResponse.json(
				{ error: 'Falha ao fazer login' },
				{ status: 401 }
			);
		}

		// Get user data using the authenticated client
		// The SDK automatically uses the access_token from login
		const userData = await client.request(
			readMe({
				fields: ['*'],
			})
		);

		// Return everything to the client
		return NextResponse.json({
			success: true,
			access_token: authResult.access_token,
			refresh_token: authResult.refresh_token,
			expires: authResult.expires,
			user: userData
		});
	} catch (error: any) {
		console.error('Login error:', error);

		// Handle Directus SDK errors
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
