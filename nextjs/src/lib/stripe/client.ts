import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe client instance
 * Use this for client-side operations (checkout, payment elements)
 */
export const getStripe = (): Promise<Stripe | null> => {
	if (!stripePromise) {
		const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

		if (!key) {
			throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
		}

		stripePromise = loadStripe(key);
	}

	return stripePromise;
};
