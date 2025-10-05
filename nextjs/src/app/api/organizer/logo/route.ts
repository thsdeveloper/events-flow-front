import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { uploadFiles, updateItem } from '@directus/sdk';

export async function POST(request: NextRequest) {
	try {
		// Get token from Authorization header
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.replace('Bearer ', '');
		const client = getAuthenticatedClient(token);

		// Parse form data
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const organizerId = formData.get('organizerId') as string;

		if (!file) {
			return NextResponse.json({ error: 'File is required' }, { status: 400 });
		}

		if (!organizerId) {
			return NextResponse.json({ error: 'Organizer ID is required' }, { status: 400 });
		}

		// Create FormData for Directus upload
		const uploadFormData = new FormData();
		uploadFormData.append('file', file);

		// Upload file to Directus
		const uploadedFile = await client.request(uploadFiles(uploadFormData));

		// Update organizer with new logo
		const updatedOrganizer = await client.request(
			updateItem('organizers', organizerId, {
				logo: uploadedFile.id,
			})
		);

		return NextResponse.json({
			success: true,
			file: uploadedFile,
			organizer: updatedOrganizer
		});
	} catch (error) {
		console.error('Error uploading logo:', error);
		return NextResponse.json(
			{ error: 'Failed to upload logo' },
			{ status: 500 }
		);
	}
}
