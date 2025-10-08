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

		// Fetch user's tickets with all details
		const registrations = await client.request(
			readItems('event_registrations', {
				filter: {
					_and: [
						{ user_id: { _eq: userId } },
						{
							_or: [
								{ payment_status: { _eq: 'paid' } },
								{ payment_status: { _eq: 'free' } },
							],
						},
					],
				},
				fields: [
					'id',
					'ticket_code',
					'quantity',
					'total_amount',
					'unit_price',
					'service_fee',
					'participant_name',
					'participant_email',
					'participant_phone',
					'status',
					'payment_status',
					'payment_method',
					'date_created',
					'check_in_date',
					{
						event_id: [
							'id',
							'title',
							'slug',
							'start_date',
							'end_date',
							'location_name',
							'location_address',
							'cover_image',
							'event_type',
							{
								category_id: ['id', 'name', 'slug', 'icon', 'color'],
							},
						],
					},
					{
						ticket_type_id: ['id', 'title', 'description', 'price'],
					},
				],
				sort: ['-date_created'],
			})
		);

		return NextResponse.json(registrations);
	} catch (error) {
		console.error('Error fetching tickets:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch tickets' },
			{ status: 500 }
		);
	}
}
