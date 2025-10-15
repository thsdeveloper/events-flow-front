import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readMe } from '@directus/sdk';
import { getOrganizerByUserId, fetchParticipants, fetchParticipantMetrics } from '@/app/admin/participantes/_lib/queries';
import type { ParticipantFilters } from '@/app/admin/participantes/_lib/types';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { isAuthenticationError, parseDirectusError } from '@/lib/directus/error-utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const client = getAuthenticatedClient(token);

    // 2. Pegar informações do usuário logado
    const user = await client.request(readMe());

    if (!user?.id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    // 3. Verificar se é organizador
    const organizer = await getOrganizerByUserId(user.id, client);

    if (!organizer) {
      return NextResponse.json({ error: 'Organizador não encontrado' }, { status: 403 });
    }

    // 4. Parsear query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const sortField = searchParams.get('sortField') || 'date_created';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';

    // Filtros
    const filters: ParticipantFilters = {
      search: searchParams.get('search') || '',
      eventIds: searchParams.get('eventIds')?.split(',').filter(Boolean) || [],
      ticketTypeIds: searchParams.get('ticketTypeIds')?.split(',').filter(Boolean) || [],
      registrationStatus: (searchParams.get('registrationStatus')?.split(',').filter(Boolean) || []) as any[],
      paymentStatus: (searchParams.get('paymentStatus')?.split(',').filter(Boolean) || []) as any[],
      hasCheckedIn: searchParams.get('hasCheckedIn') === 'true' ? true : searchParams.get('hasCheckedIn') === 'false' ? false : null,
      checkInDateRange: {
        start: searchParams.get('checkInStart') || null,
        end: searchParams.get('checkInEnd') || null,
      },
    };

    // 5. Buscar dados
    const [participantsData, metrics] = await Promise.all([
      fetchParticipants(organizer.id, page, limit, filters, sortField, sortDirection, client),
      fetchParticipantMetrics(organizer.id, filters, client),
    ]);

    // 6. Retornar resposta
    return NextResponse.json({
      data: participantsData.data,
      meta: {
        total: participantsData.total,
        page,
        limit,
        pageCount: Math.ceil(participantsData.total / limit),
      },
      metrics,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      try {
        await clearAuthCookies();
      } catch (cookieError) {
        console.error('Failed to clear auth cookies after auth error in GET /api/admin/participantes:', cookieError);
      }

      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const parsedError = parseDirectusError(error);

    console.error('Error in GET /api/admin/participantes:', {
      error,
      parsedError,
    });

    return NextResponse.json(
      { error: 'Erro ao buscar participantes' },
      { status: 500 }
    );
  }
}
