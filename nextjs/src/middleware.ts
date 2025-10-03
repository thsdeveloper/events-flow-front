import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Admin routes require authentication
	if (pathname.includes('/(admin)')) {
		const token = request.cookies.get('directus_token')?.value;

		if (!token) {
			const loginUrl = new URL('/login', request.url);
			loginUrl.searchParams.set('redirect', pathname);
			
return NextResponse.redirect(loginUrl);
		}
	}

	// Redirect authenticated users from login/register to dashboard
	if (pathname === '/login' || pathname === '/register') {
		const token = request.cookies.get('directus_token')?.value;
		if (token) {
			return NextResponse.redirect(new URL('/dashboard', request.url));
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico, sitemap.xml, robots.txt (public files)
		 */
		'/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
	],
};
