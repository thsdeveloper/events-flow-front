/**
 * Cookie Management for Authentication
 *
 * Utilities for setting and clearing httpOnly authentication cookies
 *
 * @module cookies
 */

import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/**
 * Authentication tokens from Directus
 */
export type AuthTokens = {
	access_token: string;
	refresh_token: string;
	expires: number; // milliseconds
};

/**
 * Cookie configuration
 */
const COOKIE_CONFIG = {
	httpOnly: true, // Prevent JavaScript access (XSS protection)
	secure: process.env.NODE_ENV === 'production', // HTTPS only in production
	sameSite: 'lax' as const, // CSRF protection
	path: '/',
} satisfies Partial<ResponseCookie>;

/**
 * Access token configuration (short-lived)
 */
const ACCESS_TOKEN_CONFIG: Partial<ResponseCookie> = {
	...COOKIE_CONFIG,
	maxAge: 60 * 15, // 15 minutes
};

/**
 * Refresh token configuration (long-lived)
 */
const REFRESH_TOKEN_CONFIG: Partial<ResponseCookie> = {
	...COOKIE_CONFIG,
	maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Set authentication cookies
 *
 * Sets both access_token and refresh_token as httpOnly cookies
 *
 * @param tokens - Authentication tokens from Directus
 *
 * @example
 * ```tsx
 * // In a Route Handler
 * export async function POST(request: NextRequest) {
 *   const authResult = await directusClient.login(email, password);
 *   await setAuthCookies(authResult);
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export async function setAuthCookies(tokens: AuthTokens): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set('access_token', tokens.access_token, ACCESS_TOKEN_CONFIG);
	cookieStore.set('refresh_token', tokens.refresh_token, REFRESH_TOKEN_CONFIG);

	// Optional: store token expiration for client-side countdown
	cookieStore.set('token_expires_at', tokens.expires.toString(), {
		...COOKIE_CONFIG,
		httpOnly: false, // Client needs to read this
		maxAge: ACCESS_TOKEN_CONFIG.maxAge,
	});
}

/**
 * Update only the access token (used during refresh)
 *
 * @param accessToken - New access token
 * @param expires - Token expiration in milliseconds
 */
export async function updateAccessToken(accessToken: string, expires: number): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set('access_token', accessToken, ACCESS_TOKEN_CONFIG);
	cookieStore.set('token_expires_at', expires.toString(), {
		...COOKIE_CONFIG,
		httpOnly: false,
		maxAge: ACCESS_TOKEN_CONFIG.maxAge,
	});
}

/**
 * Clear all authentication cookies
 *
 * Removes access_token, refresh_token, and token_expires_at
 *
 * @example
 * ```tsx
 * // In logout route
 * export async function POST() {
 *   await clearAuthCookies();
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export async function clearAuthCookies(): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.delete('access_token');
	cookieStore.delete('refresh_token');
	cookieStore.delete('token_expires_at');
}

/**
 * Get access token from cookies
 *
 * @returns Access token or null if not found
 */
export async function getAccessToken(): Promise<string | null> {
	const cookieStore = await cookies();
	
return cookieStore.get('access_token')?.value || null;
}

/**
 * Get refresh token from cookies
 *
 * @returns Refresh token or null if not found
 */
export async function getRefreshToken(): Promise<string | null> {
	const cookieStore = await cookies();
	
return cookieStore.get('refresh_token')?.value || null;
}

/**
 * Check if tokens exist (without validating)
 *
 * @returns True if both tokens are present
 */
export async function hasAuthCookies(): Promise<boolean> {
	const accessToken = await getAccessToken();
	const refreshToken = await getRefreshToken();

	return Boolean(accessToken && refreshToken);
}

/**
 * Get token expiration timestamp
 *
 * @returns Expiration timestamp in milliseconds, or null
 */
export async function getTokenExpiration(): Promise<number | null> {
	const cookieStore = await cookies();
	const expiresAt = cookieStore.get('token_expires_at')?.value;

	return expiresAt ? parseInt(expiresAt, 10) : null;
}

/**
 * Check if access token is expired (based on stored timestamp)
 *
 * Note: This checks the stored expiration, not the actual token validity
 *
 * @returns True if expired or no expiration found
 */
export async function isTokenExpired(): Promise<boolean> {
	const expiresAt = await getTokenExpiration();

	if (!expiresAt) {
		return true;
	}

	return Date.now() >= expiresAt;
}
