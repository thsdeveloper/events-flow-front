import { NextRequest, NextResponse } from 'next/server';
import { readItems } from '@directus/sdk';
import { buildTransactionFilter, getOrganizerContext, type TransactionFilterInput } from '../utils';

const EXPORT_BATCH_SIZE = 200;

type ExportFormat = 'csv' | 'xlsx';

function getExportFormat(value?: string | null): ExportFormat {
	if (value === 'xlsx') {
		return 'xlsx';
	}

	return 'csv';
}

function formatCurrency(value?: number | null) {
	return Number(value ?? 0);
}

function buildCsvContent(rows: Record<string, unknown>[]) {
	const headers = [
		'Data',
		'ID Transação',
		'Evento',
		'Participante',
		'Email',
		'Quantidade',
		'Valor Bruto',
		'Taxa',
		'Valor Líquido',
		'Status',
	];

	const lines = [
		headers.join(';'),
		...rows.map((row) =>
			[
				row.date,
				row.transactionId,
				row.event,
				row.participant,
				row.email,
				row.quantity,
				row.gross,
				row.fee,
				row.net,
				row.status,
			]
				.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
				.join(';'),
		),
	];

	return lines.join('\n');
}

function mapTransactionToRow(transaction: any) {
	const registration = transaction?.registration_id ?? {};
	const event = registration?.event_id ?? {};

	return {
		date: transaction?.date_created ?? '',
		transactionId: transaction?.stripe_object_id ?? transaction?.id ?? '',
		event: event?.title ?? '',
		participant: registration?.participant_name ?? '',
		email: registration?.participant_email ?? '',
		quantity: registration?.quantity ?? 0,
		gross: formatCurrency(registration?.total_amount),
		fee: formatCurrency(registration?.service_fee),
		net: formatCurrency(registration?.payment_amount),
		status: transaction?.status ?? 'desconhecido',
	};
}

function getFiltersFromBody(body: any): TransactionFilterInput {
	return {
		status: body?.status ?? null,
		dateFrom: body?.date_from ?? null,
		dateTo: body?.date_to ?? null,
		eventId: body?.event_id ?? null,
		search: body?.search ?? null,
	};
}

export async function POST(request: NextRequest) {
	const context = await getOrganizerContext();

	if (!context.ok) {
		return context.response;
	}

	const { client, organizer } = context;

	let payload: any = {};

	try {
		payload = (await request.json()) ?? {};
	} catch {
		payload = {};
	}

	const format = getExportFormat(payload?.format);
	const filter = buildTransactionFilter(getFiltersFromBody(payload), organizer.id);
	const fields = [
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
			],
		},
	];

	try {
		let page = 1;
		const results: any[] = [];

		while (true) {
			const batch = await client.request(
				readItems('payment_transactions', {
					filter: filter as any,
					page,
					limit: EXPORT_BATCH_SIZE,
					sort: ['-date_created'],
					fields: fields as any,
				}),
			);

			if (!Array.isArray(batch) || batch.length === 0) {
				break;
			}

			results.push(...batch);

			if (batch.length < EXPORT_BATCH_SIZE) {
				break;
			}

			page += 1;
		}

		const rows = results.map(mapTransactionToRow);
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

		if (format === 'xlsx') {
			return NextResponse.json(
				{
					error:
						'Exportação em Excel não está disponível neste ambiente. Utilize o formato CSV.',
				},
				{ status: 503 },
			);
		}

		const csvContent = buildCsvContent(rows);

		return new NextResponse(csvContent, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="financeiro-transacoes-${timestamp}.csv"`,
			},
		});
	} catch (error) {
		console.error('Erro ao exportar transações financeiras:', error);

		return NextResponse.json(
			{ error: 'Não foi possível exportar as transações financeiras.' },
			{ status: 500 },
		);
	}
}
