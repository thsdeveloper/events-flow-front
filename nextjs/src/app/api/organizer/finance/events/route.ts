import { NextRequest, NextResponse } from 'next/server';
import { readItems } from '@directus/sdk';
import { getOrganizerContext } from '../utils';

export async function GET(_request: NextRequest) {
	const context = await getOrganizerContext();

	if (!context.ok) {
		return context.response;
	}

	const { client, organizer } = context;

	try {
		const events = await client.request(
			readItems('events', {
				filter: {
					organizer_id: {
						_eq: organizer.id,
					},
				},
				fields: ['id', 'title'],
				sort: ['title'],
				limit: -1,
			}),
		);

		return NextResponse.json({ data: events ?? [] });
	} catch (error) {
		console.error('Erro ao buscar eventos para filtros financeiros:', error);

		return NextResponse.json(
			{ error: 'Não foi possível carregar os eventos.' },
			{ status: 500 },
		);
	}
}
