import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContext } from '../utils';
import { stripe, formatAmountFromStripe } from '@/lib/stripe/server';

const DEFAULT_LIMIT = 25;

function formatStripeTimestamp(timestamp?: number | null) {
	if (!timestamp) {

		return null;
	}

	return new Date(timestamp * 1000).toISOString();
}

export async function GET(_request: NextRequest) {
	const context = await getOrganizerContext();

	if (!context.ok) {
		return context.response;
	}

	const { organizer } = context;

	if (!organizer.stripe_account_id) {
		return NextResponse.json({
			balance: {
				available: 0,
				pending: 0,
				currency: 'brl',
			},
			payouts: [],
			alert: 'Conta Stripe Connect não configurada.',
		});
	}

	try {
		const [balance, payouts] = await Promise.all([
			stripe.balance.retrieve({
				stripeAccount: organizer.stripe_account_id,
			}),
			stripe.payouts.list(
				{
					limit: DEFAULT_LIMIT,
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

		const payoutsData = payouts.data.map((payout) => ({
			id: payout.id,
			amount: formatAmountFromStripe(payout.amount),
			currency: payout.currency,
			status: payout.status,
			createdAt: formatStripeTimestamp(payout.created),
			arrivalDate: formatStripeTimestamp(payout.arrival_date),
			description: payout.description ?? null,
			statementDescriptor: payout.statement_descriptor ?? null,
			destination:
				typeof payout.destination === 'string'
					? payout.destination
					: payout.destination?.id ?? null,
		}));

		return NextResponse.json({
			balance: {
				available,
				pending,
				currency: 'brl',
			},
			payouts: payoutsData,
		});
	} catch (error) {
		console.error('Erro ao buscar repasses do Stripe:', error);

		return NextResponse.json(
			{ error: 'Não foi possível carregar os repasses do Stripe.' },
			{ status: 500 },
		);
	}
}
