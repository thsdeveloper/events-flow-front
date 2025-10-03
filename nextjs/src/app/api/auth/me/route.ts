import { NextRequest, NextResponse } from 'next/server';
import { readMe } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';

export async function GET(request: NextRequest) {
	try {
		// Get token from Authorization header
		const authHeader = request.headers.get('authorization');

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Token não fornecido' },
				{ status: 401 }
			);
		}

		const token = authHeader.replace('Bearer ', '');

		// Use the authenticated client helper
		const client = getAuthenticatedClient(token);

		// Get user data with all relations
		const userData = await client.request(
			readMe({
				fields: ['*', { role: ['*'] }, { avatar: ['*'] }],
			})
		);

		return NextResponse.json({
			user: userData
		});
	} catch (error: any) {
		console.error('Get user error:', error);

		return NextResponse.json(
			{ error: 'Token inválido ou expirado' },
			{ status: 401 }
		);
	}
}
