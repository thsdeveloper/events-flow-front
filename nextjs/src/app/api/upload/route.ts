import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const FORM_TOKEN = process.env.DIRECTUS_FORM_TOKEN;

export async function POST(request: NextRequest) {
	try {
		if (!FORM_TOKEN) {
			return NextResponse.json(
				{ error: 'Form token not configured' },
				{ status: 500 }
			);
		}

		// Get folder parameter from query string
		const { searchParams } = new URL(request.url);
		const folderName = searchParams.get('folder') || 'events';

		// Check if folder exists, create if not
		let folderId: string | null = null;

		const foldersResponse = await fetch(`${DIRECTUS_URL}/folders?filter[name][_eq]=${folderName}`, {
			headers: {
				Authorization: `Bearer ${FORM_TOKEN}`,
			},
		});

		if (foldersResponse.ok) {
			const foldersData = await foldersResponse.json();
			if (foldersData.data && foldersData.data.length > 0) {
				folderId = foldersData.data[0].id;
			} else {
				// Create folder if it doesn't exist
				const createFolderResponse = await fetch(`${DIRECTUS_URL}/folders`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${FORM_TOKEN}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ name: folderName }),
				});

				if (createFolderResponse.ok) {
					const folderData = await createFolderResponse.json();
					folderId = folderData.data.id;
				}
			}
		}

		const formData = await request.formData();
		const file = formData.get('file');

		if (!file) {
			return NextResponse.json(
				{ error: 'No file provided' },
				{ status: 400 }
			);
		}

		// First, upload the file
		const uploadFormData = new FormData();
		uploadFormData.append('file', file);

		const uploadResponse = await fetch(`${DIRECTUS_URL}/files`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${FORM_TOKEN}`,
			},
			body: uploadFormData,
		});

		if (!uploadResponse.ok) {
			const error = await uploadResponse.json();
			console.error('Directus upload error:', error);
			return NextResponse.json(
				{ error: 'Failed to upload file' },
				{ status: uploadResponse.status }
			);
		}

		const uploadData = await uploadResponse.json();
		const fileId = uploadData.data.id;

		// Then, update the file to move it to the folder
		if (folderId) {
			const updateResponse = await fetch(`${DIRECTUS_URL}/files/${fileId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${FORM_TOKEN}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					folder: folderId,
				}),
			});

			if (!updateResponse.ok) {
				console.error('Failed to move file to folder, but file was uploaded');
			}
		}

		return NextResponse.json({
			fileId: fileId,
			filename: uploadData.data.filename_disk,
		});
	} catch (error) {
		console.error('Upload error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
