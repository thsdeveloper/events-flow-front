import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createDirectus, rest, readItems, staticToken } from '@directus/sdk';
import type { DirectusSchema } from '@/types/directus-schema';
import MyTickets from '@/components/tickets/MyTickets';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

async function getUserFromCookie() {
	const cookieStore = await cookies();
	const authToken = cookieStore.get('directus_token')?.value;

	if (!authToken) {
		return null;
	}

	try {
		const directus = createDirectus<DirectusSchema>(directusUrl)
			.with(rest())
			.with(staticToken(authToken));

		const users = await directus.request(
			readItems('directus_users', {
				filter: { id: { _eq: 'me' } },
				fields: ['id', 'email', 'first_name', 'last_name'],
				limit: 1,
			})
		);

		return users[0] || null;
	} catch (error) {
		console.error('Error fetching user:', error);
		return null;
	}
}

export default async function MeusIngressosPage() {
	const user = await getUserFromCookie();

	if (!user) {
		redirect('/login?redirect=/meus-ingressos');
	}

	// Fetch user's tickets
	const directus = createDirectus<DirectusSchema>(directusUrl).with(rest());

	try {
		const registrations = await directus.request(
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
						event_id: ['id', 'title', 'slug', 'event_date', 'location', 'cover_image'],
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
