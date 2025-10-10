'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCcw } from 'lucide-react';
import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import FinanceOverview from './FinanceOverview';
import FinanceFilters, { type AppliedFilters, type FiltersDraft } from './FinanceFilters';
import TransactionsTable, { type TransactionRow, type TransactionSort } from './TransactionsTable';
import PayoutHistory, { type PayoutSummary } from './PayoutHistory';
import StripeAccountStatus from './StripeAccountStatus';

type OverviewMetrics = {
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

type PaginationState = {
	page: number;
	limit: number;
	total: number;
	pageCount: number;
};

type EventsOption = {
	id: string;
	title: string;
};

const DEFAULT_PAGINATION: PaginationState = {
	page: 1,
	limit: 20,
	total: 0,
	pageCount: 0,
};

const defaultFilters: AppliedFilters = {
	range: '30d',
	status: 'all',
	eventId: 'all',
	search: '',
	customFrom: null,
	customTo: null,
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
	style: 'currency',
	currency: 'BRL',
});

function isoDate(value: Date) {
	return value.toISOString();
}

function resolveDateWindow(filters: AppliedFilters) {
	if (filters.range === 'custom') {
		return {
			dateFrom: filters.customFrom,
			dateTo: filters.customTo,
		};
	}

	const now = new Date();
	const to = isoDate(now);
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
		dateFrom: isoDate(from),
		dateTo: to,
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

async function fetchJson<T>(input: RequestInfo, init?: RequestInit, signal?: AbortSignal): Promise<T> {
	const response = await fetch(input, { ...init, signal });

	if (!response.ok) {
		const errorPayload = await response.json().catch(() => ({}));
		const message = (errorPayload as any)?.error ?? 'Erro ao processar requisição';
		throw new Error(message);
	}

	return response.json();
}

function buildExportPayload(filters: AppliedFilters) {
	const { dateFrom, dateTo } = resolveDateWindow(filters);

	return {
		format: 'csv',
		status: filters.status !== 'all' ? filters.status : undefined,
		event_id: filters.eventId !== 'all' ? filters.eventId : undefined,
		search: filters.search || undefined,
		date_from: dateFrom ?? undefined,
		date_to: dateTo ?? undefined,
	};
}

interface FinanceiroDashboardProps {
	organizer: OrganizerProfile;
}

export default function FinanceiroDashboard({ organizer }: FinanceiroDashboardProps) {
	const [filters, setFilters] = useState<AppliedFilters>(defaultFilters);
	const [transactions, setTransactions] = useState<TransactionRow[]>([]);
	const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
	const [events, setEvents] = useState<EventsOption[]>([]);
	const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
	const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
	const [transactionsLoading, setTransactionsLoading] = useState(false);
	const [overviewLoading, setOverviewLoading] = useState(false);
	const [payoutLoading, setPayoutLoading] = useState(false);
	const [globalError, setGlobalError] = useState<string | null>(null);
	const [exporting, setExporting] = useState(false);
	const [sortState, setSortState] = useState<TransactionSort>({
		field: 'date',
		direction: 'desc',
	});
	const isMounted = useRef(true);

	useEffect(() => {
		isMounted.current = true;

		return () => {
			isMounted.current = false;
		};
	}, []);

	const appliedDateWindow = useMemo(() => resolveDateWindow(filters), [filters]);

	useEffect(() => {
		let active = true;

		const loadEvents = async () => {
			try {
				const data = await fetchJson<{ data: EventsOption[] }>(
					'/api/organizer/finance/events',
				);

				if (!active || !isMounted.current) {
					return;
				}

				setEvents(data.data ?? []);
			} catch (error) {
				if (!isAbortError(error) && active) {
					console.error('Erro ao buscar eventos:', error);
				}
			}
		};

		void loadEvents();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		const params = new URLSearchParams();

		params.set('range', filters.range);

		if (appliedDateWindow.dateFrom) {
			params.set('date_from', appliedDateWindow.dateFrom);
		}

		if (appliedDateWindow.dateTo) {
			params.set('date_to', appliedDateWindow.dateTo);
		}

		let active = true;

		const loadOverview = async () => {
			try {
				if (!isMounted.current || !active) {
					return;
				}

				setOverviewLoading(true);
				const data = await fetchJson<{ metrics: OverviewMetrics }>(
					'/api/organizer/finance/overview?' + params.toString(),
				);

				if (!active || !isMounted.current) {
					return;
				}

				setMetrics(data.metrics);
			} catch (error) {
				if (!isAbortError(error) && active) {
					console.error('Erro ao carregar overview financeiro:', error);
				}
			} finally {
				if (active && isMounted.current) {
					setOverviewLoading(false);
				}
			}
		};

		void loadOverview();

		return () => {
			active = false;
		};
	}, [filters, appliedDateWindow.dateFrom, appliedDateWindow.dateTo]);

	useEffect(() => {
		const controller = new AbortController();
		const params = new URLSearchParams();

		params.set('page', String(pagination.page));
		params.set('limit', String(pagination.limit));
		params.set('sort_field', sortState.field);
		params.set('sort_direction', sortState.direction);

		const { dateFrom, dateTo } = appliedDateWindow;

		if (filters.status !== 'all') {
			params.set('status', filters.status);
		}

		if (filters.eventId !== 'all') {
			params.set('event_id', filters.eventId);
		}

		if (filters.search) {
			params.set('search', filters.search);
		}

		if (dateFrom) {
			params.set('date_from', dateFrom);
		}

		if (dateTo) {
			params.set('date_to', dateTo);
		}

		let active = true;

		const loadTransactions = async () => {
			try {
				if (!isMounted.current || !active) {
					return;
				}

				setTransactionsLoading(true);
				setGlobalError(null);

				const data = await fetchJson<{
					data: any[];
					pagination: PaginationState;
				}>('/api/organizer/finance/transactions?' + params.toString());

				if (!active || !isMounted.current) {
					return;
				}

				setTransactions((data.data ?? []).map(mapTransactionRow));
				setPagination((prev) => ({
					...prev,
					...(data.pagination ?? DEFAULT_PAGINATION),
				}));
			} catch (error) {
				if (!isAbortError(error) && active) {
					console.error('Erro ao carregar transações:', error);
					setGlobalError(error instanceof Error ? error.message : 'Erro ao carregar transações');
					setTransactions([]);
					setPagination(DEFAULT_PAGINATION);
				}
			} finally {
				if (active && isMounted.current) {
					setTransactionsLoading(false);
				}
			}
		};

		void loadTransactions();

		return () => {
			active = false;
		};
	}, [
		filters,
		pagination.page,
		pagination.limit,
		sortState.direction,
		sortState.field,
		appliedDateWindow.dateFrom,
		appliedDateWindow.dateTo,
	]);

	const loadPayouts = useCallback(async () => {
		try {
			if (!isMounted.current) {
				return;
			}

			setPayoutLoading(true);
			const data = await fetchJson<PayoutSummary>('/api/organizer/finance/payouts');

			if (!isMounted.current) {
				return;
			}

			setPayoutSummary(data);
		} catch (error) {
			if (!isAbortError(error) && isMounted.current) {
				console.error('Erro ao carregar repasses:', error);
				setPayoutSummary(null);
			}
		} finally {
			if (isMounted.current) {
				setPayoutLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		let active = true;

		const load = async () => {
			if (!active) {
				return;
			}
			await loadPayouts();
		};

		void load();

		return () => {
			active = false;
		};
	}, [loadPayouts]);

	const handleFiltersApply = (draft: FiltersDraft) => {
		setFilters({
			range: draft.range,
			status: draft.status,
			eventId: draft.eventId,
			search: draft.search,
			customFrom: draft.customFrom,
			customTo: draft.customTo,
		});
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const handlePageChange = (page: number) => {
		setPagination((prev) => ({ ...prev, page }));
	};

	const handleSortChange = (sort: TransactionSort) => {
		setSortState(sort);
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const handleExport = async () => {
		try {
			setExporting(true);
			const payload = buildExportPayload(filters);
			const response = await fetch('/api/organizer/finance/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error((errorPayload as any)?.error ?? 'Falha ao exportar CSV');
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `financeiro-transacoes-${new Date()
				.toISOString()
				.replace(/[:.]/g, '-')}.csv`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Erro ao exportar CSV:', error);
			setGlobalError(error instanceof Error ? error.message : 'Erro ao exportar dados');
		} finally {
			setExporting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Financeiro
					</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Acompanhe vendas, taxas e repasses dos seus eventos
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						onClick={loadPayouts}
						disabled={payoutLoading}
					>
						<RefreshCcw className="size-4 mr-2" />
						Atualizar repasses
					</Button>
					<Button onClick={handleExport} disabled={exporting}>
						<Download className="size-4 mr-2" />
						Exportar CSV
					</Button>
				</div>
			</div>

			<FinanceFilters
				events={events}
				filters={filters}
				onApply={handleFiltersApply}
			/>

			<StripeAccountStatus organizer={organizer} payoutSummary={payoutSummary} />

			<FinanceOverview
				isLoading={overviewLoading}
				metrics={metrics}
				currencyFormatter={currencyFormatter}
			/>

			<Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
				<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle>Transações</CardTitle>
						<CardDescription>
							Vendas e pagamentos processados pelos seus eventos
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					{globalError && (
						<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
							{globalError}
						</div>
					)}
					<TransactionsTable
						rows={transactions}
						isLoading={transactionsLoading}
						pagination={pagination}
						onPageChange={handlePageChange}
						onSortChange={handleSortChange}
						sort={sortState}
						currencyFormatter={currencyFormatter}
					/>
				</CardContent>
			</Card>

			<PayoutHistory
				isLoading={payoutLoading}
				summary={payoutSummary}
				currencyFormatter={currencyFormatter}
			/>
		</div>
	);
}
const isAbortError = (error: unknown) => {
	if (!error) {
		return false;
	}

	if (error instanceof DOMException && error.name === 'AbortError') {
		return true;
	}

	return (error as { name?: string }).name === 'AbortError';
};
