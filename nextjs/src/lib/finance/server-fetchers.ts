import 'server-only';
import { aggregate, readItems } from '@directus/sdk';
import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { stripe, formatAmountFromStripe } from '@/lib/stripe/server';
import type { Schema } from '@/types/directus-schema';

// ================== Types ==================

export type EventsOption = {
	id: string;
	title: string;
};

export type OverviewMetrics = {
	gross: number;
	serviceFees: number;
	net: number;
	ticketsSold: number;
	totalTransactions: number;
	averageTicket: number;
	pendingCount: number;
	refundedCount: number;
	allRegistrations: number;
	allGross: number;
};

export type TransactionRow = {
	id: string;
	date: string;
	status: string;
	transactionId: string;
	eventTitle: string;
	participantName: string;
	participantEmail: string;
	quantity: number;
	gross: number;
	fee: number;
	net: number;
	paymentStatus: string;
	paymentIntentId: string;
};

export type PaginationState = {
	page: number;
	limit: number;
	total: number;
	pageCount: number;
};

export type TransactionsResult = {
	data: TransactionRow[];
	pagination: PaginationState;
};

export type PayoutItem = {
	id: string;
	amount: number;
	currency: string;
	status: string;
	createdAt: string | null;
	arrivalDate: string | null;
	description: string | null;
	statementDescriptor: string | null;
	destination: string | null;
};

export type PayoutSummary = {
	balance: {
		available: number;
		pending: number;
		currency: string;
	};
	payouts: PayoutItem[];
	alert?: string;
};

export type AppliedFilters = {
	range: '30d' | '90d' | 'year' | 'custom';
	status: string;
	eventId: string;
	search: string;
	customFrom: string | null;
	customTo: string | null;
};

// ================== Helper Functions ==================

function resolveDateWindow(filters: AppliedFilters) {
	if (filters.range === 'custom') {
		return {
			dateFrom: filters.customFrom,
			dateTo: filters.customTo,
		};
	}

	const now = new Date();
	const to = now.toISOString();
	const from = new Date(now);

	switch (filters.range) {
		case '90d':
			from.setDate(from.getDate() - 89);
			break;
		case 'year':
			from.setFullYear(from.getFullYear() - 1);
			from.setDate(from.getDate() + 1);
			break;
		case '30d':
		default:
			from.setDate(from.getDate() - 29);
			break;
	}

	return {
		dateFrom: from.toISOString(),
		dateTo: to,
	};
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

function normalizeDateStart(value?: string | null): string | null {
	if (!value) {
		return null;
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	date.setHours(0, 0, 0, 0);

	return date.toISOString();
}

function normalizeDateEnd(value?: string | null): string | null {
	if (!value) {
		return null;
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	date.setHours(23, 59, 59, 999);

	return date.toISOString();
}

function buildTransactionFilter(
	filters: AppliedFilters,
	organizerId: string,
	page: number,
	limit: number,
) {
	const clauses: any[] = [
		{
			registration_id: {
				event_id: {
					organizer_id: { _eq: organizerId },
				},
			},
		},
	];

	if (filters.status !== 'all') {
		clauses.push({
			status: { _eq: filters.status },
		});
	}

	const { dateFrom, dateTo } = resolveDateWindow(filters);
	const fromIso = normalizeDateStart(dateFrom);
	const toIso = normalizeDateEnd(dateTo);
	const dateFilter: Record<string, string | [string, string]> = {};

	if (fromIso && toIso) {
		dateFilter._between = [fromIso, toIso];
	} else if (fromIso) {
		dateFilter._gte = fromIso;
	} else if (toIso) {
		dateFilter._lte = toIso;
	}

	if (Object.keys(dateFilter).length > 0) {
		clauses.push({ date_created: dateFilter });
	}

	if (filters.eventId !== 'all') {
		clauses.push({
			registration_id: {
				event_id: {
					id: { _eq: filters.eventId },
				},
			},
		});
	}

	if (filters.search) {
		const like = { _icontains: filters.search };
		clauses.push({
			_or: [
				{ stripe_object_id: like },
				{ stripe_event_id: like },
				{ registration_id: { participant_name: like } },
				{ registration_id: { participant_email: like } },
				{ registration_id: { stripe_payment_intent_id: like } },
			],
		});
	}

	return {
		_and: clauses,
	};
}

function mapTransactionRow(transaction: any): TransactionRow {
	const registration = transaction?.registration_id ?? {};
	const event = registration?.event_id ?? {};

	return {
		id: transaction?.id ?? '',
		date: transaction?.date_created ?? '',
		status: transaction?.status ?? 'pending',
		transactionId: transaction?.stripe_object_id ?? transaction?.stripe_event_id ?? '',
		eventTitle: event?.title ?? 'Evento não informado',
		participantName: registration?.participant_name ?? '—',
		participantEmail: registration?.participant_email ?? '',
		quantity: Number(registration?.quantity ?? 0),
		gross: Number(registration?.total_amount ?? transaction?.amount ?? 0),
		fee: Number(registration?.service_fee ?? 0),
		net: Number(registration?.payment_amount ?? 0),
		paymentStatus: registration?.payment_status ?? 'pending',
		paymentIntentId: registration?.stripe_payment_intent_id ?? '',
	};
}

function formatStripeTimestamp(timestamp?: number | null) {
	if (!timestamp) {
		return null;
	}

	return new Date(timestamp * 1000).toISOString();
}

// ================== Server Fetchers ==================

/**
 * Fetch events list for finance filters
 */
export async function fetchFinanceEvents(
	organizer: OrganizerProfile,
	accessToken: string,
): Promise<EventsOption[]> {
	const client = getAuthenticatedClient(accessToken);

	try {
		const events = await client.request(
			readItems('events', {
				filter: {
					organizer_id: {
						_eq: organizer.id,
					},
				},
				fields: ['id', 'title'],
				sort: ['title'],
				limit: -1,
			}),
		);

		return events ?? [];
	} catch (error) {
		console.error('Erro ao buscar eventos para filtros financeiros:', error);

		return [];
	}
}

/**
 * Fetch financial overview metrics
 */
export async function fetchFinanceOverview(
	organizer: OrganizerProfile,
	accessToken: string,
	filters: AppliedFilters,
): Promise<OverviewMetrics> {
	const client = getAuthenticatedClient(accessToken);
	const { dateFrom, dateTo } = resolveDateWindow(filters);
	const filter = buildRegistrationFilter(organizer.id, dateFrom, dateTo);

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

		const statusMap =
			statuses?.reduce<Record<string, any>>((acc, item: any) => {
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

		return {
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
		};
	} catch (error) {
		console.error('Erro ao calcular overview financeiro:', error);

		return {
			gross: 0,
			serviceFees: 0,
			net: 0,
			ticketsSold: 0,
			totalTransactions: 0,
			averageTicket: 0,
			pendingCount: 0,
			refundedCount: 0,
			allRegistrations: 0,
			allGross: 0,
		};
	}
}

/**
 * Fetch transactions with pagination
 */
export async function fetchTransactions(
	organizer: OrganizerProfile,
	accessToken: string,
	filters: AppliedFilters,
	page: number = 1,
	limit: number = 20,
	sortField: string = 'date',
	sortDirection: 'asc' | 'desc' = 'desc',
): Promise<TransactionsResult> {
	const client = getAuthenticatedClient(accessToken);

	const sortMap: Record<string, string> = {
		date: 'date_created',
		status: 'status',
		gross: 'registration_id.total_amount',
		fee: 'registration_id.service_fee',
		net: 'registration_id.payment_amount',
	};

	const field = sortMap[sortField] ?? sortMap.date;
	const sortValue = sortDirection === 'asc' ? field : `-${field}`;

	const filter = buildTransactionFilter(filters, organizer.id, page, limit);

	try {
		const [transactions, totalResult] = await Promise.all([
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
		]);

		const total = Number(totalResult?.[0]?.count ?? 0);
		const pageCount = total > 0 ? Math.ceil(total / limit) : 0;

		return {
			data: (transactions ?? []).map(mapTransactionRow),
			pagination: {
				page,
				limit,
				total,
				pageCount,
			},
		};
	} catch (error) {
		console.error('Erro ao buscar transações financeiras:', error);

		return {
			data: [],
			pagination: {
				page: 1,
				limit: 20,
				total: 0,
				pageCount: 0,
			},
		};
	}
}

/**
 * Fetch Stripe payouts summary
 */
export async function fetchPayouts(organizer: OrganizerProfile): Promise<PayoutSummary> {
	if (!organizer.stripe_account_id) {
		return {
			balance: {
				available: 0,
				pending: 0,
				currency: 'brl',
			},
			payouts: [],
			alert: 'Conta Stripe Connect não configurada.',
		};
	}

	try {
		const [balance, payouts] = await Promise.all([
			stripe.balance.retrieve({
				stripeAccount: organizer.stripe_account_id,
			}),
			stripe.payouts.list(
				{
					limit: 25,
				},
				{
					stripeAccount: organizer.stripe_account_id,
				},
			),
		]);

		const available = balance.available
			.filter((entry) => entry.currency === 'brl')
			.reduce((sum, entry) => sum + formatAmountFromStripe(entry.amount), 0);

		const pending = balance.pending
			.filter((entry) => entry.currency === 'brl')
			.reduce((sum, entry) => sum + formatAmountFromStripe(entry.amount), 0);

		const payoutsData: PayoutItem[] = payouts.data.map((payout) => ({
			id: payout.id,
			amount: formatAmountFromStripe(payout.amount),
			currency: payout.currency,
			status: payout.status,
			createdAt: formatStripeTimestamp(payout.created),
			arrivalDate: formatStripeTimestamp(payout.arrival_date),
			description: payout.description ?? null,
			statementDescriptor: payout.statement_descriptor ?? null,
			destination:
				typeof payout.destination === 'string' ? payout.destination : payout.destination?.id ?? null,
		}));

		return {
			balance: {
				available,
				pending,
				currency: 'brl',
			},
			payouts: payoutsData,
		};
	} catch (error) {
		console.error('Erro ao buscar repasses do Stripe:', error);

		return {
			balance: {
				available: 0,
				pending: 0,
				currency: 'brl',
			},
			payouts: [],
			alert: 'Erro ao carregar repasses do Stripe.',
		};
	}
}
