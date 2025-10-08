import { NextResponse } from 'next/server';
import { createDirectus, rest, readItems, updateItem, staticToken } from '@directus/sdk';
import Stripe from 'stripe';
import type { Schema } from '@/types/directus-schema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-09-30.clover',
});

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const directusToken = process.env.DIRECTUS_ADMIN_TOKEN!;
const directus = createDirectus<Schema>(directusUrl)
	.with(rest())
	.with(staticToken(directusToken));

export async function POST(req: Request) {
	try {
		const { organizer_id } = await req.json();

		if (!organizer_id) {
			return NextResponse.json(
				{ error: 'organizer_id is required' },
				{ status: 400 }
			);
		}

		// Get organizer data
		const organizers = await directus.request(
			readItems('organizers', {
				filter: { id: { _eq: organizer_id } },
				limit: 1,
			})
		);

		if (organizers.length === 0) {
			return NextResponse.json(
				{ error: 'Organizer not found' },
				{ status: 404 }
			);
		}

		const organizer = organizers[0];
		let accountId = organizer.stripe_account_id;

		// Create Stripe Connect account if doesn't exist
		if (!accountId) {
			const account = await stripe.accounts.create({
				type: 'express',
				country: 'BR',
				email: organizer.email || undefined,
				capabilities: {
					card_payments: { requested: true },
					transfers: { requested: true },
				},
				business_type: 'individual',
			});

			accountId = account.id;

			// Update organizer with Stripe account ID
			await directus.request(
				updateItem('organizers', organizer_id, {
					stripe_account_id: accountId,
				})
			);
		}

		// Create account link for onboarding
		const accountLink = await stripe.accountLinks.create({
			account: accountId,
			refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/minha-conta?setup=refresh`,
			return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/minha-conta?setup=success`,
			type: 'account_onboarding',
		});

		return NextResponse.json({
			url: accountLink.url,
			account_id: accountId,
		});
	} catch (error: any) {
		console.error('Stripe Connect onboarding error:', error);

		return NextResponse.json(
			{
				error: 'Failed to create onboarding link',
				message: error.message,
			},
			{ status: 500 }
		);
	}
}
