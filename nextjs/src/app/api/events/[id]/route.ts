import { NextRequest, NextResponse } from 'next/server';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

export async function GET(
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

		// Validate user token
		const meResponse = await fetch(`${directusUrl}/users/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!meResponse.ok) {
			return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
		}

		const userData = await meResponse.json();
		const userId = userData.data.id;

		// Get organizer_id for this user
		const organizerResponse = await fetch(
			`${directusUrl}/items/organizers?filter[user_id][_eq]=${userId}&limit=1`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (!organizerResponse.ok) {
			return NextResponse.json(
				{ error: 'Erro ao buscar organizador' },
				{ status: 500 }
			);
		}

		const organizerData = await organizerResponse.json();

		if (!organizerData.data || organizerData.data.length === 0) {
			return NextResponse.json(
				{ error: 'Organizador não encontrado' },
				{ status: 404 }
			);
		}

		const organizerId = organizerData.data[0].id;

		// Get event with all related data
		const response = await fetch(
			`${directusUrl}/items/events/${id}?fields=*,category_id.*,cover_image.*,organizer_id.*,registrations.*`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (!response.ok) {
			if (response.status === 404) {
				return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
			}
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao buscar evento');
		}

		const data = await response.json();

		// Verify that the event belongs to this organizer
		const eventOrganizerId = typeof data.data.organizer_id === 'object'
			? data.data.organizer_id.id
			: data.data.organizer_id;

		if (eventOrganizerId !== organizerId) {
			return NextResponse.json(
				{ error: 'Você não tem permissão para acessar este evento' },
				{ status: 403 }
			);
		}

		return NextResponse.json({ event: data.data });
	} catch (error: any) {
		console.error('Error fetching event:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao buscar evento' },
			{ status: 500 }
		);
	}
}

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

		// Validate user token
		const meResponse = await fetch(`${directusUrl}/users/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!meResponse.ok) {
			return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
		}

		const userData = await meResponse.json();
		const userId = userData.data.id;

		// Get organizer_id for this user
		const organizerResponse = await fetch(
			`${directusUrl}/items/organizers?filter[user_id][_eq]=${userId}&limit=1`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (!organizerResponse.ok) {
			return NextResponse.json(
				{ error: 'Erro ao buscar organizador' },
				{ status: 500 }
			);
		}

		const organizerData = await organizerResponse.json();

		if (!organizerData.data || organizerData.data.length === 0) {
			return NextResponse.json(
				{ error: 'Organizador não encontrado' },
				{ status: 404 }
			);
		}

		const organizerId = organizerData.data[0].id;

		// Verify event belongs to this organizer
		const eventResponse = await fetch(`${directusUrl}/items/events/${id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!eventResponse.ok) {
			return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
		}

		const eventData = await eventResponse.json();
		const eventOrganizerId = typeof eventData.data.organizer_id === 'object'
			? eventData.data.organizer_id.id
			: eventData.data.organizer_id;

		if (eventOrganizerId !== organizerId) {
			return NextResponse.json(
				{ error: 'Você não tem permissão para editar este evento' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		// Update event
		const updateData: any = {};

		// Only include fields that are provided
		if (body.title !== undefined) updateData.title = body.title;
		if (body.description !== undefined) updateData.description = body.description;
		if (body.short_description !== undefined) updateData.short_description = body.short_description;
		if (body.start_date !== undefined) updateData.start_date = body.start_date;
		if (body.end_date !== undefined) updateData.end_date = body.end_date;
		if (body.status !== undefined) updateData.status = body.status;
		if (body.event_type !== undefined) updateData.event_type = body.event_type;
		if (body.location_name !== undefined) updateData.location_name = body.location_name;
		if (body.location_address !== undefined) updateData.location_address = body.location_address;
		if (body.online_url !== undefined) updateData.online_url = body.online_url;
		if (body.max_attendees !== undefined) updateData.max_attendees = body.max_attendees;
		if (body.registration_start !== undefined) updateData.registration_start = body.registration_start;
		if (body.registration_end !== undefined) updateData.registration_end = body.registration_end;
		if (body.is_free !== undefined) updateData.is_free = body.is_free;
		if (body.price !== undefined) updateData.price = body.price;
		if (body.category_id !== undefined) updateData.category_id = body.category_id;
		if (body.cover_image !== undefined) updateData.cover_image = body.cover_image;
		if (body.tags !== undefined) updateData.tags = body.tags;
		if (body.featured !== undefined) updateData.featured = body.featured;

		const response = await fetch(`${directusUrl}/items/events/${id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(updateData),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao atualizar evento');
		}

		const data = await response.json();

		return NextResponse.json({ event: data.data });
	} catch (error: any) {
		console.error('Error updating event:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao atualizar evento' },
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

		// Validate user token
		const meResponse = await fetch(`${directusUrl}/users/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!meResponse.ok) {
			return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
		}

		const userData = await meResponse.json();
		const userId = userData.data.id;

		// Get organizer_id for this user
		const organizerResponse = await fetch(
			`${directusUrl}/items/organizers?filter[user_id][_eq]=${userId}&limit=1`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (!organizerResponse.ok) {
			return NextResponse.json(
				{ error: 'Erro ao buscar organizador' },
				{ status: 500 }
			);
		}

		const organizerData = await organizerResponse.json();

		if (!organizerData.data || organizerData.data.length === 0) {
			return NextResponse.json(
				{ error: 'Organizador não encontrado' },
				{ status: 404 }
			);
		}

		const organizerId = organizerData.data[0].id;

		// Verify event belongs to this organizer
		const eventResponse = await fetch(`${directusUrl}/items/events/${id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!eventResponse.ok) {
			return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
		}

		const eventData = await eventResponse.json();
		const eventOrganizerId = typeof eventData.data.organizer_id === 'object'
			? eventData.data.organizer_id.id
			: eventData.data.organizer_id;

		if (eventOrganizerId !== organizerId) {
			return NextResponse.json(
				{ error: 'Você não tem permissão para deletar este evento' },
				{ status: 403 }
			);
		}

		// Delete event
		const response = await fetch(`${directusUrl}/items/events/${id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao deletar evento');
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Error deleting event:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao deletar evento' },
			{ status: 500 }
		);
	}
}
