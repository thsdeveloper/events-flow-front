import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readMe } from '@directus/sdk';
import { getOrganizerByUserId, fetchParticipantById } from '@/app/admin/participantes/_lib/queries';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/admin/participantes/[id]
 * Busca detalhes completos de um participante
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 4. Get participant ID
    const { id } = await params;

    // 5. Fetch participant details
    const participant = await fetchParticipantById(id, organizer.id, client);

    if (!participant) {
      return NextResponse.json(
        { error: 'Participante não encontrado ou você não tem permissão para visualizá-lo' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: participant,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/participantes/[id]:', error);

    return NextResponse.json(
      { error: 'Erro ao buscar participante' },
      { status: 500 }
    );
  }
}
