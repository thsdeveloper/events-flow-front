import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readMe, readItem } from '@directus/sdk';
import { getOrganizerByUserId } from '@/app/admin/participantes/_lib/queries';

// Flow ID do Directus para envio de email de confirmação
const RESEND_EMAIL_FLOW_ID = '4e7ce624-bc73-44eb-9fda-20b6cd609f74'; // Flow de teste que está funcionando
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

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

    // 5. Get registration with full details for email
    const registration = await client.request(
      readItem('event_registrations', registrationId, {
        fields: [
          'id',
          'participant_name',
          'participant_email',
          'ticket_code',
          'status',
          {
            event_id: [
              'id',
              'title',
              'slug',
              'start_date',
              'end_date',
              'location_name',
              'location_address',
              'organizer_id',
            ],
          },
          {
            ticket_type_id: ['id', 'title', 'price', 'description'],
          },
        ],
      })
    );

    if (!registration) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 });
    }

    // 6. Verify ownership (organizer owns the event)
    const eventOrganizerId = (registration.event_id as any)?.organizer_id;
    if (eventOrganizerId !== organizer.id) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar esta inscrição' },
        { status: 403 }
      );
    }

    // 7. Validate email
    if (!registration.participant_email || !registration.participant_email.trim()) {
      return NextResponse.json(
        { error: 'Email do participante não encontrado' },
        { status: 400 }
      );
    }

    // 8. Trigger Directus Flow to send confirmation email
    // O Flow busca os dados completos da inscrição e envia o email formatado
    try {
      // Trigger flow usando REST API do Directus
      const flowResponse = await fetch(`${DIRECTUS_URL}/flows/trigger/${RESEND_EMAIL_FLOW_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          registration_id: registrationId,
        }),
      });

      if (!flowResponse.ok) {
        const errorData = await flowResponse.json().catch(() => ({}));
        throw new Error(errorData.errors?.[0]?.message || 'Erro ao executar flow do Directus');
      }

      console.log('Email sent successfully via Directus Flow:', {
        to: registration.participant_email,
        participantName: registration.participant_name,
        eventTitle: (registration.event_id as any)?.title,
        ticketCode: registration.ticket_code,
        flowId: RESEND_EMAIL_FLOW_ID,
      });
    } catch (emailError) {
      console.error('Error sending email via Directus Flow:', emailError);

      // Retornar erro específico se o envio falhar
      return NextResponse.json(
        {
          error: 'Erro ao enviar email',
          details: emailError instanceof Error ? emailError.message : 'Erro desconhecido',
        },
        { status: 500 }
      );
    }

    // 9. Return success response
    return NextResponse.json({
      success: true,
      message: 'Email reenviado com sucesso',
      data: {
        recipientEmail: registration.participant_email,
        participantName: registration.participant_name,
        eventTitle: (registration.event_id as any)?.title,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/participantes/[id]/resend-email:', error);

    return NextResponse.json(
      { error: 'Erro ao reenviar email' },
      { status: 500 }
    );
  }
}
