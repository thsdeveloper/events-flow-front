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

		const eventId = request.nextUrl.searchParams.get('eventId');

		if (!eventId) {
			return NextResponse.json({ error: 'eventId é obrigatório' }, { status: 400 });
		}

		// Use user's token - Directus permissions will be enforced
		const response = await fetch(
			`${directusUrl}/items/event_tickets?filter[event_id][_eq]=${eventId}&sort=sort`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao buscar ingressos');
		}

		const data = await response.json();

		return NextResponse.json({ tickets: data.data || [] });
	} catch (error: any) {
		console.error('Error fetching tickets:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao buscar ingressos' },
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

		const body = await request.json();

		const ticketData: any = {
			event_id: body.event_id,
			title: body.title,
			description: body.description || null,
			quantity: body.quantity,
			price: body.price || 0,
			service_fee_type: body.service_fee_type || 'absorbed',
			sale_start_date: body.sale_start_date || null,
			sale_end_date: body.sale_end_date || null,
			min_quantity_per_purchase: body.min_quantity_per_purchase,
			max_quantity_per_purchase: body.max_quantity_per_purchase,
			visibility: body.visibility,
			status: body.status || 'active',
		};

		// Use user's token - Directus permissions will be enforced
		const response = await fetch(`${directusUrl}/items/event_tickets`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(ticketData),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao criar ingresso');
		}

		const data = await response.json();

		return NextResponse.json({ ticket: data.data });
	} catch (error: any) {
		console.error('Error creating ticket:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao criar ingresso' },
			{ status: 500 }
		);
	}
}
