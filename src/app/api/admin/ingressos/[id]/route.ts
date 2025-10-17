import { NextRequest, NextResponse } from 'next/server';
import { updateItem, deleteItem, readMe } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';

const SERVICE_FEE_PERCENTAGE = 0.05;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json();
    const { id } = await context.params;

    const normalizedPrice = typeof body.price === 'number' && Number.isFinite(body.price)
      ? body.price
      : 0;
    const serviceFeeType = body.service_fee_type ?? (normalizedPrice > 0 ? 'passed_to_buyer' : 'absorbed');

    const updateData: Record<string, unknown> = {
      ...body,
      service_fee_type: serviceFeeType,
    };

    updateData.price = normalizedPrice;

    if (normalizedPrice > 0) {
      const serviceFee = normalizedPrice * SERVICE_FEE_PERCENTAGE;
      updateData.buyer_price = serviceFeeType === 'absorbed'
        ? normalizedPrice
        : normalizedPrice + serviceFee;
    } else {
      updateData.buyer_price = 0;
    }

    const updatedTicket = await client.request(
      updateItem('event_tickets', id, updateData)
    );

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    
return NextResponse.json(
      { error: 'Erro ao atualizar ingresso', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;

    await client.request(deleteItem('event_tickets', id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    
return NextResponse.json(
      { error: 'Erro ao excluir ingresso', message: (error as Error).message },
      { status: 500 }
    );
  }
}
