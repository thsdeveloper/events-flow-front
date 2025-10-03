'use client';

import Link from 'next/link';
import { ArrowLeft, Edit, Users, UserCheck, Settings, Calendar, MapPin, Globe, DollarSign, Tag, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Event } from '@/types/directus-schema';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

export default function EventoDetalhesPage({ params }: PageProps) {
	const [id, setId] = useState<string>('');
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		params.then((p) => setId(p.evento_id));
	}, [params]);

	useEffect(() => {
		if (!id) return;

		const fetchEvent = async () => {
			try {
				// Use Next.js API route (cookies sent automatically)
				const response = await fetch(`/api/events/${id}`, {
					credentials: 'include',
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || 'Erro ao carregar evento');
				}

				setEvent(data.event);
			} catch (error: any) {
				console.error('Error fetching event:', error);
				setError(error.message || 'Erro ao carregar evento');
			} finally {
				setLoading(false);
			}
		};

		fetchEvent();
	}, [id]);

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
			<span className={`px-3 py-1 text-sm font-medium rounded ${statusInfo.className}`}>
				{statusInfo.label}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Carregando evento...</p>
				</div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Link
						href="/admin-eventos"
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
					>
						<ArrowLeft className="size-5" />
					</Link>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Erro</h1>
				</div>
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
					<p className="text-red-600 dark:text-red-400">{error || 'Evento não encontrado'}</p>
				</div>
			</div>
		);
	}

	const participantsCount = Array.isArray(event.registrations) ? event.registrations.length : 0;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						href="/admin-eventos"
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
					>
						<ArrowLeft className="size-5" />
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
								{event.title}
							</h1>
							{getStatusBadge(event.status)}
						</div>
						<p className="text-gray-600 dark:text-gray-400 mt-1">
							{event.slug}
						</p>
					</div>
				</div>
				<button className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors">
					<Edit className="size-4" />
					Editar
				</button>
			</div>

			{/* Event Info */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
					Informações do Evento
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<Calendar className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Data de Início</p>
								<p className="font-medium text-gray-900 dark:text-white">{formatDate(event.start_date)}</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<Calendar className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Data de Término</p>
								<p className="font-medium text-gray-900 dark:text-white">{formatDate(event.end_date)}</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<MapPin className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Tipo de Evento</p>
								<p className="font-medium text-gray-900 dark:text-white capitalize">
									{event.event_type === 'in_person' && 'Presencial'}
									{event.event_type === 'online' && 'Online'}
									{event.event_type === 'hybrid' && 'Híbrido'}
								</p>
							</div>
						</div>

						{event.location_address && (
							<div className="flex items-start gap-3">
								<MapPin className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400">Localização</p>
									<p className="font-medium text-gray-900 dark:text-white">{event.location_address}</p>
								</div>
							</div>
						)}

						{event.online_url && (
							<div className="flex items-start gap-3">
								<Globe className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400">Link Online</p>
									<a
										href={event.online_url}
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-accent hover:underline"
									>
										{event.online_url}
									</a>
								</div>
							</div>
						)}
					</div>

					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<Users className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Participantes</p>
								<p className="font-medium text-gray-900 dark:text-white">
									{participantsCount}
									{event.max_attendees && ` / ${event.max_attendees} vagas`}
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<DollarSign className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Valor</p>
								<p className="font-medium text-gray-900 dark:text-white">
									{event.is_free ? 'Gratuito' : `R$ ${Number(event.price || 0).toFixed(2)}`}
								</p>
							</div>
						</div>

						{event.featured && (
							<div className="flex items-start gap-3">
								<Star className="size-5 text-yellow-500 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400">Destaque</p>
									<p className="font-medium text-gray-900 dark:text-white">Evento em destaque</p>
								</div>
							</div>
						)}

						{event.tags && event.tags.length > 0 && (
							<div className="flex items-start gap-3">
								<Tag className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tags</p>
									<div className="flex flex-wrap gap-2">
										{event.tags.map((tag, index) => (
											<span
												key={index}
												className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{event.description && (
					<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Descrição</h3>
						<p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.description}</p>
					</div>
				)}
			</div>

			{/* Quick Actions */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Link
					href={`/admin-eventos/${id}/participantes`}
					className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-accent transition-colors"
				>
					<div className="flex items-center gap-4">
						<div className="size-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
							<Users className="size-6 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900 dark:text-white">
								Participantes
							</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Gerenciar participantes
							</p>
						</div>
					</div>
				</Link>

				<Link
					href={`/admin-eventos/${id}/inscricoes`}
					className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-accent transition-colors"
				>
					<div className="flex items-center gap-4">
						<div className="size-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
							<UserCheck className="size-6 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900 dark:text-white">
								Inscrições
							</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Ver inscrições
							</p>
						</div>
					</div>
				</Link>

				<Link
					href={`/admin-eventos/${id}/configuracoes`}
					className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-accent transition-colors"
				>
					<div className="flex items-center gap-4">
						<div className="size-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
							<Settings className="size-6 text-purple-600 dark:text-purple-400" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900 dark:text-white">
								Configurações
							</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Ajustes do evento
							</p>
						</div>
					</div>
				</Link>
			</div>
		</div>
	);
}
