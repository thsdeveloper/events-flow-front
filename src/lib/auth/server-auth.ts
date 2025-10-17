/**
 * Server-Side Authentication Helpers
 *
 * These functions run ONLY on the server (Server Components, Server Actions, Route Handlers)
 * They use httpOnly cookies for secure token storage
 *
 * @module server-auth
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readMe } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { checkIfUserIsOrganizer } from './permissions';
import { isOrganizerRole } from './roles';
import type { Schema } from '@/types/directus-schema';

/**
 * Authenticated user data from Directus
 */
export type AuthUser = {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	role: {
		id: string;
		name: string;
	} | null;
	avatar: string | null;
	status: string;
};

/**
 * Organizer profile data
 */
export type OrganizerProfile = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	description: string | null;
	logo: string | null;
	website: string | null;
	document: string | null;
	stripe_account_id: string | null;
	stripe_onboarding_complete: boolean | null;
	stripe_charges_enabled: boolean | null;
	stripe_payouts_enabled: boolean | null;
	status: string;
	user_id: string;
};

/**
 * Complete authentication state
 */
export type AuthState = {
	user: AuthUser;
	isOrganizer: boolean;
	organizerProfile?: OrganizerProfile;
	organizerStatus?: OrganizerProfile['status'];
	hasPendingOrganizerRequest?: boolean;
};

/**
 * Get authentication state from server-side cookies
 *
 * @returns AuthState if authenticated, null if not
 *
 * @example
 * ```tsx
 * // In a Server Component
 * export default async function MyPage() {
 *   const auth = await getServerAuth();
 *
 *   if (!auth) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return <div>Welcome {auth.user.email}</div>;
 * }
 * ```
 */
export async function getServerAuth(): Promise<AuthState | null> {
	const cookieStore = await cookies();
	const accessToken = cookieStore.get('access_token')?.value;

	if (!accessToken) {
		return null;
	}

	try {
		// Create authenticated Directus client
		const client = getAuthenticatedClient(accessToken);

		// Fetch user data with relations
		const userData = await client.request(
			readMe({
				fields: ['*', { role: ['id', 'name'] }],
			})
		);

		// Type assertion for proper typing
		const user = userData as unknown as AuthUser;

		const hasOrganizerRole = isOrganizerRole(user.role);

		// Check organizer profile to show pending requests for all users
		const { organizerProfile, hasPendingRequest } = await checkIfUserIsOrganizer(client, user.id);
		const organizerStatus = organizerProfile?.status;
		// User has pending request if:
		// - They don't have organizer role AND have a pending status/request
		// - OR they have organizer role but no organizer profile (inconsistent state)
		const hasPendingOrganizerRequest =
			(!hasOrganizerRole && (organizerStatus === 'pending' || hasPendingRequest)) ||
			(hasOrganizerRole && !organizerProfile);

		return {
			user,
			isOrganizer: hasOrganizerRole,
			organizerProfile: organizerProfile || undefined,
			organizerStatus,
			hasPendingOrganizerRequest,
		};
	} catch (error) {
		console.error('Server auth error:', error);
		
return null;
	}
}

/**
 * Require authentication - redirects to login if not authenticated
 *
 * Use this in Server Components that require authentication
 *
 * @param redirectTo - Optional redirect path after login
 * @returns AuthState (guaranteed to be non-null)
 *
 * @example
 * ```tsx
 * export default async function ProtectedPage() {
 *   const auth = await requireAuth();
 *
 *   // User is guaranteed to be authenticated here
 *   return <div>Welcome {auth.user.email}</div>;
 * }
 * ```
 */
export async function requireAuth(redirectTo?: string): Promise<AuthState> {
	const auth = await getServerAuth();

	if (!auth) {
		const loginUrl = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login';
		redirect(loginUrl);
	}

	return auth;
}

/**
 * Require organizer role - redirects if user is not an organizer
 *
 * Use this in Server Components that are only accessible to organizers
 *
 * @returns AuthState with organizerProfile guaranteed
 *
 * @example
 * ```tsx
 * export default async function OrganizerDashboard() {
 *   const { user, organizer } = await requireOrganizer();
 *
 *   return <div>Welcome {organizer.name}</div>;
 * }
 * ```
 */
export async function requireOrganizer(): Promise<{
	user: AuthUser;
	organizer: OrganizerProfile;
}> {
	const auth = await requireAuth();

	if (!auth.isOrganizer || !auth.organizerProfile) {
		// Not an organizer, redirect to user dashboard
		redirect('/dashboard');
	}

	return {
		user: auth.user,
		organizer: auth.organizerProfile,
	};
}

/**
 * Require regular user (not organizer) - redirects organizers to their area
 *
 * Use this in Server Components that are only for regular users
 *
 * @example
 * ```tsx
 * export default async function UserProfile() {
 *   const { user } = await requireUser();
 *
 *   // Organizers cannot access this page
 *   return <div>User Profile for {user.email}</div>;
 * }
 * ```
 */
export async function requireUser(): Promise<{ user: AuthUser }> {
	const auth = await requireAuth();

	if (auth.isOrganizer) {
		// Organizer trying to access user area, redirect to organizer dashboard
		redirect('/organizer/dashboard');
	}

	return {
		user: auth.user,
	};
}

/**
 * Create an authenticated Directus client for server-side operations
 *
 * @throws Error if not authenticated
 *
 * @example
 * ```tsx
 * const client = await getAuthenticatedServerClient();
 * const events = await client.request(readItems('events', { ... }));
 * ```
 */
export async function getAuthenticatedServerClient() {
	const cookieStore = await cookies();
	const accessToken = cookieStore.get('access_token')?.value;

	if (!accessToken) {
		throw new Error('Not authenticated');
	}

	return getAuthenticatedClient(accessToken);
}

/**
 * Check if current user is authenticated (without redirecting)
 *
 * Useful for conditional rendering in Server Components
 *
 * @example
 * ```tsx
 * export default async function HomePage() {
 *   const isAuth = await isAuthenticated();
 *
 *   return (
 *     <div>
 *       {isAuth ? <UserMenu /> : <LoginButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
	const auth = await getServerAuth();
	
return auth !== null;
}
