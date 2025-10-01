import { NextRequest, NextResponse } from 'next/server';
import { createDirectus, rest, authentication, refresh, readUser, withToken } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';

export async function POST(request: NextRequest) {
	try {
		const { refresh_token } = await request.json();

		if (!refresh_token) {
			return NextResponse.json(
				{ error: 'Refresh token não fornecido' },
				{ status: 400 }
			);
		}

		const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
		const client = createDirectus<Schema>(directusUrl)
			.with(rest())
			.with(authentication('json'));

		// Refresh the access token
		const refreshResult = await client.refresh('json', refresh_token);

		if (!refreshResult.access_token) {
			return NextResponse.json(
				{ error: 'Falha ao renovar token' },
				{ status: 401 }
			);
		}

		// Get user data with the new token
		const basicUser = await client.request(
			withToken(refreshResult.access_token,
				async (client) => client.request({ method: 'GET', path: '/users/me' })
			)
		);

		// Use admin token to get full user data
		const adminToken = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_PUBLIC_TOKEN;
		const adminClient = createDirectus<Schema>(directusUrl).with(rest());

		const userData = await adminClient.request(
			withToken(
				adminToken as string,
				readUser(basicUser.id, {
					fields: ['id', 'email', 'first_name', 'last_name'],
				})
			)
		);

		return NextResponse.json({
			success: true,
			access_token: refreshResult.access_token,
			refresh_token: refreshResult.refresh_token,
			expires: refreshResult.expires,
			user: {
				id: userData.id,
				email: userData.email,
				first_name: userData.first_name,
				last_name: userData.last_name,
			}
		});
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
