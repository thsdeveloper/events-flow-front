import { NextRequest } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { updateUser } from '@directus/sdk';
import { withApi, validateBody } from '@/lib/api';
import { AppError, createUnauthorizedError } from '@/lib/errors';
import { z } from 'zod';

const updatePasswordSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const PATCH = withApi(async (request: NextRequest) => {
	// Get token from Authorization header
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw createUnauthorizedError('No valid authorization token provided');
	}

	const token = authHeader.replace('Bearer ', '');
	const client = getAuthenticatedClient(token);

	// Validate request body
	const body = await validateBody(request, updatePasswordSchema);

	// Update user password in Directus
	await client.request(
		updateUser(body.userId, {
			password: body.password,
		})
	);

	return Response.json({ success: true });
});
