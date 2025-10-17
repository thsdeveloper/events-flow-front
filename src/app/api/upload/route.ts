import { cookies } from 'next/headers';
import { withApi } from '@/lib/api';
import { AppError } from '@/lib/errors';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export const POST = withApi(async (request) => {
	// Get authenticated user token from cookie
	const cookieStore = await cookies();
	const authToken = cookieStore.get('access_token')?.value;

	if (!authToken) {
		throw new AppError({
			message: 'Você precisa estar autenticado para fazer upload de arquivos. Faça login e tente novamente.',
			status: 401,
			code: 'AUTHENTICATION_REQUIRED',
			type: 'authentication-required',
			requestId: request.headers.get('x-request-id') ?? undefined,
		});
	}

	// Get folder parameter from query string
	const { searchParams } = new URL(request.url);
	const folderName = searchParams.get('folder') || 'events';

	// Check if folder exists
	let folderId: string | null = null;

	const foldersResponse = await fetch(`${DIRECTUS_URL}/folders?filter[name][_eq]=${encodeURIComponent(folderName)}`, {
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});

	if (foldersResponse.ok) {
		const foldersData = await foldersResponse.json();
		if (foldersData.data && foldersData.data.length > 0) {
			folderId = foldersData.data[0].id;
		} else {
			throw new AppError({
				message: `A pasta "${folderName}" não existe no Directus. Crie a pasta antes de fazer upload.`,
				status: 404,
				code: 'FOLDER_NOT_FOUND',
				type: 'folder-not-found',
				requestId: request.headers.get('x-request-id') ?? undefined,
			});
		}
	} else {
		throw new AppError({
			message: 'Não foi possível verificar se a pasta existe no Directus.',
			status: 500,
			code: 'FOLDER_CHECK_FAILED',
			type: 'folder-check-failed',
			requestId: request.headers.get('x-request-id') ?? undefined,
		});
	}

	const formData = await request.formData();
	const file = formData.get('file');

	if (!file || !(file instanceof File)) {
		throw new AppError({
			message: 'Nenhum arquivo foi enviado na requisição.',
			status: 400,
			code: 'FILE_NOT_PROVIDED',
			type: 'validation-error',
			requestId: request.headers.get('x-request-id') ?? undefined,
		});
	}

	// Validate file type
	if (!file.type.startsWith('image/')) {
		throw new AppError({
			message: 'Apenas arquivos de imagem são permitidos (JPG, PNG, GIF, WebP).',
			status: 400,
			code: 'INVALID_FILE_TYPE',
			type: 'validation-error',
			requestId: request.headers.get('x-request-id') ?? undefined,
		});
	}

	// Validate file size (5MB max)
	const maxSize = 5 * 1024 * 1024; // 5MB
	if (file.size > maxSize) {
		throw new AppError({
			message: `O arquivo deve ter no máximo 5MB. Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
			status: 400,
			code: 'FILE_TOO_LARGE',
			type: 'validation-error',
			requestId: request.headers.get('x-request-id') ?? undefined,
		});
	}

	// Upload the file to Directus
	const uploadFormData = new FormData();
	uploadFormData.append('file', file);
	if (folderId) {
		uploadFormData.append('folder', folderId);
	}

	const uploadResponse = await fetch(`${DIRECTUS_URL}/files`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
		body: uploadFormData,
	});

	if (!uploadResponse.ok) {
		const error = await uploadResponse.json().catch(() => ({}));
		console.error('Directus upload error:', error);

		throw new AppError({
			message: error?.errors?.[0]?.message || 'Não foi possível fazer upload da imagem no Directus. Tente novamente.',
			status: uploadResponse.status,
			code: 'UPLOAD_FAILED',
			type: 'upload-failed',
			requestId: request.headers.get('x-request-id') ?? undefined,
		});
	}

	const uploadData = await uploadResponse.json();
	const fileId = uploadData.data.id;

	return Response.json({
		fileId: fileId,
		filename: uploadData.data.filename_disk,
		url: `${DIRECTUS_URL}/assets/${fileId}`,
	});
});
