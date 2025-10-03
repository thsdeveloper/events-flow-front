import { NextRequest, NextResponse } from 'next/server';
import { createDirectus, rest, readMe, readUser, withToken } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';

export async function GET(request: NextRequest) {
	try {
		// Read token from httpOnly cookie
		const token = request.cookies.get('directus_token')?.value;

		if (!token) {
			return NextResponse.json(
				{ error: 'Token não fornecido' },
				{ status: 401 }
			);
		}

		const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
		const client = createDirectus<Schema>(directusUrl).with(rest());

		// Get user data using the user's token
		const userData = await client.request(
			withToken(
				token,
				readMe({
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
