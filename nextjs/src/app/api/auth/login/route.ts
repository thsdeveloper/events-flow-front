import { NextRequest, NextResponse } from 'next/server';
import { readMe, readItems } from '@directus/sdk';
import { getAuthClient } from '@/lib/directus/directus';
import { setAuthCookies } from '@/lib/auth/cookies';

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
				fields: ['*', { role: ['id', 'name'] }],
			})
		);

		// Check if user is an organizer
		const organizers = await client.request(
			readItems('organizers', {
				filter: {
					user_id: { _eq: userData.id },
					status: { _in: ['active', 'pending'] },
				},
				limit: 1,
			})
		);

		const isOrganizer = organizers.length > 0;

		// Determine redirect URL based on role
		const redirectUrl = isOrganizer ? '/admin' : '/perfil';

		// ⭐ Validate tokens
		if (!authResult.refresh_token) {
			throw new Error('No refresh token received from authentication');
		}
		if (authResult.expires === null || authResult.expires === undefined) {
			throw new Error('No expiration time received from authentication');
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
