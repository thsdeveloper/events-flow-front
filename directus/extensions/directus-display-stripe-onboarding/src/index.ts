import DisplayComponent from './display.vue';
import { defineDisplay } from '@directus/extensions-sdk';

export default defineDisplay({
	id: 'stripe-onboarding',
	name: 'Stripe Onboarding Status',
	description: 'Shows Stripe Connect onboarding status and action button',
	icon: 'credit_card',
	component: DisplayComponent,
	options: null,
	types: ['uuid', 'string'],
});
