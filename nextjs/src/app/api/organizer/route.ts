import { NextRequest, NextResponse } from 'next/server';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

export async function GET(request: NextRequest) {
	try {
		// Read token from cookie first, then fall back to Authorization header
		const token = request.cookies.get('directus_token')?.value ||
		              request.headers.get('authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
		}

		// Validate user token
		const meResponse = await fetch(`${directusUrl}/users/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!meResponse.ok) {
			return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
		}

		const userId = request.nextUrl.searchParams.get('userId');

		if (!userId) {
			return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
		}

		// Use user token to get organizer
		const response = await fetch(
			`${directusUrl}/items/organizers?filter[user_id][_eq]=${userId}&fields=*,logo.*&limit=1`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao carregar organizador');
		}

		const data = await response.json();

		if (data.data && data.data.length > 0) {
			return NextResponse.json({ organizer: data.data[0] });
		}

		return NextResponse.json({ organizer: null });
	} catch (error: any) {
		console.error('Error loading organizer:', error);
		
return NextResponse.json(
			{ error: error.message || 'Erro ao carregar organizador' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Read token from cookie first, then fall back to Authorization header
		const token = request.cookies.get('directus_token')?.value ||
		              request.headers.get('authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
		}

		// Validate user token
		const meResponse = await fetch(`${directusUrl}/users/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!meResponse.ok) {
			return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
		}

		const body = await request.json();

		// Use user token to create organizer (respects permissions and proper audit trail)
		const response = await fetch(`${directusUrl}/items/organizers`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				email: body.email,
				phone: body.phone || null,
				description: body.description || null,
				website: body.website || null,
				document: body.document || null,
				status: body.status || 'active',
				user_id: body.user_id,
				...(body.logo && { logo: body.logo }),
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao criar organizador');
		}

		const data = await response.json();

		return NextResponse.json({ organizer: data.data });
	} catch (error: any) {
		console.error('Error creating organizer:', error);
		
return NextResponse.json(
			{ error: error.message || 'Erro ao criar organizador' },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		// Read token from cookie first, then fall back to Authorization header
		const token = request.cookies.get('directus_token')?.value ||
		              request.headers.get('authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
		}

		// Validate user token
		const meResponse = await fetch(`${directusUrl}/users/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!meResponse.ok) {
			return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
		}

		const body = await request.json();

		if (!body.id) {
			return NextResponse.json({ error: 'ID do organizador é obrigatório' }, { status: 400 });
		}

		// Use user token to update organizer (respects permissions and proper audit trail)
		const response = await fetch(`${directusUrl}/items/organizers/${body.id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				email: body.email,
				phone: body.phone || null,
				description: body.description || null,
				website: body.website || null,
				document: body.document || null,
				status: body.status || 'active',
				...(body.logo && { logo: body.logo }),
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao atualizar organizador');
		}

		const data = await response.json();

		return NextResponse.json({ organizer: data.data });
	} catch (error: any) {
		console.error('Error updating organizer:', error);
		
return NextResponse.json(
			{ error: error.message || 'Erro ao atualizar organizador' },
			{ status: 500 }
		);
	}
}
