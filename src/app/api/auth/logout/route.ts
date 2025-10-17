import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/api';
import { getAuthClient } from '@/lib/directus/directus';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth/cookies';

export const POST = withApi(async (request: NextRequest) => {
	// ⭐ Get refresh token from httpOnly cookie
	const refreshToken = await getRefreshToken();

	if (refreshToken) {
		// Use the auth client helper (includes rate limiting and retry logic)
		const client = getAuthClient();

		try {
			// Set the refresh token and invalidate on Directus backend
			client.setToken(refreshToken);
			await client.logout();
		} catch (error) {
			// Log but don't fail - token might already be invalid
			console.error('Error invalidating refresh token:', error);
		}
	}

	// ⭐ Clear all authentication cookies
	await clearAuthCookies();

	return NextResponse.json({
		success: true,
		message: 'Logout realizado com sucesso'
	});
});
