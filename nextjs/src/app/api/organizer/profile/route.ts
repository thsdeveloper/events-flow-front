import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { updateItem, createItem } from '@directus/sdk';

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
		const { organizerId, name, email, phone, website, description } = body;

		if (!organizerId) {
			return NextResponse.json({ error: 'Organizer ID is required' }, { status: 400 });
		}

		// Update organizer in Directus
		const updatedOrganizer = await client.request(
			updateItem('organizers', organizerId, {
				name,
				email,
				phone,
				website,
				description,
			})
		);

		return NextResponse.json({ success: true, organizer: updatedOrganizer });
	} catch (error) {
		console.error('Error updating organizer profile:', error);
		return NextResponse.json(
			{ error: 'Failed to update organizer profile' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
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
		const { userId, name, email, phone, website, description } = body;

		if (!userId || !email) {
			return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 });
		}

		// Create organizer in Directus
		const newOrganizer = await client.request(
			createItem('organizers', {
				user_id: userId,
				name,
				email,
				phone,
				website,
				description,
				status: 'active',
			})
		);

		return NextResponse.json({ success: true, organizer: newOrganizer });
	} catch (error) {
		console.error('Error creating organizer profile:', error);
		return NextResponse.json(
			{ error: 'Failed to create organizer profile' },
			{ status: 500 }
		);
	}
}
