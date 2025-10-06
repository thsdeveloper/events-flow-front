import { NextRequest, NextResponse } from 'next/server';
import { readMe } from '@directus/sdk';
import { getAuthClient } from '@/lib/directus/directus';
import { getRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
	try {
		// ⭐ Get refresh token from httpOnly cookie
		const refreshToken = await getRefreshToken();

		if (!refreshToken) {
			return NextResponse.json(
				{ error: 'Refresh token não fornecido' },
				{ status: 401 }
			);
		}

		// Use the auth client helper (includes rate limiting and retry logic)
		const client = getAuthClient();

		// Set the refresh token before calling refresh
		client.setToken(refreshToken);

		// Refresh the access token - returns new { access_token, expires, refresh_token }
		const authResult = await client.refresh();

		if (!authResult.access_token) {
			// Clear invalid cookies
			await clearAuthCookies();
			
return NextResponse.json(
				{ error: 'Falha ao renovar token' },
				{ status: 401 }
			);
		}

		// Get user data using the new access token
		const userData = await client.request(
			readMe({
				fields: ['*', { role: ['id', 'name'] }],
			})
		);

		// ⭐ Validate tokens
		if (!authResult.refresh_token) {
			throw new Error('No refresh token received from authentication');
		}
		if (authResult.expires === null || authResult.expires === undefined) {
			throw new Error('No expiration time received from authentication');
		}

		// ⭐ Update cookies with new tokens
		await setAuthCookies({
			access_token: authResult.access_token,
			refresh_token: authResult.refresh_token,
			expires: authResult.expires,
		});

		// ⭐ Return only user data (NO tokens in response body)
		return NextResponse.json({
			success: true,
			user: {
				id: userData.id,
				email: userData.email,
				first_name: userData.first_name,
				last_name: userData.last_name,
				role: userData.role,
			},
		});
	} catch (error: any) {
		console.error('Refresh token error:', error);

		// Clear invalid cookies
		await clearAuthCookies();

		return NextResponse.json(
			{ error: 'Token expirado. Faça login novamente.' },
			{ status: 401 }
		);
	}
}
