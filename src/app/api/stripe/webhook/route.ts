import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import {
	verifyWebhookSignature,
	handlePaymentIntentSucceeded,
	handlePaymentIntentFailed,
	handleCheckoutSessionCompleted,
	handleChargeRefunded,
	handleAccountUpdated,
} from '@/lib/stripe/webhooks';

/**
 * Stripe Webhook Handler
 *
 * This endpoint receives events from Stripe webhooks.
 *
 * For local development:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Login: stripe login
 * 3. Forward webhooks: stripe listen --forward-to localhost:3000/api/stripe/webhook
 * 4. Copy the webhook signing secret (whsec_...) to .env as STRIPE_WEBHOOK_SECRET
 *
 * For production:
 * 1. Configure webhook in Stripe Dashboard
 * 2. Add production webhook secret to environment variables
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const headersList = await headers();
		const signature = headersList.get('stripe-signature');

		if (!signature) {
			return NextResponse.json(
				{ error: 'Missing stripe-signature header' },
				{ status: 400 }
			);
		}

		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
		if (!webhookSecret) {
			console.error('STRIPE_WEBHOOK_SECRET is not configured');
			
return NextResponse.json(
				{ error: 'Webhook secret not configured' },
				{ status: 500 }
			);
		}

		// Verify webhook signature
		const event = verifyWebhookSignature(body, signature, webhookSecret);

		console.log(`[Stripe Webhook] Received event: ${event.type}`);

		// Handle the event
		switch (event.type) {
			case 'payment_intent.succeeded':
				await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
				break;

			case 'payment_intent.payment_failed':
				await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
				break;

			case 'checkout.session.completed':
				await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
				break;

			case 'charge.refunded':
				await handleChargeRefunded(event.data.object as Stripe.Charge);
				break;

			case 'account.updated':
				await handleAccountUpdated(event.data.object as Stripe.Account);
				break;

			default:
				console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error('[Stripe Webhook] Error:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		
return NextResponse.json({ error: message }, { status: 400 });
	}
}
