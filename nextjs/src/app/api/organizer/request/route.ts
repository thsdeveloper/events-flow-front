import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createItem, readItems } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { getServerAuth } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
	try {
		const auth = await getServerAuth();

		if (!auth) {
			return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
		}

		if (auth.isOrganizer) {
			return NextResponse.json(
				{ error: 'Você já possui acesso de organizador.' },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { name, email, phone, description, website } = body ?? {};

		if (!name || !email || !description) {
			return NextResponse.json(
				{ error: 'Informe nome, email e uma descrição dos seus eventos.' },
				{ status: 400 }
			);
		}

		const cookieStore = await cookies();
		const accessToken = cookieStore.get('access_token')?.value;

		if (!accessToken) {
			return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
		}

		const client = getAuthenticatedClient(accessToken);

		const existing = await client.request(
			readItems('organizers', {
				filter: {
					user_id: { _eq: auth.user.id },
					status: { _in: ['pending', 'active'] },
				},
				limit: 1,
			})
		);

		if (existing.length > 0) {
			return NextResponse.json(
				{ error: 'Já existe uma solicitação em análise ou um perfil ativo.' },
				{ status: 400 }
			);
		}

		const organizer = await client.request(
			createItem('organizers', {
				user_id: auth.user.id,
				name,
				email,
				phone: phone || null,
				description,
				website: website || null,
				status: 'pending',
			})
		);

		return NextResponse.json({ success: true, organizer });
	} catch (error) {
		console.error('Error creating organizer request:', error);

		return NextResponse.json(
			{ error: 'Não foi possível enviar sua solicitação. Tente novamente.' },
			{ status: 500 }
		);
	}
}
