import { NextRequest, NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/directus/directus';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
	try {
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
	} catch (error: any) {
		console.error('Logout error:', error);

		// Even if there's an error, clear cookies and return success
		await clearAuthCookies();

		return NextResponse.json({
			success: true,
			message: 'Logout realizado com sucesso'
		});
	}
}
