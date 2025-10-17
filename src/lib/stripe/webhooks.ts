import Stripe from 'stripe';
import { stripe } from './server';
import { createDirectus, rest, staticToken, readItem, readItems, updateItem, createItem } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';

// Create admin Directus client for webhook operations
const getAdminClient = () => {
	const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;
	const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;

	if (!directusUrl || !adminToken) {
		throw new Error('DIRECTUS_URL or DIRECTUS_ADMIN_TOKEN not configured');
	}

	return createDirectus<Schema>(directusUrl).with(rest()).with(staticToken(adminToken));
};

/**
 * Log webhook event to payment_transactions for audit trail
 */
async function logPaymentTransaction(
	eventId: string,
	eventType: string,
	objectId: string,
	amount: number,
	status: 'succeeded' | 'failed' | 'pending' | 'refunded',
	metadata: any,
	registrationId?: string,
): Promise<void> {
	try {
		const client = getAdminClient();

		await client.request(
			createItem('payment_transactions', {
				stripe_event_id: eventId,
				event_type: eventType as any, // Allow any event type for flexibility
				stripe_object_id: objectId,
				amount: amount,
				status: status,
				metadata: metadata,
				registration_id: registrationId || null,
			}),
		);

		console.log(`[Webhook] ✅ Transaction logged: ${eventId} (${eventType})`);
	} catch (error: any) {
		console.error('[Webhook] ❌ Error logging transaction:', error);
		// Don't throw - logging failure shouldn't block webhook processing
	}
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
	payload: string | Buffer,
	signature: string,
	secret: string,
): Stripe.Event {
	try {
		return stripe.webhooks.constructEvent(payload, signature, secret);
	} catch (err) {
		const error = err as Error;
		throw new Error(`Webhook signature verification failed: ${error.message}`);
	}
}

/**
 * Handle installment payment
 */
async function handleInstallmentPayment(
	paymentIntent: Stripe.PaymentIntent,
	installmentId: string,
	client: any,
): Promise<void> {
	console.log(`[Webhook] Processing installment payment: ${installmentId}`);

	try {
		// Fetch installment with registration data
		const installment = await (client.request as any)(
			(readItem as any)('payment_installments', installmentId, {
				fields: [
					'*',
					{
						registration_id: [
							'id',
							'is_installment_payment',
							'total_installments',
							'participant_email',
							'participant_name',
							'ticket_type_id',
							'quantity',
						],
					},
				],
			}),
		);

		if (!installment) {
			console.error(`[Webhook] Installment ${installmentId} not found`);

return;
		}

		// Check if installment already paid (idempotency)
		if (installment.status === 'paid') {
			console.log(`[Webhook] ⚠️  Installment ${installmentId} already marked as paid. Skipping.`);

return;
		}

		// Update installment status
		await (client.request as any)(
			(updateItem as any)('payment_installments', installmentId, {
				status: 'paid' as const,
				paid_at: new Date().toISOString(),
				payment_confirmed_at: new Date().toISOString(),
			}),
		);

		console.log(`[Webhook] ✅ Installment ${installmentId} marked as paid`);

		// Log transaction
		await logPaymentTransaction(
			`evt_${Date.now()}_${installmentId}`,
			'payment_intent.succeeded',
			paymentIntent.id,
			installment.amount || 0,
			'succeeded',
			{
				payment_intent: paymentIntent.id,
				installment_id: installmentId,
				installment_number: installment.installment_number,
				total_installments: installment.total_installments,
			},
			typeof installment.registration_id === 'string'
				? installment.registration_id
				: installment.registration_id.id,
		);

		// Type guard for registration_id
		if (typeof installment.registration_id === 'string') {
			console.error('[Webhook] registration_id was not populated');

return;
		}

		const registrationId = installment.registration_id.id;

		// Fetch all installments for this registration
		const allInstallments = await (client.request as any)(
			(readItems as any)('payment_installments', {
				filter: {
					registration_id: { _eq: registrationId },
				},
				fields: ['id', 'status', 'due_date'],
			}),
		);

		// Calculate installment statuses
		const totalInstallments = allInstallments.length;
		const paidInstallments = allInstallments.filter((i: any) => i.status === 'paid').length;
		const overdueInstallments = allInstallments.filter((i: any) => i.status === 'overdue').length;
		const pendingInstallments = allInstallments.filter((i: any) => i.status === 'pending').length;

		console.log(
			`[Webhook] Registration ${registrationId} installments: ${paidInstallments}/${totalInstallments} paid, ${overdueInstallments} overdue, ${pendingInstallments} pending`,
		);

		// Determine new registration status
		let newStatus: string;
		let newPaymentStatus: string;
		let blockedReason: string | null = null;

		if (paidInstallments === totalInstallments) {
			// All installments paid
			newStatus = 'confirmed';
			newPaymentStatus = 'paid';
			console.log(`[Webhook] All installments paid - confirming registration`);
		} else if (overdueInstallments > 0) {
			// Has overdue installments
			newStatus = 'payment_overdue';
			newPaymentStatus = 'pending';
			blockedReason = 'overdue_installments';
			console.log(`[Webhook] Has ${overdueInstallments} overdue installments - blocking registration`);
		} else {
			// Has pending (not overdue) installments
			newStatus = 'partial_payment';
			newPaymentStatus = 'pending';
			console.log(`[Webhook] Has ${pendingInstallments} pending installments - partial payment`);
		}

		// Update registration
		await client.request(
			(updateItem as any)('event_registrations', registrationId, {
				status: newStatus,
				payment_status: newPaymentStatus,
				blocked_reason: blockedReason,
				installment_plan_status: paidInstallments === totalInstallments ? 'completed' : 'active',
			}),
		);

		console.log(`[Webhook] ✅ Registration ${registrationId} updated to status: ${newStatus}`);

		// If first installment and registration was pending, generate ticket code
		if (installment.installment_number === 1 && paidInstallments === 1) {
			const timestamp = Date.now().toString(36).toUpperCase();
			const random = Math.random().toString(36).substring(2, 8).toUpperCase();
			const ticketCode = `TKT-${timestamp}-${random}`;

			await client.request(
				(updateItem as any)('event_registrations', registrationId, {
					ticket_code: ticketCode,
					stripe_payment_intent_id: paymentIntent.id,
				}),
			);

			console.log(`[Webhook] ✅ First installment paid - ticket code generated: ${ticketCode}`);

			// Increment quantity_sold on ticket (only for first installment)
			if (installment.registration_id.ticket_type_id) {
				try {
					const ticketId =
						typeof installment.registration_id.ticket_type_id === 'object'
							? installment.registration_id.ticket_type_id.id
							: installment.registration_id.ticket_type_id;

					const ticket: any = await client.request(
						(readItem as any)('event_tickets', ticketId, {
							fields: ['id', 'quantity_sold', 'title'],
						}),
					);

					const currentSold = ticket.quantity_sold || 0;
					const newSold = currentSold + (installment.registration_id.quantity || 1);

					await client.request(
						(updateItem as any)('event_tickets', ticketId, {
							quantity_sold: newSold,
						}),
					);

					console.log(
						`[Webhook] Ticket "${ticket.title}" quantity_sold: ${currentSold} → ${newSold}`,
					);
				} catch (error: any) {
					console.error('[Webhook] Error updating ticket quantity_sold:', error);
				}
			}
		}

		// TODO: Send email notification
		console.log(`[Webhook] TODO: Send installment payment confirmation email`);
	} catch (error: any) {
		console.error(`[Webhook] Error handling installment payment ${installmentId}:`, error);
		throw error;
	}
}

/**
 * Handle payment_intent.succeeded event
 */
export async function handlePaymentIntentSucceeded(
	paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
	console.log('[Webhook] Payment Intent succeeded:', paymentIntent.id);

	try {
		const client = getAdminClient();

		// Check if this is an installment payment
		const installmentId = paymentIntent.metadata.installment_id;

		if (installmentId) {
			// Handle installment payment
			await handleInstallmentPayment(paymentIntent, installmentId, client);

return;
		}

		// Get registration_ids from metadata (legacy/non-installment flow)
		const registrationIds = paymentIntent.metadata.registration_ids?.split(',') || [];

		if (registrationIds.length === 0) {
			console.warn('[Webhook] No registration_ids or installment_id found in payment_intent metadata');
			// Log transaction even without registration_ids
			await logPaymentTransaction(
				`evt_${Date.now()}`, // Generate temporary event ID
				'payment_intent.succeeded',
				paymentIntent.id,
				paymentIntent.amount / 100, // Convert cents to dollars
				'succeeded',
				paymentIntent,
			);

return;
		}

		console.log(`[Webhook] Processing ${registrationIds.length} registration(s)...`);

		// ⚠️ IDEMPOTENCY CHECK: Verify if ANY of these registrations was already processed
		const processedRegistrations = await client.request(
			(readItems as any)('event_registrations', {
				filter: {
					id: { _in: registrationIds },
					payment_status: { _eq: 'paid' },
				},
				fields: ['id'],
			}),
		);

		if (Array.isArray(processedRegistrations) && processedRegistrations.length > 0) {
			console.log(
				`[Webhook] ⚠️  ${processedRegistrations.length} registration(s) already processed for Payment Intent ${paymentIntent.id}. Skipping to avoid duplicate quantity_sold increment.`,
			);
			
return;
		}

		// Process each registration
		for (const registrationId of registrationIds) {
			try {
				// Read current registration
				const registration: any = await client.request(
					(readItem as any)('event_registrations', registrationId, {
						fields: [
							'id',
							'ticket_type_id',
							'quantity',
							'status',
							'payment_status',
							'participant_name',
							'participant_email',
							'total_amount',
							'event_id',
						],
					}),
				);

				// Skip if already processed (idempotency - secondary check)
				if (registration.payment_status === 'paid') {
					console.log(`[Webhook] Registration ${registrationId} already processed`);
					continue;
				}

				// Generate unique ticket code
				const timestamp = Date.now().toString(36).toUpperCase();
				const random = Math.random().toString(36).substring(2, 8).toUpperCase();
				const ticketCode = `TKT-${timestamp}-${random}`;

				// Update registration
				await client.request(
					(updateItem as any)('event_registrations', registrationId, {
						payment_status: 'paid',
						status: 'confirmed',
						stripe_payment_intent_id: paymentIntent.id,
						ticket_code: ticketCode,
					}),
				);

				console.log(`[Webhook] ✅ Registration ${registrationId} confirmed with code: ${ticketCode}`);

				// Log payment transaction for audit
				await logPaymentTransaction(
					`evt_${Date.now()}_${registrationId}`, // Unique event ID per registration
					'payment_intent.succeeded',
					paymentIntent.id,
					registration.total_amount || 0,
					'succeeded',
					{
						payment_intent: paymentIntent.id,
						registration_id: registrationId,
						ticket_code: ticketCode,
						amount: registration.total_amount,
						participant_email: registration.participant_email,
					},
					registrationId,
				);

				// Increment quantity_sold on the ticket
				if (registration.ticket_type_id) {
					try {
						const ticketId =
							typeof registration.ticket_type_id === 'object'
								? registration.ticket_type_id.id
								: registration.ticket_type_id;

						const ticket: any = await client.request(
							(readItem as any)('event_tickets', ticketId, {
								fields: ['id', 'quantity_sold', 'title'],
							}),
						);

						const currentSold = ticket.quantity_sold || 0;
						const newSold = currentSold + (registration.quantity || 1);

						await client.request(
							(updateItem as any)('event_tickets', ticketId, {
								quantity_sold: newSold,
							}),
						);

						console.log(
							`[Webhook] Ticket "${ticket.title}" quantity_sold: ${currentSold} → ${newSold}`,
						);
					} catch (error: any) {
						console.error('[Webhook] Error updating ticket quantity_sold:', error);
					}
				}

				// TODO: Send confirmation email
				console.log(`[Webhook] TODO: Send confirmation email to ${registration.participant_email}`);
			} catch (error: any) {
				console.error(`[Webhook] Error processing registration ${registrationId}:`, error);
			}
		}

		console.log('[Webhook] Payment processing completed');
	} catch (error: any) {
		console.error('[Webhook] Error in handlePaymentIntentSucceeded:', error);
		throw error;
	}
}

/**
 * Handle payment_intent.payment_failed event
 */
export async function handlePaymentIntentFailed(
	paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
	console.log('[Webhook] Payment Intent failed:', paymentIntent.id);

	try {
		const client = getAdminClient();
		const registrationIds = paymentIntent.metadata.registration_ids?.split(',') || [];

		// Log failed transaction
		await logPaymentTransaction(
			`evt_${Date.now()}`,
			'payment_intent.payment_failed',
			paymentIntent.id,
			paymentIntent.amount / 100,
			'failed',
			{
				payment_intent: paymentIntent,
				error: paymentIntent.last_payment_error,
			},
			registrationIds[0], // Link to first registration if available
		);

		// Update registrations to failed status
		if (registrationIds.length > 0) {
			for (const registrationId of registrationIds) {
				try {
					await client.request(
						(updateItem as any)('event_registrations', registrationId, {
							payment_status: 'pending', // Keep as pending for retry
							status: 'pending',
						}),
					);
					console.log(`[Webhook] Registration ${registrationId} marked as pending (payment failed)`);
				} catch (error: any) {
					console.error(`[Webhook] Error updating registration ${registrationId}:`, error);
				}
			}
		}
	} catch (error: any) {
		console.error('[Webhook] Error in handlePaymentIntentFailed:', error);
	}
}

/**
 * Handle checkout.session.completed event
 */
export async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
): Promise<void> {
	console.log('Checkout session completed:', session.id);

	// TODO: Optional early confirmation logic
}

/**
 * Handle charge.refunded event
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
	console.log('[Webhook] Charge refunded:', charge.id);

	try {
		const client = getAdminClient();

		// Get payment_intent from charge
		const paymentIntentId = typeof charge.payment_intent === 'string'
			? charge.payment_intent
			: charge.payment_intent?.id;

		if (!paymentIntentId) {
			console.warn('[Webhook] No payment_intent found in charge');
			
return;
		}

		// Find registrations by payment_intent_id
		const registrations = await client.request(
			(readItems as any)('event_registrations', {
				filter: {
					stripe_payment_intent_id: { _eq: paymentIntentId },
				},
				fields: ['id', 'participant_email', 'total_amount'],
			}),
		);

		// Log refund transaction
		await logPaymentTransaction(
			`evt_${Date.now()}`,
			'charge.refunded',
			charge.id,
			charge.amount_refunded / 100,
			'refunded',
			{
				charge: charge,
				payment_intent_id: paymentIntentId,
				refund_reason: charge.refunds?.data?.[0]?.reason,
			},
			Array.isArray(registrations) && registrations[0] ? registrations[0].id : undefined,
		);

		// Update registrations to refunded status
		if (Array.isArray(registrations) && registrations.length > 0) {
			for (const registration of registrations) {
				try {
					await client.request(
						(updateItem as any)('event_registrations', registration.id, {
							payment_status: 'refunded',
							status: 'cancelled',
							stripe_refund_id: charge.refunds?.data?.[0]?.id || null,
						}),
					);
					console.log(`[Webhook] ✅ Registration ${registration.id} marked as refunded`);
				} catch (error: any) {
					console.error(`[Webhook] Error updating registration ${registration.id}:`, error);
				}
			}
		}
	} catch (error: any) {
		console.error('[Webhook] Error in handleChargeRefunded:', error);
	}
}

/**
 * Handle account.updated event (Stripe Connect)
 */
export async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
	console.log('[Webhook] ============================================');
	console.log('[Webhook] Account updated:', account.id);
	console.log('[Webhook] Account details_submitted:', account.details_submitted);
	console.log('[Webhook] Account charges_enabled:', account.charges_enabled);
	console.log('[Webhook] Account payouts_enabled:', account.payouts_enabled);
	console.log('[Webhook] ============================================');

	try {
		const client = getAdminClient();

		// Find organizer by stripe_account_id using Directus SDK
		console.log('[Webhook] Searching for organizer with stripe_account_id:', account.id);

		const organizers = await client.request(
			readItems('organizers', {
				filter: {
					stripe_account_id: { _eq: account.id },
				},
				limit: 1,
				fields: ['id', 'name', 'email', 'status', 'stripe_account_id', 'stripe_onboarding_complete', 'stripe_charges_enabled', 'stripe_payouts_enabled'],
			}),
		);

		console.log('[Webhook] Found organizers:', organizers.length);

		if (organizers.length > 0) {
			const organizer = organizers[0];
			console.log('[Webhook] Organizer found:', {
				id: organizer.id,
				name: organizer.name,
				status: organizer.status,
				stripe_account_id: organizer.stripe_account_id,
				stripe_onboarding_complete: organizer.stripe_onboarding_complete,
				stripe_charges_enabled: organizer.stripe_charges_enabled,
				stripe_payouts_enabled: organizer.stripe_payouts_enabled,
			});

			// Check if Stripe onboarding is complete and account is ready for charges
			const isStripeComplete = account.details_submitted && account.charges_enabled;
			console.log('[Webhook] Is Stripe complete?', isStripeComplete);

			// Prepare update data
			const updateData: any = {
				stripe_onboarding_complete: isStripeComplete,
				stripe_charges_enabled: account.charges_enabled || false,
				stripe_payouts_enabled: account.payouts_enabled || false,
			};

			// If Stripe is complete AND organizer is still pending, activate them
			if (isStripeComplete && organizer.status === 'pending') {
				updateData.status = 'active';
				console.log(`[Webhook] 🎉 Activating organizer ${organizer.id} - Stripe onboarding complete!`);
			}

			console.log('[Webhook] Update data:', JSON.stringify(updateData, null, 2));

			// Update organizer with Stripe account status
			const result = await client.request(
				updateItem('organizers', organizer.id, updateData),
			);

			console.log(`[Webhook] ✅ Organizer ${organizer.id} updated successfully`);
			console.log('[Webhook] Updated fields:', JSON.stringify(result, null, 2));
		} else {
			console.warn(`[Webhook] ⚠️  No organizer found with stripe_account_id: ${account.id}`);

			// List all organizers for debugging
			const allOrganizers = await client.request(
				readItems('organizers', {
					fields: ['id', 'name', 'stripe_account_id'],
					limit: 100,
				}),
			);
			console.log('[Webhook] All organizers in database:', allOrganizers.length);
			console.log('[Webhook] Stripe account IDs:', allOrganizers.map(o => o.stripe_account_id).filter(Boolean));
		}
	} catch (error: any) {
		console.error('[Webhook] ❌ Error in handleAccountUpdated:', error);
		console.error('[Webhook] Error message:', error.message);
		console.error('[Webhook] Error stack:', error.stack);

		// Log more details if it's a Directus error
		if (error.errors) {
			console.error('[Webhook] Directus errors:', JSON.stringify(error.errors, null, 2));
		}

		throw error;
	}
}
