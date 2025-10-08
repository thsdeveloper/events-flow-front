import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth/server-auth';

/**
 * Get current authenticated user from httpOnly cookies
 * Used by useServerAuth() hook for Client Components
 */
export async function GET() {
	try {
		const auth = await getServerAuth();

		if (!auth) {

			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		return NextResponse.json({
			user: {
				id: auth.user.id,
				email: auth.user.email,
				first_name: auth.user.first_name,
				last_name: auth.user.last_name,
				role: auth.user.role,
			},
			isOrganizer: auth.isOrganizer,
			organizerStatus: auth.organizerStatus ?? null,
			hasPendingOrganizerRequest: auth.hasPendingOrganizerRequest ?? false,
		});
	} catch (error) {
		console.error('[Auth API] Error getting current user:', error);

		return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
	}
}
