import { NextRequest, NextResponse } from 'next/server';
import { readMe } from '@directus/sdk';
import { getAuthClient } from '@/lib/directus/directus';
import { getRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';
import { withApi } from '@/lib/api';
import { AppError, createUnauthorizedError, fromDirectusError } from '@/lib/errors';

export const POST = withApi(async (request: NextRequest) => {
	// Get refresh token from httpOnly cookie
	const refreshToken = await getRefreshToken();

	if (!refreshToken) {
		throw createUnauthorizedError('Refresh token não fornecido');
	}

	// Use the auth client helper (includes rate limiting and retry logic)
	const client = getAuthClient();

	// Set the refresh token before calling refresh
	client.setToken(refreshToken);

	// Refresh the access token - returns new { access_token, expires, refresh_token }
	let authResult;
	try {
		authResult = await client.refresh();
	} catch (error: any) {
		await clearAuthCookies();
		throw fromDirectusError(error, 'Token expirado. Faça login novamente.');
	}

	if (!authResult.access_token) {
		// Clear invalid cookies
		await clearAuthCookies();
		throw createUnauthorizedError('Falha ao renovar token');
	}

	// Get user data using the new access token
	const userData = await client.request(
		readMe({
			fields: ['*', { role: ['id', 'name'] }],
		})
	);

	// Validate tokens
	if (!authResult.refresh_token) {
		throw new AppError('No refresh token received from authentication', 500);
	}
	if (authResult.expires === null || authResult.expires === undefined) {
		throw new AppError('No expiration time received from authentication', 500);
	}

	// Update cookies with new tokens
	await setAuthCookies({
		access_token: authResult.access_token,
		refresh_token: authResult.refresh_token,
		expires: authResult.expires,
	});

	// Return only user data (NO tokens in response body)
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
});
