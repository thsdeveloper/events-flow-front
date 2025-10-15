import { NextRequest, NextResponse } from 'next/server';
import { readItems, createItem, readMe } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';

const ITEMS_PER_PAGE = 20;
const SERVICE_FEE_PERCENTAGE = 0.05;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const eventIds = searchParams.get('eventIds')?.split(',').filter(Boolean) || [];
    const status = searchParams.get('status')?.split(',').filter(Boolean) || [];

    // Get token from Authorization header
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

    // Build filter
    const filter: any = {};

    if (search) {
      filter._or = [
        { title: { _contains: search } },
        { 'event_id.title': { _contains: search } },
      ];
    }

    if (eventIds.length > 0) {
      filter.event_id = { _in: eventIds };
    }

    if (status.length > 0) {
      filter.status = { _in: status };
    }

    // Fetch tickets with pagination
    const tickets = await client.request(
      readItems('event_tickets', {
        fields: [
          'id',
          'status',
          'title',
          'description',
          'quantity',
          'quantity_sold',
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
          'date_created',
          'date_updated',
          {
            event_id: [
              'id',
              'title',
              'start_date',
              { cover_image: ['id'] },
            ],
          },
        ],
        filter,
        limit: ITEMS_PER_PAGE,
        page,
        sort: ['-date_created'],
      })
    );

    // Get total count for pagination
    const totalItems = await client.request(
      readItems('event_tickets', {
        filter,
        aggregate: { count: '*' },
      })
    );

    const total = Array.isArray(totalItems) ? totalItems.length : (totalItems as any)[0]?.count || 0;
    const pageCount = Math.ceil(total / ITEMS_PER_PAGE);

    return NextResponse.json({
      data: tickets,
      meta: {
        total,
        page,
        pageCount,
        perPage: ITEMS_PER_PAGE,
      },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    
return NextResponse.json(
      { error: 'Erro ao carregar ingressos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const normalizedPrice = typeof body.price === 'number' && Number.isFinite(body.price)
      ? body.price
      : 0;
    const serviceFeeType = body.service_fee_type ?? (normalizedPrice > 0 ? 'passed_to_buyer' : 'absorbed');

    let buyer_price: number | null = null;
    if (normalizedPrice !== undefined && normalizedPrice > 0) {
      const serviceFee = normalizedPrice * SERVICE_FEE_PERCENTAGE;
      buyer_price = serviceFeeType === 'absorbed' ? normalizedPrice : normalizedPrice + serviceFee;
    }

    const ticketData: Record<string, unknown> = {
      ...body,
      service_fee_type: serviceFeeType,
      quantity_sold: 0,
      sort: 0,
    };

    ticketData.price = normalizedPrice;

    if (buyer_price !== null) {
      ticketData.buyer_price = buyer_price;
    } else {
      ticketData.buyer_price = 0;
    }

    const newTicket = await client.request(
      createItem('event_tickets', ticketData)
    );

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error) {
    console.error('Error creating ticket:', error);
    
return NextResponse.json(
      { error: 'Erro ao criar ingresso', message: (error as Error).message },
      { status: 500 }
    );
  }
}
