import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { readItem } from '@directus/sdk';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { Event } from '@/types/directus-schema';
import EventoDetalhesClient from './EventoDetalhesClient';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

export default async function EventoDetalhesPage({ params }: PageProps) {
	// Resolve params (Next.js 15 async params)
	const { evento_id } = await params;

	// Get access token directly from cookies (only in Server Component)
	const cookieStore = await cookies();
	const accessToken = cookieStore.get('access_token')?.value;

	if (!accessToken) {
		// User not authenticated - redirect to login
		redirect(`/login?redirect=/admin/eventos/${evento_id}`);
	}

	try {
		// Get authenticated Directus client
		const client = getAuthenticatedClient(accessToken);

		// Fetch event data on the server
		const event = await client.request(
			readItem('events', evento_id, {
				fields: [
					'*',
					{ category_id: ['*'] },
					{ cover_image: ['*'] },
					{ organizer_id: ['*'] },
					{ registrations: ['*'] },
					{ tickets: ['*'] },
				],
			})
		);

		if (!event) {
			notFound();
		}

		// Pass server-fetched data to client component
		return <EventoDetalhesClient initialEvent={event as Event} evento_id={evento_id} />;
	} catch (error: any) {
		console.error('Error fetching event:', error);

		// If event not found or access denied
		if (error.status === 404 || error.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
			notFound();
		}

		// For other errors, redirect to events list
		redirect('/admin/eventos');
	}
}
