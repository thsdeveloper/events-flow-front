import { NextRequest, NextResponse } from 'next/server';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

export async function PATCH(request: NextRequest) {
	try {
		const token = request.headers.get('authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
		}

		// First, get the user ID from the token
		const meResponse = await fetch(`${directusUrl}/users/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!meResponse.ok) {
			return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
		}

		const meData = await meResponse.json();
		const userId = meData.data.id;

		const body = await request.json();

		const updateData: Record<string, any> = {};

		if (body.first_name !== undefined) updateData.first_name = body.first_name;
		if (body.last_name !== undefined) updateData.last_name = body.last_name;
		if (body.location !== undefined) updateData.location = body.location;
		if (body.title !== undefined) updateData.title = body.title;
		if (body.description !== undefined) updateData.description = body.description;
		if (body.avatar) updateData.avatar = body.avatar;

		// Use admin token to update user (bypass permissions)
		const adminToken = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_PUBLIC_TOKEN;

		const response = await fetch(`${directusUrl}/users/${userId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify(updateData),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Directus API Error:', errorData);
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao atualizar perfil');
		}

		const data = await response.json();

		return NextResponse.json({ user: data.data });
	} catch (error: any) {
		console.error('Error updating profile:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao atualizar perfil' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const token = request.headers.get('authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
		}

		// Upload file using fetch with admin token
		const uploadFormData = new FormData();
		uploadFormData.append('file', file);

		const adminToken = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_PUBLIC_TOKEN;

		const response = await fetch(`${directusUrl}/files`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${adminToken}`,
			},
			body: uploadFormData,
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao fazer upload');
		}

		const data = await response.json();

		return NextResponse.json({ file: data.data });
	} catch (error: any) {
		console.error('Error uploading file:', error);
		return NextResponse.json({ error: error.message || 'Erro ao fazer upload' }, { status: 500 });
	}
}
