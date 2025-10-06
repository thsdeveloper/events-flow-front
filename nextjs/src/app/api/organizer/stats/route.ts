import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readItems } from '@directus/sdk';

export async function GET(request: NextRequest) {
	try {
		// Get token from Authorization header
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.replace('Bearer ', '');
		const client = getAuthenticatedClient(token);

		// Get organizerId from query params
		const { searchParams } = new URL(request.url);
		const organizerId = searchParams.get('organizerId');

		if (!organizerId) {
			return NextResponse.json({ error: 'Organizer ID is required' }, { status: 400 });
		}

		// Initialize stats
		let totalEvents = 0;
		let totalRegistrations = 0;
		let totalRevenue = 0;

		try {
			// Get total events count
			const events = await client.request(
				readItems('events', {
					filter: {
						organizer_id: {
							_eq: organizerId,
						},
					},
					fields: ['id'],
					limit: -1,
				})
			);
			totalEvents = events.length;

			// If there are events, get event IDs to query registrations
			if (events.length > 0) {
				const eventIds = events.map((event: any) => event.id);

				try {
					// Get registrations for these events
					const registrations = await client.request(
						readItems('event_registrations', {
							filter: {
								event_id: {
									_in: eventIds,
								},
							},
							fields: ['id', 'payment_amount', 'payment_status'],
							limit: -1,
						})
					);

					totalRegistrations = registrations.length;

					// Calculate total revenue from paid registrations
					totalRevenue = registrations
						.filter((reg: any) => reg.payment_status === 'paid')
						.reduce((sum: number, reg: any) => sum + (reg.payment_amount || 0), 0);
				} catch (regError) {
					console.error('Error fetching registrations:', regError);
					// Continue with 0 registrations if collection doesn't exist
				}
			}
		} catch (eventsError) {
			console.error('Error fetching events:', eventsError);
			// Return zeros if events collection query fails
		}

		return NextResponse.json({
			success: true,
			stats: {
				totalEvents,
				totalRegistrations,
				totalRevenue,
			},
		});
	} catch (error) {
		console.error('Error fetching organizer stats:', error);
		
return NextResponse.json(
			{
				error: 'Failed to fetch stats',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
