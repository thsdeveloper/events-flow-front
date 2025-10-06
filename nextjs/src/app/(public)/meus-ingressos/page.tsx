import { requireAuth, getAuthenticatedServerClient } from '@/lib/auth/server-auth';
import { readItems } from '@directus/sdk';
import MyTickets from '@/components/tickets/MyTickets';

export default async function MeusIngressosPage() {
	// ⭐ SSR Authentication - validates user authentication
	const { user } = await requireAuth();

	// Get authenticated Directus client
	const client = await getAuthenticatedServerClient();

	try {
		// Fetch user's tickets
		const registrations = await client.request(
			readItems('event_registrations', {
				filter: {
					_and: [
						{ user_id: { _eq: user.id } },
						{ payment_status: { _eq: 'paid' } },
						{ status: { _eq: 'confirmed' } },
					],
				},
				fields: [
					'id',
					'ticket_code',
					'quantity',
					'total_amount',
					'participant_name',
					'participant_email',
					'status',
					'payment_status',
					'date_created',
					{
						event_id: ['id', 'title', 'slug', 'start_date', 'end_date', 'location_name', 'location_address', 'cover_image'],
					},
					{
						ticket_type_id: ['id', 'title'],
					},
				],
				sort: ['-date_created'],
			})
		);

		return (
			<div className="container mx-auto px-4 py-8">
				<h1 className="mb-8 text-3xl font-bold">Meus Ingressos</h1>
				<MyTickets registrations={registrations as any} />
			</div>
		);
	} catch (error) {
		console.error('Error fetching tickets:', error);
		return (
			<div className="container mx-auto px-4 py-8">
				<h1 className="mb-8 text-3xl font-bold">Meus Ingressos</h1>
				<p className="text-muted-foreground">Erro ao carregar seus ingressos. Tente novamente mais tarde.</p>
			</div>
		);
	}
}
