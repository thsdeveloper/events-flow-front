import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

/**
 * Stripe server-side client
 * Use this for server-side operations (API routes, server components)
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: '2025-09-30.clover',
	typescript: true,
	appInfo: {
		name: 'Event Platform',
		version: '1.0.0',
	},
});

/**
 * Format amount from decimal to Stripe format (cents)
 */
export function formatAmountForStripe(amount: number): number {
	return Math.round(amount * 100);
}

/**
 * Format amount from Stripe format (cents) to decimal
 */
export function formatAmountFromStripe(amount: number): number {
	return amount / 100;
}
