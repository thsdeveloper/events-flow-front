import { NextRequest, NextResponse } from 'next/server';
import { readItems, readMe } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const client = getAuthenticatedClient(token);

    // Verify user is authenticated
    const user = await client.request(readMe());
    if (!user?.id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    // Fetch events for the organizer
    const events = await client.request(
      readItems('events', {
        fields: ['id', 'title', 'start_date'],
        sort: ['-start_date'],
        limit: -1,
      })
    );

    return NextResponse.json({
      events,
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    
return NextResponse.json(
      { error: 'Erro ao carregar opções de filtro' },
      { status: 500 }
    );
  }
}
