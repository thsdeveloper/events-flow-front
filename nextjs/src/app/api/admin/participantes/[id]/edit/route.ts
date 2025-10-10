import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readMe, readItem, readItems, updateItem } from '@directus/sdk';
import { getOrganizerByUserId } from '@/app/admin/participantes/_lib/queries';
import { isValidEmail, isValidBrazilianPhone } from '@/app/admin/participantes/_lib/utils';
import type { EditParticipantData } from '@/app/admin/participantes/_lib/types';

export async function PATCH(
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

    // 5. Get current registration to verify ownership
    const currentRegistration = await client.request(
      readItem('event_registrations', registrationId, {
        fields: ['id', 'participant_email', { event_id: ['id', 'organizer_id'] }],
      })
    );

    if (!currentRegistration) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 });
    }

    // 6. Verify ownership (organizer owns the event)
    const eventOrganizerId = (currentRegistration.event_id as any)?.organizer_id;
    if (eventOrganizerId !== organizer.id) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar esta inscrição' },
        { status: 403 }
      );
    }

    // 7. Parse and validate request body
    const body: EditParticipantData = await request.json();

    // Validate required fields
    if (!body.participant_name || !body.participant_name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    if (!body.participant_email || !body.participant_email.trim()) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Validate email format
    if (!isValidEmail(body.participant_email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Validate phone format (if provided)
    if (body.participant_phone && !isValidBrazilianPhone(body.participant_phone)) {
      return NextResponse.json(
        { error: 'Telefone deve estar no formato (XX) XXXXX-XXXX' },
        { status: 400 }
      );
    }

    // 8. Check if email is unique in the event (if email changed)
    if (body.participant_email !== currentRegistration.participant_email) {
      const eventId = (currentRegistration.event_id as any)?.id || currentRegistration.event_id;

      const existingRegistrations = await client.request(
        readItems('event_registrations', {
          filter: {
            event_id: { _eq: eventId },
            participant_email: { _eq: body.participant_email },
            id: { _neq: registrationId },
          },
          limit: 1,
        })
      );

      if (existingRegistrations.length > 0) {
        return NextResponse.json(
          { error: 'Este email já está registrado neste evento' },
          { status: 400 }
        );
      }
    }

    // 9. Update registration
    const updatedRegistration = await client.request(
      updateItem('event_registrations', registrationId, {
        participant_name: body.participant_name.trim(),
        participant_email: body.participant_email.trim(),
        participant_phone: body.participant_phone?.trim() || null,
        participant_document: body.participant_document?.trim() || null,
        notes: body.notes?.trim() || null,
      })
    );

    // 10. Return success response
    return NextResponse.json({
      success: true,
      data: updatedRegistration,
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/participantes/[id]/edit:', error);

    return NextResponse.json({ error: 'Erro ao editar participante' }, { status: 500 });
  }
}
