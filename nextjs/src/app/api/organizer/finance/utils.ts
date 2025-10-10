import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { RestClient, QueryFilter } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { getServerAuth, type OrganizerProfile } from '@/lib/auth/server-auth';
import type { Schema } from '@/types/directus-schema';

type OrganizerContextSuccess = {
	ok: true;
	client: RestClient<Schema>;
	organizer: OrganizerProfile;
	token: string;
};

type OrganizerContextError = {
	ok: false;
	response: NextResponse;
};

export type OrganizerContextResult = OrganizerContextSuccess | OrganizerContextError;

/**
 * Resolve the authenticated organizer context for API route handlers.
 */
export async function getOrganizerContext(): Promise<OrganizerContextResult> {
	const auth = await getServerAuth();

	if (!auth || !auth.isOrganizer || !auth.organizerProfile) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: 'Organizador não autorizado' },
				{ status: 403 },
			),
		};
	}

	const cookieStore = await cookies();
	const accessToken = cookieStore.get('access_token')?.value;

	if (!accessToken) {
		return {
			ok: false,
			response: NextResponse.json({ error: 'Sessão expirada' }, { status: 401 }),
		};
	}

	const client = getAuthenticatedClient(accessToken);

	return {
		ok: true,
		client,
		organizer: auth.organizerProfile,
		token: accessToken,
	};
}

const MAX_LIMIT = 100;
const MIN_LIMIT = 5;

export function parsePositiveInt(
	value: string | null,
	fallback: number,
	{ min = 1, max }: { min?: number; max?: number } = {},
): number {
	const parsed = Number.parseInt(value ?? '', 10);

	if (Number.isNaN(parsed) || parsed < min) {
		return fallback;
	}

	if (max && parsed > max) {
		return max;
	}

	return parsed;
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

export interface TransactionFilterInput {
	status?: string | null;
	dateFrom?: string | null;
	dateTo?: string | null;
	eventId?: string | null;
	search?: string | null;
}

/**
 * Build Directus filters for organizer transactions.
 */
export function buildTransactionFilter(
	input: TransactionFilterInput,
	organizerId: string,
): QueryFilter<Schema, 'payment_transactions'> {
	const clauses: any[] = [
		{
			registration_id: {
				event_id: {
					organizer_id: { _eq: organizerId },
				},
			},
		},
	];

	if (input.status) {
		clauses.push({
			status: { _eq: input.status },
		});
	}

	const fromIso = normalizeDateStart(input.dateFrom);
	const toIso = normalizeDateEnd(input.dateTo);
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

	if (input.eventId) {
		clauses.push({
			registration_id: {
				event_id: {
					id: { _eq: input.eventId },
				},
			},
		});
	}

	if (input.search) {
		const like = { _icontains: input.search };
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
	} as QueryFilter<Schema, 'payment_transactions'>;
}

export function normalizeLimit(value: string | null, fallback = 20) {
	return parsePositiveInt(value, fallback, { min: MIN_LIMIT, max: MAX_LIMIT });
}

export function normalizePage(value: string | null, fallback = 1) {
	return parsePositiveInt(value, fallback, { min: 1 });
}
