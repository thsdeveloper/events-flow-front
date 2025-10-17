import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readMe, readItem, updateItem } from '@directus/sdk';
import { getOrganizerByUserId } from '@/app/admin/participantes/_lib/queries';
import type { CancelRegistrationData } from '@/app/admin/participantes/_lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const client = getAuthenticatedClient(token);

    // 2. Get logged-in user info
    const user = await client.request(readMe());

    if (!user?.id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    // 3. Verify user is an organizer
    const organizer = await getOrganizerByUserId(user.id, client);

    if (!organizer) {
      return NextResponse.json({ error: 'Organizador não encontrado' }, { status: 403 });
    }

    // 4. Get registration ID from params
    const { id: registrationId } = await params;

    // 5. Get current registration to verify ownership and status
    const currentRegistration = await client.request(
      readItem('event_registrations', registrationId, {
        fields: ['id', 'status', { event_id: ['id', 'organizer_id'] }],
      })
    );

    if (!currentRegistration) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 });
    }

    // 6. Verify ownership (organizer owns the event)
    const eventOrganizerId = (currentRegistration.event_id as any)?.organizer_id;
    if (eventOrganizerId !== organizer.id) {
      return NextResponse.json(
        { error: 'Você não tem permissão para cancelar esta inscrição' },
        { status: 403 }
      );
    }

    // 7. Verify status (only confirmed or pending can be cancelled)
    const currentStatus = currentRegistration.status;
    if (currentStatus !== 'confirmed' && currentStatus !== 'pending') {
      return NextResponse.json(
        {
          error: `Inscrições com status "${currentStatus}" não podem ser canceladas`,
        },
        { status: 400 }
      );
    }

    // 8. Parse and validate request body
    const body: CancelRegistrationData = await request.json();

    // Validate required reason field
    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json({ error: 'Motivo é obrigatório' }, { status: 400 });
    }

    if (body.reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'O motivo deve ter no mínimo 10 caracteres' },
        { status: 400 }
      );
    }

    if (body.reason.trim().length > 500) {
      return NextResponse.json(
        { error: 'O motivo deve ter no máximo 500 caracteres' },
        { status: 400 }
      );
    }

    // 9. Update registration to cancelled status
    const updatedRegistration = await client.request(
      updateItem('event_registrations', registrationId, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: body.reason.trim(),
      })
    );

    // 10. Return success response
    return NextResponse.json({
      success: true,
      data: updatedRegistration,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/participantes/[id]/cancel:', error);

    return NextResponse.json({ error: 'Erro ao cancelar inscrição' }, { status: 500 });
  }
}
