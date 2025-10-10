import { NextRequest, NextResponse } from 'next/server';
import { aggregate, readItems } from '@directus/sdk';
import { buildTransactionFilter, getOrganizerContext, normalizeLimit, normalizePage } from '../utils';

export async function GET(request: NextRequest) {
	const context = await getOrganizerContext();

	if (!context.ok) {
		return context.response;
	}

	const { client, organizer } = context;
	const { searchParams } = new URL(request.url);
	const page = normalizePage(searchParams.get('page'));
	const limit = normalizeLimit(searchParams.get('limit'));

	const sortFieldParam = searchParams.get('sort_field') ?? 'date';
	const sortDirection = searchParams.get('sort_direction') === 'asc' ? 'asc' : 'desc';

	const sortMap: Record<string, string> = {
		date: 'date_created',
		status: 'status',
		gross: 'registration_id.total_amount',
		fee: 'registration_id.service_fee',
		net: 'registration_id.payment_amount',
	};

	const sortField = sortMap[sortFieldParam] ?? sortMap.date;
	const sortValue = sortDirection === 'asc' ? sortField : `-${sortField}`;

	const filter = buildTransactionFilter(
		{
			status: searchParams.get('status'),
			dateFrom: searchParams.get('date_from'),
			dateTo: searchParams.get('date_to'),
			eventId: searchParams.get('event_id'),
			search: searchParams.get('search'),
		},
		organizer.id,
	);

	try {
		const [transactions, totalResult, statusAggregations] = await Promise.all([
			client.request(
				readItems('payment_transactions', {
					filter: filter as any,
					page,
					limit,
					sort: [sortValue] as any,
					fields: [
						'id',
						'stripe_event_id',
						'stripe_object_id',
						'event_type',
						'amount',
						'status',
						'metadata',
						'date_created',
						{
							registration_id: [
								'id',
								'participant_name',
								'participant_email',
								'participant_phone',
								'quantity',
								'payment_status',
								'payment_amount',
								'service_fee',
								'total_amount',
								'unit_price',
								'payment_method',
								'stripe_payment_intent_id',
								'date_created',
								{
									event_id: ['id', 'title'],
								},
								{
									ticket_type_id: ['id', 'title'],
								},
							],
						},
					],
				}),
			),
			client.request(
				aggregate('payment_transactions', {
					filter: filter as any,
					aggregate: { count: '*' },
				}),
			),
			client.request(
				aggregate('payment_transactions', {
					filter: filter as any,
					groupBy: ['status'],
					aggregate: {
						count: '*',
						sum: ['amount'],
					},
				}),
			),
		]);

		const total = Number(totalResult?.[0]?.count ?? 0);
		const pageCount = total > 0 ? Math.ceil(total / limit) : 0;

		const statusSummary = statusAggregations?.reduce<Record<string, { count: number; amount: number }>>(
			(acc: Record<string, { count: number; amount: number }>, item: any) => {
				const statusKey = item?.status ?? 'desconhecido';
				const count = Number(item?.count ?? 0);
				const amount = Number(item?.sum?.amount ?? 0);

				acc[statusKey] = {
					count,
					amount,
				};

				return acc;
			},
			{},
		) ?? {};

		return NextResponse.json({
			data: transactions ?? [],
			pagination: {
				page,
				limit,
				total,
				pageCount,
			},
			summary: {
				status: statusSummary,
			},
		});
	} catch (error) {
		console.error('Erro ao buscar transações financeiras:', error);

		return NextResponse.json(
			{ error: 'Não foi possível carregar as transações financeiras.' },
			{ status: 500 },
		);
	}
}
