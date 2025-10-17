import { NextRequest, NextResponse } from 'next/server';
import { readItem, createItem, readMe } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';

export async function POST(
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

    // Get the original ticket
    const originalTicket = await client.request(
      readItem('event_tickets', id, {
        fields: [
          'event_id',
          'title',
          'description',
          'quantity',
          'price',
          'service_fee_type',
          'buyer_price',
          'sale_start_date',
          'sale_end_date',
          'min_quantity_per_purchase',
          'max_quantity_per_purchase',
          'visibility',
          'allow_installments',
          'max_installments',
          'min_amount_for_installments',
        ],
      })
    );

    // Create duplicate with modified title
    const duplicateData = {
      ...originalTicket,
      title: `${originalTicket.title} - Cópia`,
      quantity_sold: 0,
      status: 'inactive' as const, // Start as inactive
      sort: 0,
    };

    const newTicket = await client.request(
      createItem('event_tickets', duplicateData)
    );

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error) {
    console.error('Error duplicating ticket:', error);
    
return NextResponse.json(
      { error: 'Erro ao duplicar ingresso', message: (error as Error).message },
      { status: 500 }
    );
  }
}
