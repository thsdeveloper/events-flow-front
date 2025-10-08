import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readItems } from '@directus/sdk';

export async function GET(request: NextRequest) {
	try {
		// Get token from Authorization header or cookies
		const authHeader = request.headers.get('Authorization');
		const accessToken = request.cookies.get('access_token')?.value;
		const token = authHeader?.replace('Bearer ', '') || accessToken;
		if (!token) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');
		if (!userId) {
			return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
		}
		const client = getAuthenticatedClient(token);
		const transactions = await client.request(
			readItems('payment_transactions', {
				filter: {
					registration_id: {
						user_id: { _eq: userId }
					}
				},
				fields: [
					'id',
					'stripe_event_id',
					'stripe_object_id',
					'event_type',
					'amount',
					'status',
					'date_created',
					{
						registration_id: [
							'id',
							'participant_name',
							'ticket_code',
							'quantity',
							'payment_method',
							{
								event_id: [
									'id',
									'title',
									'slug',
									'start_date',
									'cover_image'
								]
							}
						]
					}
				],
				sort: ['-date_created'],
			}),
		);
		return NextResponse.json(transactions);
	} catch (error) {
		return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
	}
}
