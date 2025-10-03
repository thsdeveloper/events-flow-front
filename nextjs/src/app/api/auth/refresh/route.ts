import { NextRequest, NextResponse } from 'next/server';
import { createDirectus, rest, authentication, refresh, readUser, withToken } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';

export async function POST(request: NextRequest) {
	try {
		// Read refresh token from httpOnly cookie
		const refresh_token = request.cookies.get('directus_refresh_token')?.value;

		if (!refresh_token) {
			return NextResponse.json(
				{ error: 'Refresh token não fornecido' },
				{ status: 400 }
			);
		}

		const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

		// Call Directus refresh endpoint directly
		const response = await fetch(`${directusUrl}/auth/refresh`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				refresh_token,
				mode: 'json',
			}),
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: 'Falha ao renovar token' },
				{ status: 401 }
			);
		}

		const data = await response.json();

		if (!data.data?.access_token) {
			return NextResponse.json(
				{ error: 'Falha ao renovar token' },
				{ status: 401 }
			);
		}

		// Get user data
		const meResponse = await fetch(`${directusUrl}/users/me?fields=id,email,first_name,last_name`, {
			headers: {
				'Authorization': `Bearer ${data.data.access_token}`,
			},
		});

		const meData = await meResponse.json();

		const nextResponse = NextResponse.json({
			success: true,
			user: meData.data,
		});

		// Update cookies with new tokens
		nextResponse.cookies.set('directus_token', data.data.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: data.data.expires ? data.data.expires / 1000 : 86400,
		});

		if (data.data.refresh_token) {
			nextResponse.cookies.set('directus_refresh_token', data.data.refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 604800, // 7 days
			});
		}

		return nextResponse;
	} catch (error: any) {
		console.error('Refresh token error:', error);

		if (error.errors) {
			const firstError = error.errors[0];

			return NextResponse.json(
				{ error: firstError.message || 'Token expirado' },
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{ error: 'Erro ao renovar token. Faça login novamente.' },
			{ status: 401 }
		);
	}
}
