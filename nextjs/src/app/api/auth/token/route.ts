import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth/cookies';

/**
 * Get access token from httpOnly cookies
 * Used by useDirectusClient() hook to access Directus API from client components
 *
 * Security Note: This endpoint exposes the access token to the client.
 * While this is necessary for direct Directus SDK usage, it's recommended
 * to use API routes for mutations instead when possible.
 */
export async function GET() {
	try {
		const token = await getAccessToken();

		if (!token) {

			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		return NextResponse.json({ token });
	} catch (error) {
		console.error('[Token API] Error getting token:', error);

		return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
	}
}
