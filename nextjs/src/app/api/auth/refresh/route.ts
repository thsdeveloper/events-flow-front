import { NextRequest, NextResponse } from 'next/server';
import { readMe } from '@directus/sdk';
import { getAuthClient } from '@/lib/directus/directus';

export async function POST(request: NextRequest) {
	try {
		const { refresh_token } = await request.json();

		if (!refresh_token) {
			return NextResponse.json(
				{ error: 'Refresh token não fornecido' },
				{ status: 401 }
			);
		}

		// Use the auth client helper (includes rate limiting and retry logic)
		const client = getAuthClient();

		// Refresh the access token - returns new { access_token, expires, refresh_token }
		const authResult = await client.refresh();

		if (!authResult.access_token) {
			return NextResponse.json(
				{ error: 'Falha ao renovar token' },
				{ status: 401 }
			);
		}

		// Get user data using the new access token
		const userData = await client.request(
			readMe({
				fields: ['*'],
			})
		);

		// Return new tokens and user data
		return NextResponse.json({
			success: true,
			access_token: authResult.access_token,
			refresh_token: authResult.refresh_token,
			expires: authResult.expires,
			user: userData
		});
	} catch (error: any) {
		console.error('Refresh token error:', error);

		return NextResponse.json(
			{ error: 'Token expirado. Faça login novamente.' },
			{ status: 401 }
		);
	}
}
