/**
 * Next.js Middleware for Server-Side Authentication
 *
 * This middleware runs before every request and:
 * 1. Validates authentication tokens from httpOnly cookies
 * 2. Auto-refreshes expired tokens
 * 3. Enforces role-based access control (user vs organizer)
 * 4. Redirects unauthorized users to login
 * 5. Adds user context headers for Server Components
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readMe, readItems } from '@directus/sdk';
import { getAuthClient, getAuthenticatedClient } from '@/lib/directus/directus';
import { isOrganizerRole } from '@/lib/auth/roles';

/**
 * Generates a UUID v4 compatible with Edge Runtime
 * Uses Web Crypto API instead of Node.js crypto module
 */
function generateRequestId(): string {
	return crypto.randomUUID();
}

/**
 * Route configuration - Define which routes require authentication
 */
const ROUTES = {
	// Public routes - accessible to everyone (no authentication required)
	public: [
		'/',
		'/eventos',
		'/blog',
		'/login',
		'/register',
		'/api/auth/login',
		'/api/auth/register',
		'/api/auth/refresh',
		'/api/auth/logout',
	],

	// User routes - require authentication (for ticket buyers)
	user: ['/perfil', '/meus-ingressos'],

	// Admin routes - require organizer role (event management)
	admin: ['/admin'],
} as const;

/**
 * Check if a path matches any route in a list
 */
function matchesRoute(pathname: string, routes: readonly string[]): boolean {
	return routes.some((route) => {
		if (route === '/') return pathname === '/';
		
return pathname.startsWith(route);
	});
}

/**
 * Check if path is for static files or Next.js internals
 */
function isStaticOrInternal(pathname: string): boolean {
	return (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/api') ||
		pathname.includes('.') || // Files with extensions (images, fonts, etc)
		pathname === '/favicon.ico'
	);
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
	access_token: string;
	refresh_token: string;
	expires: number;
} | null> {
	try {
		const client = getAuthClient();
		client.setToken(refreshToken);

		const result = await client.refresh();

		if (!result.access_token || !result.refresh_token || result.expires === null || result.expires === undefined) {
			return null;
		}

		return {
			access_token: result.access_token,
			refresh_token: result.refresh_token,
			expires: result.expires,
		};
	} catch (error) {
		console.error('Token refresh failed:', error);
		
return null;
	}
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Generate or extract requestId for distributed tracing
	const requestId = request.headers.get('x-request-id') || generateRequestId();

	// Skip middleware for static files and Next.js internals
	if (isStaticOrInternal(pathname)) {
		const response = NextResponse.next();
		response.headers.set('x-request-id', requestId);
		
return response;
	}

	// Allow public routes
	if (matchesRoute(pathname, ROUTES.public)) {
		const response = NextResponse.next();
		response.headers.set('x-request-id', requestId);
		
return response;
	}

	// Get tokens from cookies
	const accessToken = request.cookies.get('access_token')?.value;
	const refreshToken = request.cookies.get('refresh_token')?.value;

	// No access token - check if we can refresh
	if (!accessToken) {
		if (refreshToken) {
			// Try to refresh the token
			const refreshed = await refreshAccessToken(refreshToken);

			if (refreshed) {
				// Successfully refreshed - continue with new token
				const response = NextResponse.next();

				// Set new cookies
				response.cookies.set('access_token', refreshed.access_token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'lax',
					maxAge: 60 * 15, // 15 minutes
					path: '/',
				});

				response.cookies.set('refresh_token', refreshed.refresh_token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7, // 7 days
					path: '/',
				});

				return response;
			}
		}

		// No token or refresh failed - redirect to login
		const loginUrl = new URL('/login', request.url);
		loginUrl.searchParams.set('redirect', pathname);
		const response = NextResponse.redirect(loginUrl);

		// Clear invalid cookies
		response.cookies.delete('access_token');
		response.cookies.delete('refresh_token');

		return response;
	}

	// Validate token and get user data
	try {
		console.log(`[Middleware] Validating access to: ${pathname}`);
		const client = getAuthenticatedClient(accessToken);

		const user = await client.request(
			readMe({
				fields: ['id', 'email', 'first_name', 'last_name', { role: ['id', 'name'] }],
			})
		);

		const hasOrganizerRole = isOrganizerRole(user.role);
		let organizerId: string | null = null;

		if (hasOrganizerRole) {
			const organizers = await client.request(
				readItems('organizers', {
					filter: {
						user_id: { _eq: user.id },
						status: { _in: ['active', 'pending'] },
					},
					fields: ['id', 'name'],
					limit: 1,
				})
			);

			organizerId = organizers.length > 0 ? organizers[0].id : null;
		}

		const isOrganizer = hasOrganizerRole;

		// Enforce role-based access control
		if (matchesRoute(pathname, ROUTES.admin)) {
			// Admin routes - require organizer role
			if (!isOrganizer) {
				console.log(`[Middleware] Non-organizer trying to access ${pathname}, redirecting to /perfil`);

				return NextResponse.redirect(new URL('/perfil', request.url));
			}
		}
		// User routes (/perfil, /meus-ingressos) are accessible to all authenticated users

		// Allow request and add user context headers for Server Components
		const response = NextResponse.next();

		response.headers.set('x-request-id', requestId);
		response.headers.set('x-user-id', user.id);
		response.headers.set('x-user-email', user.email || '');
		response.headers.set('x-is-organizer', isOrganizer.toString());

		if (organizerId) {
			response.headers.set('x-organizer-id', organizerId);
		}

		return response;
	} catch (error) {
		console.error('[Middleware] Auth validation error:', error);

		// Token is invalid - try to refresh
		if (refreshToken) {
			const refreshed = await refreshAccessToken(refreshToken);

			if (refreshed) {
				// Refresh successful - retry the request
				const response = NextResponse.next();

				response.cookies.set('access_token', refreshed.access_token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'lax',
					maxAge: 60 * 15,
					path: '/',
				});

				response.cookies.set('refresh_token', refreshed.refresh_token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7,
					path: '/',
				});

				return response;
			}
		}

		// Cannot refresh - clear cookies and redirect to login
		const loginUrl = new URL('/login', request.url);
		loginUrl.searchParams.set('redirect', pathname);
		const response = NextResponse.redirect(loginUrl);

		response.cookies.delete('access_token');
		response.cookies.delete('refresh_token');

		return response;
	}
}

/**
 * Middleware matcher configuration
 *
 * Run middleware on all routes except:
 * - API routes (handled separately)
 * - Static files (_next/static, images, etc)
 * - Favicon
 */
export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - api (API routes - handled by route handlers)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (images, fonts, etc)
		 */
		'/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*|uploads/).*)',
	],
};
