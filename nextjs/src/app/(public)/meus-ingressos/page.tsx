import {requireAuth, getAuthenticatedServerClient} from '@/lib/auth/server-auth';
import {readItems} from '@directus/sdk';
import {Ticket, Sparkles} from 'lucide-react';
import {MyTicketsContent} from '@/components/tickets/MyTicketsContent';
import type {EventRegistration} from '@/types/directus-schema';

export const metadata = {
	title: 'Meus Ingressos | Plataforma de Eventos',
	description: 'Gerencie seus ingressos de eventos',
};

export default async function MeusIngressosPage() {
	// ⭐ SSR Authentication - validates user authentication
	const {user} = await requireAuth();

	// Get authenticated Directus client
	const client = await getAuthenticatedServerClient();

	try {
		// Fetch user's tickets with all details
		const registrations = await client.request(
			readItems('event_registrations', {
				filter: {
					_and: [
						{user_id: {_eq: user.id}},
						{
							_or: [
								{payment_status: {_eq: 'paid'}},
								{payment_status: {_eq: 'free'}},
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
			}),
		);

		return (
			<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
				<div className="container mx-auto px-4 py-8 md:py-12">
					{/* Page Header */}
					<div className="mb-8 space-y-4">
						<div className="flex items-center gap-3">
							<div
								className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
								<Ticket className="size-6 text-white"/>
							</div>
							<div>
								<h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
									Meus Ingressos
									<Sparkles className="size-8 text-amber-500"/>
								</h1>
								<p className="text-gray-600 dark:text-gray-400">
									Gerencie todos os seus ingressos em um só lugar
								</p>
							</div>
						</div>
					</div>

					{/* Content */}
					<MyTicketsContent registrations={registrations as EventRegistration[]}/>
				</div>
			</div>
		);
	} catch (error) {
		console.error('Error fetching tickets:', error);

		return (
			<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
				<div className="container mx-auto px-4 py-8 md:py-12">
					<div className="mb-8">
						<h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
							Meus Ingressos
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							Gerencie todos os seus ingressos em um só lugar
						</p>
					</div>

					<div
						className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950">
						<p className="text-red-700 dark:text-red-300">
							Erro ao carregar seus ingressos. Por favor, tente novamente mais tarde.
						</p>
					</div>
				</div>
			</div>
		);
	}
}
