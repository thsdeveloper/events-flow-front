import { NextRequest, NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/directus/directus';

export async function POST(request: NextRequest) {
	try {
		const { refresh_token } = await request.json();

		if (refresh_token) {
			// Use the auth client helper (includes rate limiting and retry logic)
			const client = getAuthClient();

			try {
				// Invalidate the refresh token on Directus backend
				await client.logout();
			} catch (error) {
				// Log but don't fail - token might already be invalid
				console.error('Error invalidating refresh token:', error);
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Logout realizado com sucesso'
		});
	} catch (error: any) {
		console.error('Logout error:', error);

		// Even if there's an error, return success
		return NextResponse.json({
			success: true,
			message: 'Logout realizado com sucesso'
		});
	}
}
