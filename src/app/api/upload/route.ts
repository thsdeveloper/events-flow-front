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
			status: 401,
			title: 'Não autenticado',
			detail: 'Você precisa estar autenticado para fazer upload de arquivos. Faça login e tente novamente.',
			type: 'authentication-required',
			instance: request.headers.get('x-request-id') || undefined,
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
				status: 404,
				title: 'Pasta não encontrada',
				detail: `A pasta "${folderName}" não existe no Directus. Crie a pasta antes de fazer upload.`,
				type: 'folder-not-found',
				instance: request.headers.get('x-request-id') || undefined,
			});
		}
	} else {
		throw new AppError({
			status: 500,
			title: 'Erro ao buscar pasta',
			detail: 'Não foi possível verificar se a pasta existe no Directus.',
			type: 'folder-check-failed',
			instance: request.headers.get('x-request-id') || undefined,
		});
	}

	const formData = await request.formData();
	const file = formData.get('file');

	if (!file || !(file instanceof File)) {
		throw new AppError({
			status: 400,
			title: 'Arquivo não enviado',
			detail: 'Nenhum arquivo foi enviado na requisição.',
			type: 'validation-error',
			instance: request.headers.get('x-request-id') || undefined,
		});
	}

	// Validate file type
	if (!file.type.startsWith('image/')) {
		throw new AppError({
			status: 400,
			title: 'Tipo de arquivo inválido',
			detail: 'Apenas arquivos de imagem são permitidos (JPG, PNG, GIF, WebP).',
			type: 'validation-error',
			instance: request.headers.get('x-request-id') || undefined,
		});
	}

	// Validate file size (5MB max)
	const maxSize = 5 * 1024 * 1024; // 5MB
	if (file.size > maxSize) {
		throw new AppError({
			status: 400,
			title: 'Arquivo muito grande',
			detail: `O arquivo deve ter no máximo 5MB. Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
			type: 'validation-error',
			instance: request.headers.get('x-request-id') || undefined,
		});
	}

	// Upload the file to Directus
	const uploadFormData = new FormData();
	uploadFormData.append('file', file);
	uploadFormData.append('folder', folderId);

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
			status: uploadResponse.status,
			title: 'Erro ao fazer upload',
			detail: error?.errors?.[0]?.message || 'Não foi possível fazer upload da imagem no Directus. Tente novamente.',
			type: 'upload-failed',
			instance: request.headers.get('x-request-id') || undefined,
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
