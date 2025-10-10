import { NextRequest, NextResponse } from 'next/server';
import { aggregate } from '@directus/sdk';
import { getOrganizerContext } from '../utils';

type PeriodRange = '30d' | '90d' | 'year' | 'custom';

function resolvePeriod(range: PeriodRange, customFrom?: string | null, customTo?: string | null) {
	const now = new Date();
	const end = customTo ? new Date(customTo) : now;

	let start: Date | null = null;

	switch (range) {
		case '90d': {
			const date = new Date(end);
			date.setDate(date.getDate() - 89);
			start = date;
			break;
		}
		case 'year': {
			const date = new Date(end);
			date.setFullYear(date.getFullYear() - 1);
			date.setDate(date.getDate() + 1);
			start = date;
			break;
		}
		case 'custom': {
			start = customFrom ? new Date(customFrom) : null;
			break;
		}
		case '30d':
		default: {
			const date = new Date(end);
			date.setDate(date.getDate() - 29);
			start = date;
			break;
		}
	}

	const startIso = start && !Number.isNaN(start.getTime()) ? start.toISOString() : null;
	const endIso = end && !Number.isNaN(end.getTime()) ? end.toISOString() : null;

	return { startIso, endIso };
}

function buildRegistrationFilter(organizerId: string, startIso: string | null, endIso: string | null) {
	const clauses: any[] = [
		{
			event_id: {
				organizer_id: { _eq: organizerId },
			},
		},
	];

	if (startIso && endIso) {
		clauses.push({
			date_created: {
				_between: [startIso, endIso],
			},
		});
	} else if (startIso) {
		clauses.push({
			date_created: {
				_gte: startIso,
			},
		});
	} else if (endIso) {
		clauses.push({
			date_created: {
				_lte: endIso,
			},
		});
	}

	return { _and: clauses };
}

export async function GET(request: NextRequest) {
	const context = await getOrganizerContext();

	if (!context.ok) {
		return context.response;
	}

	const { client, organizer } = context;
	const { searchParams } = new URL(request.url);
	const range = (searchParams.get('range') as PeriodRange | null) ?? '30d';
	const dateFrom = searchParams.get('date_from');
	const dateTo = searchParams.get('date_to');

	const { startIso, endIso } = resolvePeriod(range, dateFrom, dateTo);
	const filter = buildRegistrationFilter(organizer.id, startIso, endIso);

	try {
		const [totals, statuses] = await Promise.all([
			client.request(
				aggregate('event_registrations', {
					filter,
					aggregate: {
						sum: ['total_amount', 'service_fee', 'payment_amount', 'quantity'],
						count: '*',
					},
				}),
			),
			client.request(
				aggregate('event_registrations', {
					filter,
					groupBy: ['payment_status'],
					aggregate: {
						sum: ['total_amount', 'service_fee', 'payment_amount', 'quantity'],
						count: '*',
					},
				}),
			),
		]);

		const totalsRow: any = totals?.[0] ?? {};

		const statusMap = statuses?.reduce<Record<string, any>>((acc, item: any) => {
			if (!item) {
				return acc;
			}

			const key = item.payment_status ?? 'desconhecido';
			acc[key] = item;

			return acc;
		}, {}) ?? {};

		const paidData = statusMap.paid ?? {};
		const pendingData = statusMap.pending ?? {};
		const refundedData = statusMap.refunded ?? {};

		const gross = Number(paidData?.sum?.total_amount ?? 0);
		const serviceFees = Number(paidData?.sum?.service_fee ?? 0);
		const net = Number(paidData?.sum?.payment_amount ?? 0);
		const ticketsSold = Number(paidData?.sum?.quantity ?? 0);
		const totalTransactions = Number(paidData?.count ?? 0);
		const averageTicket = totalTransactions > 0 ? gross / totalTransactions : 0;

		return NextResponse.json({
			period: {
				range,
				start: startIso,
				end: endIso,
			},
			metrics: {
				gross,
				serviceFees,
				net,
				ticketsSold,
				totalTransactions,
				averageTicket,
				pendingCount: Number(pendingData?.count ?? 0),
				refundedCount: Number(refundedData?.count ?? 0),
				allRegistrations: Number(totalsRow?.count ?? 0),
				allGross: Number(totalsRow?.sum?.total_amount ?? 0),
			},
		});
	} catch (error) {
		console.error('Erro ao calcular overview financeiro:', error);

		return NextResponse.json(
			{ error: 'Não foi possível calcular as métricas financeiras.' },
			{ status: 500 },
		);
	}
}
