import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readMe } from '@directus/sdk';
import { getOrganizerByUserId, fetchParticipants } from '@/app/admin/participantes/_lib/queries';
import type { ParticipantFilters } from '@/app/admin/participantes/_lib/types';

/**
 * GET /api/admin/participantes/export
 * Exporta todos os participantes respeitando os filtros ativos
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const client = getAuthenticatedClient(token);

    // 2. Get current user
    const user = await client.request(readMe());

    if (!user?.id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    // 3. Verify organizer
    const organizer = await getOrganizerByUserId(user.id, client);

    if (!organizer) {
      return NextResponse.json({ error: 'Organizador não encontrado' }, { status: 403 });
    }

    // 4. Parse filters from query params
    const { searchParams } = new URL(request.url);

    const filters: ParticipantFilters = {
      search: searchParams.get('search') || '',
      eventIds: searchParams.get('eventIds')?.split(',').filter(Boolean) || [],
      ticketTypeIds: searchParams.get('ticketTypeIds')?.split(',').filter(Boolean) || [],
      registrationStatus: (searchParams.get('registrationStatus')?.split(',').filter(Boolean) || []) as any[],
      paymentStatus: (searchParams.get('paymentStatus')?.split(',').filter(Boolean) || []) as any[],
      hasCheckedIn: searchParams.get('hasCheckedIn') === 'true'
        ? true
        : searchParams.get('hasCheckedIn') === 'false'
        ? false
        : null,
      checkInDateRange: {
        start: searchParams.get('checkInDateStart') || null,
        end: searchParams.get('checkInDateEnd') || null,
      },
    };

    // 5. Fetch ALL participants with filters (no pagination)
    const { data } = await fetchParticipants(
      organizer.id,
      1, // page
      10000, // large limit to get all
      filters,
      'date_created',
      'desc',
      client
    );

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/participantes/export:', error);

    return NextResponse.json(
      { error: 'Erro ao exportar participantes' },
      { status: 500 }
    );
  }
}
