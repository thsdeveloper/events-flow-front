import { NextRequest, NextResponse } from 'next/server';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
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
		const response = await fetch(`${directusUrl}/items/event_tickets/${id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(ticketData),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao atualizar ingresso');
		}

		const data = await response.json();

		return NextResponse.json({ ticket: data.data });
	} catch (error: any) {
		console.error('Error updating ticket:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao atualizar ingresso' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		// Read token from cookie first, then fall back to Authorization header
		const token = request.cookies.get('directus_token')?.value ||
		              request.headers.get('authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
		}

		// Use user's token - Directus permissions will be enforced
		const response = await fetch(`${directusUrl}/items/event_tickets/${id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao deletar ingresso');
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Error deleting ticket:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao deletar ingresso' },
			{ status: 500 }
		);
	}
}
