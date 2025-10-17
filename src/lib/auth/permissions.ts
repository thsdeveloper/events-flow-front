/**
 * Permission and Role Checking Utilities
 *
 * Functions to check user roles and permissions
 *
 * @module permissions
 */

import { readItems } from '@directus/sdk';
import type { RestClient } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';
import type { OrganizerProfile } from './server-auth';

/**
 * Check if a user is an organizer
 *
 * A user is considered an organizer if they have an active record in the organizers collection
 *
 * @param client - Authenticated Directus client
 * @param userId - User ID to check
 * @returns Object with isOrganizer boolean and optional organizerProfile
 */
export async function checkIfUserIsOrganizer(
	client: RestClient<Schema>,
	userId: string
): Promise<{
	isOrganizer: boolean;
	organizerProfile: OrganizerProfile | null;
	hasPendingRequest: boolean;
}> {
	try {
		const organizers = await client.request(
			readItems('organizers', {
				filter: {
					user_id: { _eq: userId },
					status: { _in: ['active', 'pending'] }, // Exclude archived
				},
				fields: [
					'id',
					'name',
					'email',
					'phone',
					'description',
					'logo',
					'website',
					'document',
					'stripe_account_id',
					'stripe_onboarding_complete',
					'stripe_charges_enabled',
					'stripe_payouts_enabled',
					'status',
					'user_id',
				] as any,
				limit: 1,
			})
		);

		const activeProfile = organizers.find((item: any) => item.status === 'active') ?? null;
		const pendingProfile = organizers.find((item: any) => item.status === 'pending') ?? null;
		const profileToReturn = (activeProfile || pendingProfile) as OrganizerProfile | null;

		return {
			isOrganizer: Boolean(activeProfile),
			organizerProfile: profileToReturn,
			hasPendingRequest: !activeProfile && Boolean(pendingProfile),
		};
	} catch (error) {
		console.error('Error checking organizer status:', error);
		
		return {
			isOrganizer: false,
			organizerProfile: null,
			hasPendingRequest: false,
		};
	}
}

/**
 * Check if organizer has completed Stripe onboarding
 *
 * @param organizerProfile - Organizer profile data
 * @returns True if Stripe onboarding is complete
 */
export function hasStripeOnboarding(organizerProfile: OrganizerProfile): boolean {
	return Boolean(
		organizerProfile.stripe_account_id &&
			organizerProfile.stripe_onboarding_complete &&
			organizerProfile.stripe_charges_enabled
	);
}

/**
 * Check if organizer can receive payouts
 *
 * @param organizerProfile - Organizer profile data
 * @returns True if can receive payouts
 */
export function canReceivePayouts(organizerProfile: OrganizerProfile): boolean {
	return Boolean(
		hasStripeOnboarding(organizerProfile) && organizerProfile.stripe_payouts_enabled
	);
}

/**
 * Get user's primary role name
 *
 * @param client - Authenticated Directus client
 * @param roleId - Role ID
 * @returns Role name or null
 */
export async function getUserRoleName(
	client: RestClient<Schema>,
	roleId: string
): Promise<string | null> {
	try {
		const role = await client.request(
			readItems('directus_roles', {
				filter: { id: { _eq: roleId } },
				fields: ['name'] as any,
				limit: 1,
			})
		);

		return role.length > 0 ? (role[0] as any).name : null;
	} catch (error) {
		console.error('Error fetching role:', error);
		
return null;
	}
}

/**
 * Permission checks for common operations
 */
export const Permissions = {
	/**
	 * Check if user can create events
	 */
	canCreateEvent: (isOrganizer: boolean) => isOrganizer,

	/**
	 * Check if user can manage an event
	 */
	canManageEvent: (isOrganizer: boolean, eventOrganizerId: string, organizerProfileId?: string) => {
		return isOrganizer && organizerProfileId === eventOrganizerId;
	},

	/**
	 * Check if user can register for events
	 */
	canRegisterForEvent: () => true, // All authenticated users can register

	/**
	 * Check if user can access organizer dashboard
	 */
	canAccessOrganizerArea: (isOrganizer: boolean) => isOrganizer,

	/**
	 * Check if user can access user dashboard
	 */
	canAccessUserArea: () => true, // All authenticated users

	/**
	 * Check if organizer can create paid events
	 */
	canCreatePaidEvent: (organizerProfile: OrganizerProfile) => hasStripeOnboarding(organizerProfile),
} as const;
