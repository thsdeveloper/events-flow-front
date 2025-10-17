import { NextRequest } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { updateUser } from '@directus/sdk';
import { withApi, validateBody } from '@/lib/api';
import { AppError, createUnauthorizedError } from '@/lib/errors';
import { z } from 'zod';

const updateProfileSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	email: z.string().email().optional(),
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
	const body = await validateBody(request, updateProfileSchema);

	// Update user in Directus
	const updatedUser = await client.request(
		updateUser(body.userId, {
			first_name: body.first_name,
			last_name: body.last_name,
			email: body.email,
		})
	);

	return Response.json({ success: true, user: updatedUser });
});
