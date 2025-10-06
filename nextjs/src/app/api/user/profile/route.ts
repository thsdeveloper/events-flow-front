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
		const { userId, first_name, last_name, email } = body;

		if (!userId) {
			return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
		}

		// Update user in Directus
		const updatedUser = await client.request(
			updateUser(userId, {
				first_name,
				last_name,
				email,
			})
		);

		return NextResponse.json({ success: true, user: updatedUser });
	} catch (error) {
		console.error('Error updating user profile:', error);
		
return NextResponse.json(
			{ error: 'Failed to update profile' },
			{ status: 500 }
		);
	}
}
