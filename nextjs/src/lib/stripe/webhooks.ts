import Stripe from 'stripe';
import { stripe } from './server';

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
	console.log('Payment Intent succeeded:', paymentIntent.id);

	// TODO: Update event_registration status to 'paid'
	// TODO: Decrement event_tickets.quantity_sold
	// TODO: Generate ticket_code
	// TODO: Send confirmation email
	// TODO: Log to payment_transactions
}

/**
 * Handle payment_intent.payment_failed event
 */
export async function handlePaymentIntentFailed(
	paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
	console.log('Payment Intent failed:', paymentIntent.id);

	// TODO: Update event_registration status to 'pending' or handle failure
	// TODO: Log to payment_transactions
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
	console.log('Charge refunded:', charge.id);

	// TODO: Update event_registration status to 'refunded'
	// TODO: Log to payment_transactions
}

/**
 * Handle account.updated event (Stripe Connect)
 */
export async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
	console.log('Account updated:', account.id);

	// TODO: Update organizer Stripe fields in Directus
	// TODO: Update stripe_charges_enabled, stripe_payouts_enabled
}
