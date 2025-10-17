import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/api';
import { createUnauthorizedError } from '@/lib/errors';
import { getServerAuth } from '@/lib/auth/server-auth';

/**
 * Get current authenticated user from httpOnly cookies
 * Used by useServerAuth() hook for Client Components
 */
export const GET = withApi(async (request: NextRequest) => {
	const auth = await getServerAuth();

	if (!auth) {
		throw createUnauthorizedError(
			'Usuário não autenticado',
			request.headers.get('x-request-id') || undefined
		);
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
});
