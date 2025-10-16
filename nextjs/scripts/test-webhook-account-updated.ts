/**
 * Test script for Stripe account.updated webhook handler
 *
 * Usage:
 * 1. Make sure your .env is configured with DIRECTUS_ADMIN_TOKEN
 * 2. Replace ORGANIZER_ID and STRIPE_ACCOUNT_ID below with real values
 * 3. Run: node --loader ts-node/esm scripts/test-webhook-account-updated.ts
 *
 * Or use tsx:
 * pnpm add -D tsx
 * npx tsx scripts/test-webhook-account-updated.ts
 */

import { handleAccountUpdated } from '../src/lib/stripe/webhooks';
import type Stripe from 'stripe';

// ⚠️ CONFIGURE THESE VALUES
const TEST_ACCOUNT_ID = 'acct_1SIvP2DgTrQjIg8i'; // Replace with your actual Stripe account ID

async function testAccountUpdatedWebhook() {
	console.log('🧪 Testing account.updated webhook handler...\n');

	// Simulate a complete Stripe account
	const mockStripeAccount: Stripe.Account = {
		id: TEST_ACCOUNT_ID,
		object: 'account',
		business_profile: null,
		business_type: 'individual',
		capabilities: {
			card_payments: 'active',
			transfers: 'active',
		},
		charges_enabled: true, // ✅ Can accept charges
		controller: {
			type: 'application',
			is_controller: false,
		},
		country: 'BR',
		created: 1234567890,
		default_currency: 'brl',
		details_submitted: true, // ✅ Onboarding completed
		email: null,
		external_accounts: {
			object: 'list',
			data: [],
			has_more: false,
			url: `/v1/accounts/${TEST_ACCOUNT_ID}/external_accounts`,
		},
		future_requirements: {
			alternatives: [],
			current_deadline: null,
			currently_due: [],
			disabled_reason: null,
			errors: [],
			eventually_due: [],
			past_due: [],
			pending_verification: [],
		},
		metadata: {},
		payouts_enabled: true, // ✅ Can receive payouts
		requirements: {
			alternatives: [],
			current_deadline: null,
			currently_due: [],
			disabled_reason: null,
			errors: [],
			eventually_due: [],
			past_due: [],
			pending_verification: [],
		},
		settings: {
			bacs_debit_payments: {},
			branding: {
				icon: null,
				logo: null,
				primary_color: null,
				secondary_color: null,
			},
			card_issuing: {
				tos_acceptance: {
					date: null,
					ip: null,
				},
			},
			card_payments: {
				decline_on: {
					avs_failure: false,
					cvc_failure: false,
				},
				statement_descriptor_prefix: null,
				statement_descriptor_prefix_kana: null,
				statement_descriptor_prefix_kanji: null,
			},
			dashboard: {
				display_name: null,
				timezone: 'Etc/UTC',
			},
			payments: {
				statement_descriptor: null,
				statement_descriptor_kana: null,
				statement_descriptor_kanji: null,
			},
			payouts: {
				debit_negative_balances: false,
				schedule: {
					delay_days: 2,
					interval: 'daily',
				},
				statement_descriptor: null,
			},
			sepa_debit_payments: {},
		},
		tos_acceptance: {
			date: null,
			ip: null,
			user_agent: null,
		},
		type: 'express',
	};

	console.log('📊 Mock Stripe Account:', {
		id: mockStripeAccount.id,
		details_submitted: mockStripeAccount.details_submitted,
		charges_enabled: mockStripeAccount.charges_enabled,
		payouts_enabled: mockStripeAccount.payouts_enabled,
	});
	console.log('');

	try {
		await handleAccountUpdated(mockStripeAccount);
		console.log('\n✅ Test completed successfully!');
	} catch (error) {
		console.error('\n❌ Test failed with error:', error);
		process.exit(1);
	}
}

// Run the test
testAccountUpdatedWebhook();
