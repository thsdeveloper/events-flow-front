import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readMe } from '@directus/sdk';
import { getOrganizerByUserId, performCheckIn, undoCheckIn } from '@/app/admin/participantes/_lib/queries';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/admin/participantes/[id]/checkin
 * Realiza check-in do participante
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // 5. Perform check-in
    const updated = await performCheckIn(id, organizer.id, client);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Check-in realizado com sucesso',
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/participantes/[id]/checkin:', error);

    // Handle business logic errors
    if (error.message?.includes('não encontrado') || error.message?.includes('não autorizado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message?.includes('cancelada')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Erro ao realizar check-in' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/participantes/[id]/checkin
 * Desfaz check-in do participante
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 5. Undo check-in
    const updated = await undoCheckIn(id, organizer.id, client);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Check-in desfeito com sucesso',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/participantes/[id]/checkin:', error);

    // Handle business logic errors
    if (error.message?.includes('não encontrado') || error.message?.includes('não autorizado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Erro ao desfazer check-in' },
      { status: 500 }
    );
  }
}
