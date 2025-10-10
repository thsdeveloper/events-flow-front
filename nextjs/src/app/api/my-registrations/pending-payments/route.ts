import { NextRequest, NextResponse } from 'next/server';
import { readItems } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { cookies } from 'next/headers';

/**
 * GET /api/my-registrations/pending-payments
 *
 * Returns user's registrations with pending or overdue installments
 * Includes full installment details for payment tracking
 */
export async function GET(request: NextRequest) {
	try {
		// Get user token from cookie
		const cookieStore = await cookies();
		const authToken = cookieStore.get('directus_token')?.value;

		if (!authToken) {
			return NextResponse.json(
				{ error: 'Não autenticado' },
				{ status: 401 }
			);
		}

		const directus = getAuthenticatedClient(authToken);

		// Fetch current user's registrations with installment payments
		const registrations = await (directus.request as any)(
			readItems('event_registrations', {
				filter: {
					is_installment_payment: { _eq: true },
					_or: [
						{ status: { _eq: 'partial_payment' } },
						{ status: { _eq: 'payment_overdue' } },
						{ status: { _eq: 'pending' } },
					],
				},
				fields: [
					'id',
					'ticket_code',
					'status',
					'payment_status',
					'total_amount',
					'total_installments',
					'installment_plan_status',
					'blocked_reason',
					'date_created',
					{
						event_id: [
							'id',
							'title',
							'slug',
							'start_date',
							'location_name',
							'featured_image',
						],
					},
					{
						ticket_type_id: [
							'id',
							'title',
							'price',
						],
					},
				],
			}),
		);

		// For each registration, fetch installments
		const registrationsWithInstallments = await Promise.all(
			registrations.map(async (registration: any) => {
				const installments = await (directus.request as any)(
					readItems('payment_installments', {
						filter: {
							registration_id: { _eq: registration.id },
						},
						fields: [
							'id',
							'installment_number',
							'total_installments',
							'amount',
							'due_date',
							'status',
							'stripe_payment_intent_id',
							'paid_at',
						],
						sort: ['installment_number'],
					}),
				);

				// Calculate installment statistics
				const totalInstallments = installments.length;
				const paidInstallments = installments.filter((i: any) => i.status === 'paid').length;
				const pendingInstallments = installments.filter((i: any) => i.status === 'pending').length;
				const overdueInstallments = installments.filter((i: any) => i.status === 'overdue').length;

				// Find next installment to pay (first pending or overdue)
				const nextInstallment = installments.find(
					(i: any) => i.status === 'overdue' || i.status === 'pending'
				);

				return {
					...registration,
					installments,
					installment_stats: {
						total: totalInstallments,
						paid: paidInstallments,
						pending: pendingInstallments,
						overdue: overdueInstallments,
					},
					next_installment: nextInstallment || null,
				};
			})
		);

		// Sort by priority: overdue first, then by date
		const sorted = registrationsWithInstallments.sort((a, b) => {
			// Priority 1: Overdue registrations first
			if (a.status === 'payment_overdue' && b.status !== 'payment_overdue') {
				return -1;
			}
			if (a.status !== 'payment_overdue' && b.status === 'payment_overdue') {
				return 1;
			}

			// Priority 2: Sort by next installment due date
			if (a.next_installment && b.next_installment) {
				return new Date(a.next_installment.due_date).getTime() - new Date(b.next_installment.due_date).getTime();
			}

			// Priority 3: Sort by creation date (newest first)
			return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
		});

		return NextResponse.json({
			success: true,
			data: sorted,
			total: sorted.length,
		});
	} catch (error) {
		console.error('Error fetching pending payments:', error);

		return NextResponse.json(
			{ error: 'Erro ao buscar pagamentos pendentes' },
			{ status: 500 }
		);
	}
}
