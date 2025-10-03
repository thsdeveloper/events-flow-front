import { NextRequest, NextResponse } from 'next/server';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

function generateSlug(title: string): string {
	const baseSlug = title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	// Add random suffix to ensure uniqueness
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	return `${baseSlug}-${randomSuffix}`;
}

export async function POST(request: NextRequest) {
	try {
		// Read token from cookie first, then fall back to Authorization header
		const token = request.cookies.get('directus_token')?.value ||
		              request.headers.get('authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
		}

		// Get user info
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

		// Get organizer profile for this user
		const organizerResponse = await fetch(
			`${directusUrl}/items/organizers?filter[user_id][_eq]=${userId}&limit=1`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (!organizerResponse.ok) {
			const errorText = await organizerResponse.text();
			console.error('Error fetching organizer:', organizerResponse.status, errorText);
			return NextResponse.json(
				{ error: `Erro ao buscar organizador: ${organizerResponse.status}` },
				{ status: 500 }
			);
		}

		const organizerText = await organizerResponse.text();
		console.log('Organizer response:', organizerText);

		let organizerData;
		try {
			organizerData = JSON.parse(organizerText);
		} catch (e) {
			console.error('Error parsing organizer JSON:', e);
			return NextResponse.json(
				{ error: 'Erro ao processar resposta do organizador' },
				{ status: 500 }
			);
		}

		// Check if user has an organizer profile
		if (!organizerData.data || organizerData.data.length === 0) {
			return NextResponse.json(
				{ error: 'Você precisa criar um perfil de organizador primeiro' },
				{ status: 400 }
			);
		}

		const organizerId = organizerData.data[0].id;

		const body = await request.json();

		// Generate slug from title
		const slug = generateSlug(body.title);

		// Create event with organizer_id
		const eventData = {
			title: body.title,
			slug: slug,
			description: body.description || null,
			short_description: body.short_description || null,
			organizer_id: organizerId,
			start_date: body.start_date,
			end_date: body.end_date,
			status: body.status || 'draft',
			event_type: body.event_type || 'in_person',
			location_name: body.location_name || null,
			location_address: body.location_address || null,
			online_url: body.online_url || null,
			max_attendees: body.max_attendees || null,
			registration_start: body.registration_start || null,
			registration_end: body.registration_end || null,
			is_free: body.is_free !== undefined ? body.is_free : true,
			price: body.price || null,
			category_id: body.category_id || null,
			cover_image: body.cover_image || null,
			tags: body.tags || null,
			featured: body.featured || false,
		};

		// Use user's token - Directus permissions will be enforced
		const response = await fetch(`${directusUrl}/items/events`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(eventData),
		});

		const responseText = await response.text();
		let data;

		try {
			data = responseText ? JSON.parse(responseText) : {};
		} catch (e) {
			console.error('Error parsing event creation response:', e, responseText);
			throw new Error('Erro ao processar resposta da criação do evento');
		}

		if (!response.ok) {
			throw new Error(data.errors?.[0]?.message || 'Erro ao criar evento');
		}

		return NextResponse.json({ event: data.data });
	} catch (error: any) {
		console.error('Error creating event:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao criar evento' },
			{ status: 500 }
		);
	}
}

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

		// Get user data to debug
		const userData = await meResponse.json();
		console.log('User ID:', userData.data.id);

		// Get events - Directus permissions will automatically filter based on user's role
		// No manual filters needed! The policy handles: organizer_id._eq.$CURRENT_USER.organizer_id
		const response = await fetch(
			`${directusUrl}/items/events?fields=*,category_id.*,cover_image.*,organizer_id.*&sort=-date_created`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		const responseText = await response.text();
		console.log('Events response status:', response.status);
		console.log('Events response:', responseText);

		if (!response.ok) {
			let errorData;
			try {
				errorData = JSON.parse(responseText);
			} catch (e) {
				throw new Error(`Erro ao buscar eventos: ${response.status}`);
			}
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao buscar eventos');
		}

		let data;
		try {
			data = JSON.parse(responseText);
		} catch (e) {
			console.error('Error parsing events response:', e);
			return NextResponse.json({ events: [] });
		}

		console.log('Events found:', data.data?.length || 0);

		return NextResponse.json({ events: data.data || [] });
	} catch (error: any) {
		console.error('Error fetching events:', error);
		return NextResponse.json(
			{ error: error.message || 'Erro ao buscar eventos' },
			{ status: 500 }
		);
	}
}
