'use client';

import Link from 'next/link';
import { Plus, Calendar, Users, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { readItems } from '@directus/sdk';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useDirectusClient } from '@/hooks/useDirectusClient';
import { Event } from '@/types/directus-schema';

export default function EventosPage() {
	const { user } = useServerAuth();
	const client = useDirectusClient();
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchEvents = async () => {
			if (!client) {
				setLoading(false);
				
return;
			}

			try {
				const data = await client.request(
					readItems('events', {
						fields: [
							'id',
							'title',
							'slug',
							'description',
							'short_description',
							'cover_image',
							'start_date',
							'end_date',
							'location_name',
							'location_address',
							'online_url',
							'event_type',
							'max_attendees',
							'registration_start',
							'registration_end',
							'is_free',
							'featured',
							'tags',
							'status',
							'sort',
							'user_created',
							'date_created',
							'user_updated',
							'date_updated',
							{ category_id: ['*'] },
							{ cover_image: ['*'] },
							{ organizer_id: ['*'] },
							{ registrations: ['*'] }
						],
						sort: ['-date_created'],
					})
				);
				setEvents(data as Event[] || []);
			} catch (error) {
				console.error('Error fetching events:', error);
			} finally {
				setLoading(false);
			}
		};

		if (user) {
			fetchEvents();
		} else {
			setLoading(false);
		}
	}, [user, client]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full size-8 border-b-2 border-accent"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Carregando eventos...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Meus Eventos
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Gerencie todos os seus eventos
					</p>
				</div>
				<Link
					href="/admin/eventos/novo"
					className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
				>
					<Plus className="size-5" />
					Criar Evento
				</Link>
			</div>

			{/* Events List */}
			{events.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{events.map((event) => (
						<EventCard key={event.id} event={event} />
					))}
				</div>
			) : (
				/* Empty State */
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
					<Calendar className="size-16 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
						Nenhum evento criado ainda
					</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						Comece criando seu primeiro evento
					</p>
					<Link
						href="/admin/eventos/novo"
						className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
					>
						<Plus className="size-5" />
						Criar Primeiro Evento
					</Link>
				</div>
			)}
		</div>
	);
}

interface EventCardProps {
	event: Event;
}

function EventCard({ event }: EventCardProps) {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		
return date.toLocaleDateString('pt-BR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getStatusBadge = (status?: string) => {
		const statusMap: Record<string, { label: string; className: string }> = {
			published: {
				label: 'Publicado',
				className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
			},
			draft: {
				label: 'Rascunho',
				className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
			},
			cancelled: {
				label: 'Cancelado',
				className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
			},
			archived: {
				label: 'Arquivado',
				className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
			},
		};

		const statusInfo = statusMap[status || 'draft'];
		
return (
			<span className={`px-2 py-1 text-xs font-medium rounded ${statusInfo.className}`}>
				{statusInfo.label}
			</span>
		);
	};

	const getLocation = () => {
		if (event.event_type === 'online') {
			return 'Evento Online';
		}
		if (event.event_type === 'hybrid') {
			return `${event.location_address || 'Híbrido'} (Online e Presencial)`;
		}
		
return event.location_address || event.location_name || 'Local a definir';
	};

	// Count registrations (placeholder for now)
	const participantsCount = Array.isArray(event.registrations)
		? event.registrations.length
		: 0;

	return (
		<Link
			href={`/admin/eventos/${event.id}`}
			className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-accent transition-colors"
		>
			<div className="flex items-start justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
					{event.title}
				</h3>
				{getStatusBadge(event.status)}
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
					<Calendar className="size-4 flex-shrink-0" />
					<span className="line-clamp-1">{formatDate(event.start_date)}</span>
				</div>
				<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
					<MapPin className="size-4 flex-shrink-0" />
					<span className="line-clamp-1">{getLocation()}</span>
				</div>
				<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
					<Users className="size-4 flex-shrink-0" />
					{participantsCount} participante{participantsCount !== 1 ? 's' : ''}
					{event.max_attendees && ` / ${event.max_attendees} vagas`}
				</div>
			</div>
		</Link>
	);
}
