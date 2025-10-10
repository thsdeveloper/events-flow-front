import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readMe, readItems } from '@directus/sdk';
import { getOrganizerByUserId } from '@/app/admin/participantes/_lib/queries';

export async function GET(request: NextRequest) {
  try {
    // 1. Get token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const client = getAuthenticatedClient(token);

    // 2. Get logged in user
    const user = await client.request(readMe());

    if (!user?.id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    // 3. Check if user is an organizer
    const organizer = await getOrganizerByUserId(user.id, client);

    if (!organizer) {
      return NextResponse.json({ error: 'Organizador não encontrado' }, { status: 403 });
    }

    // 4. Fetch events for this organizer
    const events = await client.request(
      readItems('events', {
        filter: {
          organizer_id: { _eq: organizer.id },
        },
        fields: ['id', 'title'],
        sort: ['-date_created'],
        limit: -1,
      })
    );

    // 5. Fetch all ticket types from the organizer's events
    const ticketTypes = await client.request(
      readItems('event_tickets', {
        filter: {
          event_id: {
            organizer_id: { _eq: organizer.id },
          },
        },
        fields: ['id', 'title'],
        sort: ['title'],
        limit: -1,
      })
    );

    // 6. Return options
    return NextResponse.json({
      events: events || [],
      ticketTypes: ticketTypes || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/participantes/filter-options:', error);

    return NextResponse.json(
      { error: 'Erro ao buscar opções de filtro' },
      { status: 500 }
    );
  }
}
