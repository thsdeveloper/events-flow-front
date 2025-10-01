import { NextRequest, NextResponse } from 'next/server';
import { createDirectus, rest, readMe, readUser, withToken } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';

export async function GET(request: NextRequest) {
	try {
		const authHeader = request.headers.get('Authorization');

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Token não fornecido' },
				{ status: 401 }
			);
		}

		const token = authHeader.substring(7); // Remove 'Bearer '
		const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
		const client = createDirectus<Schema>(directusUrl).with(rest());

		// Get basic user info to get the ID
		const basicUser = await client.request(withToken(token, readMe()));

		// Use admin token to fetch full user data (bypass permissions issue)
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
			user: {
				id: userData.id,
				email: userData.email,
				first_name: userData.first_name,
				last_name: userData.last_name,
			}
		});
	} catch (error: any) {
		console.error('Get user error:', error);
		return NextResponse.json(
			{ error: 'Token inválido ou expirado' },
			{ status: 401 }
		);
	}
}
