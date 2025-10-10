import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const FORM_TOKEN = process.env.DIRECTUS_FORM_TOKEN;
const AI_COVER_GENERATOR_URL = process.env.AI_COVER_GENERATOR_URL;
const AI_COVER_GENERATOR_TOKEN = process.env.AI_COVER_GENERATOR_TOKEN;
const AI_COVER_FOLDER = process.env.AI_COVER_FOLDER || 'events';

async function ensureFolder(formToken: string, folderName: string): Promise<string | null> {
	const foldersResponse = await fetch(`${DIRECTUS_URL}/folders?filter[name][_eq]=${folderName}`, {
		headers: {
			Authorization: `Bearer ${formToken}`,
		},
	});

	if (!foldersResponse.ok) {
		return null;
	}

	const foldersData = await foldersResponse.json();
	if (Array.isArray(foldersData?.data) && foldersData.data.length > 0) {
		return foldersData.data[0].id as string;
	}

	const createFolderResponse = await fetch(`${DIRECTUS_URL}/folders`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${formToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ name: folderName }),
	});

	if (!createFolderResponse.ok) {
		return null;
	}

	const folderData = await createFolderResponse.json();

	return folderData?.data?.id ?? null;
}

export async function POST(request: NextRequest) {
	try {
		if (!AI_COVER_GENERATOR_URL) {
			return NextResponse.json(
				{ error: 'Serviço de geração de imagens não configurado.' },
				{ status: 501 },
			);
		}

		if (!FORM_TOKEN) {
			return NextResponse.json(
				{ error: 'Token de formulário do Directus não configurado.' },
				{ status: 500 },
			);
		}

		const payload = await request.json();
		const title = payload?.title as string | undefined;
		const description = payload?.description as string | undefined;
		const categoryId = payload?.categoryId as string | undefined;

		if (!title) {
			return NextResponse.json(
				{ error: 'Informe o título do evento para gerar a capa.' },
				{ status: 400 },
			);
		}

		const prompt = [
			title,
			description ? `Detalhes: ${description}` : null,
			categoryId ? `Categoria: ${categoryId}` : null,
			'Estilo vibrante, atraente, para destaque de evento, proporção 1200x630, foco no tema principal.',
		]
			.filter(Boolean)
			.join(' | ');

		const generatorResponse = await fetch(AI_COVER_GENERATOR_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(AI_COVER_GENERATOR_TOKEN ? { Authorization: `Bearer ${AI_COVER_GENERATOR_TOKEN}` } : {}),
			},
			body: JSON.stringify({
				prompt,
				aspectRatio: '1200x630',
				title,
			}),
		});

		if (!generatorResponse.ok) {
			let message = 'Falha ao gerar imagem com o serviço configurado.';
			try {
				const data = await generatorResponse.json();
				message = data?.error ?? message;
			} catch {
				// ignore
			}

			return NextResponse.json({ error: message }, { status: generatorResponse.status });
		}

		const generatorData = await generatorResponse.json();
		const imageBase64 = generatorData?.imageBase64 as string | undefined;
		const imageUrl = generatorData?.imageUrl || generatorData?.image_url;

		let imageBuffer: Buffer | null = null;

		if (imageBase64) {
			imageBuffer = Buffer.from(imageBase64, 'base64');
		} else if (imageUrl) {
			const download = await fetch(imageUrl);
			if (!download.ok) {
				return NextResponse.json(
					{ error: 'Não foi possível baixar a imagem gerada.' },
					{ status: download.status },
				);
			}

			const arrayBuffer = await download.arrayBuffer();
			imageBuffer = Buffer.from(arrayBuffer);
		}

		if (!imageBuffer) {
			return NextResponse.json(
				{ error: 'O serviço de IA não retornou uma imagem válida.' },
				{ status: 500 },
			);
		}

		const fileName = `event-cover-${Date.now()}.png`;
		const uploadFormData = new FormData();
		uploadFormData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), fileName);

		const folderId = await ensureFolder(FORM_TOKEN, AI_COVER_FOLDER);

		const uploadResponse = await fetch(`${DIRECTUS_URL}/files`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${FORM_TOKEN}`,
			},
			body: uploadFormData,
		});

		if (!uploadResponse.ok) {
			console.error('Directus upload error', await uploadResponse.text());

			return NextResponse.json({ error: 'Falha ao enviar a imagem ao Directus.' }, { status: uploadResponse.status });
		}

		const uploadData = await uploadResponse.json();
		const fileId = uploadData?.data?.id as string | undefined;

		if (!fileId) {
			return NextResponse.json({ error: 'Upload concluído, mas sem identificação do arquivo.' }, { status: 500 });
		}

		if (folderId) {
			await fetch(`${DIRECTUS_URL}/files/${fileId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${FORM_TOKEN}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ folder: folderId }),
			}).catch(error => {
				console.error('Falha ao atribuir pasta ao arquivo gerado', error);
			});
		}

		return NextResponse.json({
			fileId,
			assetUrl: `${DIRECTUS_URL}/assets/${fileId}`,
		});
	} catch (error) {
		console.error('AI cover generation error:', error);

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Erro ao gerar a imagem.' },
			{ status: 500 },
		);
	}
}
