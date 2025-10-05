import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { updateUser } from '@directus/sdk';

export async function PATCH(request: NextRequest) {
	try {
		// Get token from Authorization header
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.replace('Bearer ', '');
		const client = getAuthenticatedClient(token);

		// Parse request body
		const body = await request.json();
		const { userId, password } = body;

		if (!userId || !password) {
			return NextResponse.json(
				{ error: 'User ID and password are required' },
				{ status: 400 }
			);
		}

		// Validate password length
		if (password.length < 8) {
			return NextResponse.json(
				{ error: 'Password must be at least 8 characters' },
				{ status: 400 }
			);
		}

		// Update user password in Directus
		await client.request(
			updateUser(userId, {
				password,
			})
		);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error updating password:', error);
		return NextResponse.json(
			{ error: 'Failed to update password' },
			{ status: 500 }
		);
	}
}
