import Stripe from 'stripe';
import { stripe } from './server';
import { createDirectus, rest, staticToken, readItem, readItems, updateItem, createItem } from '@directus/sdk';

// Create admin Directus client for webhook operations
const getAdminClient = () => {
	const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;
	const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;

	if (!directusUrl || !adminToken) {
		throw new Error('DIRECTUS_URL or DIRECTUS_ADMIN_TOKEN not configured');
	}

	return createDirectus(directusUrl).with(rest()).with(staticToken(adminToken));
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
				event_type: eventType,
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
 * Handle payment_intent.succeeded event
 */
export async function handlePaymentIntentSucceeded(
	paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
	console.log('[Webhook] Payment Intent succeeded:', paymentIntent.id);

	try {
		const client = getAdminClient();

		// Get registration_ids from metadata
		const registrationIds = paymentIntent.metadata.registration_ids?.split(',') || [];

		if (registrationIds.length === 0) {
			console.warn('[Webhook] No registration_ids found in payment_intent metadata');
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
			readItems('event_registrations', {
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
				const registration = await client.request(
					readItem('event_registrations', registrationId, {
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
					updateItem('event_registrations', registrationId, {
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

						const ticket = await client.request(
							readItem('event_tickets', ticketId, {
								fields: ['id', 'quantity_sold', 'title'],
							}),
						);

						const currentSold = ticket.quantity_sold || 0;
						const newSold = currentSold + (registration.quantity || 1);

						await client.request(
							updateItem('event_tickets', ticketId, {
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
						updateItem('event_registrations', registrationId, {
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
			readItems('event_registrations', {
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
						updateItem('event_registrations', registration.id, {
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
	console.log('[Webhook] Account updated:', account.id);

	try {
		const client = getAdminClient();

		// Find organizer by stripe_account_id
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/organizers?filter[stripe_account_id][_eq]=${account.id}&limit=1`,
			{
				headers: {
					Authorization: `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
				},
			},
		);

		const data = await response.json();
		const organizers = data.data || [];

		if (organizers.length > 0) {
			const organizer = organizers[0];

			// Update organizer with Stripe account status
			await client.request(
				updateItem('organizers', organizer.id, {
					stripe_onboarding_complete: account.details_submitted && account.charges_enabled,
					stripe_charges_enabled: account.charges_enabled || false,
					stripe_payouts_enabled: account.payouts_enabled || false,
				}),
			);

			console.log(`[Webhook] ✅ Organizer ${organizer.id} updated with Stripe status`);
		} else {
			console.warn(`[Webhook] No organizer found with stripe_account_id: ${account.id}`);
		}
	} catch (error: any) {
		console.error('[Webhook] Error in handleAccountUpdated:', error);
		throw error;
	}
}
