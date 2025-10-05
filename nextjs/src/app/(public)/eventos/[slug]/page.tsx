import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchEventBySlug } from '@/lib/directus/fetchers';
import DirectusImage from '@/components/shared/DirectusImage';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Users, DollarSign, Globe, Share2, Tag, Ticket, Building2, Mail, Phone, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

interface EventPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
	const { slug } = await params;
	try {
		const event = await fetchEventBySlug(slug);

		return {
			title: event.title,
			description: event.short_description || event.description?.substring(0, 160),
		};
	} catch (error) {
		return {
			title: 'Evento não encontrado',
		};
	}
}

export default async function EventPage({ params }: EventPageProps) {
	const { slug } = await params;
	let event;

	try {
		event = await fetchEventBySlug(slug);
	} catch (error) {
		notFound();
	}

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);

return date.toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
		});
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);

return date.toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatDateRange = () => {
		const startDate = new Date(event.start_date);
		const endDate = new Date(event.end_date);

		const isSameDay = startDate.toDateString() === endDate.toDateString();

		if (isSameDay) {
			return `${startDate.getDate()} de ${startDate.toLocaleDateString('pt-BR', { month: 'long' })}`;
		} else {
			return `${startDate.getDate()} a ${endDate.getDate()} de ${endDate.toLocaleDateString('pt-BR', { month: 'long' })}`;
		}
	};

	const formatTimeRange = () => {
		const startTime = formatTime(event.start_date);
		const endTime = formatTime(event.end_date);
		const startDate = new Date(event.start_date);
		const endDate = new Date(event.end_date);

		const isSameDay = startDate.toDateString() === endDate.toDateString();

		if (isSameDay) {
			return `${startDate.toLocaleDateString('pt-BR', { weekday: 'long' })} às ${startTime}`;
		} else {
			return `${startDate.toLocaleDateString('pt-BR', { weekday: 'long' })} e ${endDate.toLocaleDateString('pt-BR', { weekday: 'long' })} às ${startTime}`;
		}
	};

	// Check if event has active tickets
	const hasTickets = event.tickets && event.tickets.length > 0;
	const eventOrganizer = event.organizer_id;
	const eventCategory = event.category_id;

	// Calculate ticket availability
	const getTicketAvailability = (ticket: any) => {
		const sold = ticket.quantity_sold || 0;
		const total = ticket.quantity;
		const available = total - sold;
		const percentage = (sold / total) * 100;

		return {
			sold,
			total,
			available,
			percentage,
			isSoldOut: available <= 0,
			isAlmostSoldOut: available <= total * 0.2 && available > 0
		};
	};

	// Check if ticket sales are active
	const isTicketSaleActive = (ticket: any) => {
		const now = new Date();
		const saleStart = ticket.sale_start_date ? new Date(ticket.sale_start_date) : null;
		const saleEnd = ticket.sale_end_date ? new Date(ticket.sale_end_date) : null;

		if (saleStart && now < saleStart) return false;
		if (saleEnd && now > saleEnd) return false;

		return true;
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Hero Section with Image */}
			<div className="relative h-[400px] bg-gradient-to-br from-purple-900 to-indigo-800">
				{event.cover_image ? (
					<DirectusImage
						uuid={typeof event.cover_image === 'string' ? event.cover_image : event.cover_image.id}
						alt={event.title}
						fill
						className="object-cover opacity-60"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center">
						<Calendar className="size-32 text-white opacity-30" />
					</div>
				)}

				{/* Overlay gradient */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

				{/* Event Title */}
				<div className="absolute bottom-0 inset-x-0 p-8">
					<div className="max-w-7xl mx-auto">
						{/* Category Badge */}
						{eventCategory && (
							<div className="mb-3">
								<span
									className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-white/90 bg-white/20 backdrop-blur-sm"
									style={{ backgroundColor: eventCategory.color ? `${eventCategory.color}40` : undefined }}
								>
									{eventCategory.icon && <span className="text-lg">{eventCategory.icon}</span>}
									{eventCategory.name}
								</span>
							</div>
						)}

						<h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{event.title}</h1>
						<div className="flex flex-wrap gap-4 text-white/90">
							<div className="flex items-center gap-2">
								<Calendar className="size-5" />
								<span className="font-medium">{formatDateRange()}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock className="size-5" />
								<span className="font-medium capitalize">{formatTimeRange()}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left Column - Event Details */}
					<div className="lg:col-span-2 space-y-8">
						{/* Description */}
						<div className="bg-white rounded-2xl shadow-sm p-8">
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Sobre o evento</h2>
							{event.short_description && (
								<p className="text-lg text-gray-700 mb-4 font-medium">{event.short_description}</p>
							)}
							{event.description && (
								<div
									className="prose prose-lg max-w-none text-gray-600"
									dangerouslySetInnerHTML={{ __html: event.description }}
								/>
							)}

							{/* Tags */}
							{event.tags && Array.isArray(event.tags) && event.tags.length > 0 && (
								<div className="mt-6 pt-6 border-t border-gray-200">
									<div className="flex flex-wrap gap-2">
										{event.tags.map((tag, index) => (
											<span
												key={index}
												className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
											>
												<Tag className="size-3" />
												{tag}
											</span>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Tickets Section - Only for paid events */}
						{!event.is_free && (
							<div className="bg-white rounded-2xl shadow-sm p-8">
								<h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
									<Ticket className="size-6 text-purple-600" />
									Ingressos
								</h2>

								{hasTickets ? (
									<div className="space-y-4">
										{event.tickets?.map((ticket: any) => {
											const availability = getTicketAvailability(ticket);
											const saleActive = isTicketSaleActive(ticket);

											return (
												<div
													key={ticket.id}
													className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors"
												>
													<div className="flex items-start justify-between mb-3">
														<div className="flex-1">
															<h3 className="text-lg font-bold text-gray-900">{ticket.title}</h3>
															{ticket.description && (
																<p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
															)}
														</div>
														<div className="text-right ml-4">
															{ticket.service_fee_type === 'passed_to_buyer' ? (
																<div>
																	<div className="text-sm text-gray-500 line-through">
																		R$ {Number(ticket.price).toFixed(2)}
																	</div>
																	<div className="text-2xl font-bold text-purple-600">
																		R$ {Number(ticket.buyer_price || ticket.price).toFixed(2)}
																	</div>
																	<div className="text-xs text-gray-500 mt-1">
																		(inclui taxa de conveniência)
																	</div>
																</div>
															) : (
																<div>
																	<p className="text-2xl font-bold text-purple-600">
																		R$ {Number(ticket.buyer_price || ticket.price).toFixed(2)}
																	</p>
																</div>
															)}
														</div>
													</div>

													{/* Availability Bar */}
													<div className="mb-4">
														<div className="flex justify-between text-sm mb-2">
															<span className="text-gray-600">
																{availability.available} de {availability.total} disponíveis
															</span>
															<span className="text-gray-600">
																{availability.percentage.toFixed(0)}% vendidos
															</span>
														</div>
														<div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
															<div
																className={`h-full rounded-full transition-all ${
																	availability.isSoldOut
																		? 'bg-red-500'
																		: availability.isAlmostSoldOut
																			? 'bg-orange-500'
																			: 'bg-purple-600'
																}`}
																style={{ width: `${availability.percentage}%` }}
															/>
														</div>
													</div>

													{/* Status and Actions */}
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-2">
															{availability.isSoldOut ? (
																<span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
																	<AlertCircle className="size-4" />
																	Esgotado
																</span>
															) : availability.isAlmostSoldOut ? (
																<span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600">
																	<AlertCircle className="size-4" />
																	Últimas vagas!
																</span>
															) : (
																<span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
																	<CheckCircle className="size-4" />
																	Disponível
																</span>
															)}
														</div>

														{!availability.isSoldOut && saleActive && (
															<Link href={`/eventos/${slug}/checkout`} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors inline-block text-center">
																Selecionar
															</Link>
														)}
													</div>

													{/* Sale period info */}
													{(ticket.sale_start_date || ticket.sale_end_date) && (
														<div className="mt-3 pt-3 border-t border-gray-100">
															<p className="text-xs text-gray-500">
																{ticket.sale_start_date && new Date(ticket.sale_start_date) > new Date() && (
																	<>Vendas iniciam em {formatDate(ticket.sale_start_date)}</>
																)}
																{ticket.sale_end_date && (
																	<>Vendas até {formatDate(ticket.sale_end_date)}</>
																)}
															</p>
														</div>
													)}
												</div>
											);
										})}
									</div>
								) : (
									<div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
										<div className="flex flex-col items-center gap-4">
											<div className="bg-gray-100 rounded-full p-4">
												<Ticket className="size-8 text-gray-400" />
											</div>
											<div>
												<h3 className="text-lg font-semibold text-gray-900 mb-2">
													Ingressos em breve
												</h3>
												<p className="text-gray-600 max-w-md">
													Os ingressos para este evento ainda não estão disponíveis para compra.
													Volte em breve ou entre em contato com o organizador para mais informações.
												</p>
											</div>
											{eventOrganizer && eventOrganizer.email && (
												<a
													href={`mailto:${eventOrganizer.email}`}
													className="mt-2 inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
												>
													<Mail className="size-4" />
													Entrar em contato
												</a>
											)}
										</div>
									</div>
								)}
							</div>
						)}

						{/* Location */}
						{(event.location_name || event.location_address) && (
							<div className="bg-white rounded-2xl shadow-sm p-8">
								<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
									<MapPin className="size-6 text-purple-600" />
									Local
								</h2>
								{event.location_name && (
									<p className="text-lg font-semibold text-gray-900 mb-2">{event.location_name}</p>
								)}
								{event.location_address && <p className="text-gray-600">{event.location_address}</p>}
							</div>
						)}

						{/* Online URL */}
						{event.online_url && (
							<div className="bg-white rounded-2xl shadow-sm p-8">
								<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
									<Globe className="size-6 text-purple-600" />
									Link Online
								</h2>
								<a
									href={event.online_url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 underline break-all"
								>
									{event.online_url}
									<ExternalLink className="size-4" />
								</a>
							</div>
						)}

						{/* Organizer Info */}
						{eventOrganizer && (
							<div className="bg-white rounded-2xl shadow-sm p-8">
								<h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
									<Building2 className="size-6 text-purple-600" />
									Organizador
								</h2>
								<div className="flex items-start gap-6">
									{eventOrganizer.logo && (
										<div className="flex-shrink-0">
											<DirectusImage
												uuid={typeof eventOrganizer.logo === 'string' ? eventOrganizer.logo : eventOrganizer.logo.id}
												alt={eventOrganizer.name || 'Organizador'}
												width={80}
												height={80}
												className="rounded-lg object-cover"
											/>
										</div>
									)}
									<div className="flex-1">
										<h3 className="text-xl font-bold text-gray-900 mb-2">{eventOrganizer.name}</h3>
										{eventOrganizer.description && (
											<div
												className="prose prose-sm text-gray-600 mb-4"
												dangerouslySetInnerHTML={{ __html: eventOrganizer.description }}
											/>
										)}
										<div className="space-y-2">
											{eventOrganizer.email && (
												<div className="flex items-center gap-2 text-sm text-gray-600">
													<Mail className="size-4 text-purple-600" />
													<a href={`mailto:${eventOrganizer.email}`} className="hover:text-purple-600">
														{eventOrganizer.email}
													</a>
												</div>
											)}
											{eventOrganizer.phone && (
												<div className="flex items-center gap-2 text-sm text-gray-600">
													<Phone className="size-4 text-purple-600" />
													<a href={`tel:${eventOrganizer.phone}`} className="hover:text-purple-600">
														{eventOrganizer.phone}
													</a>
												</div>
											)}
											{eventOrganizer.website && (
												<div className="flex items-center gap-2 text-sm text-gray-600">
													<Globe className="size-4 text-purple-600" />
													<a
														href={eventOrganizer.website}
														target="_blank"
														rel="noopener noreferrer"
														className="hover:text-purple-600"
													>
														{eventOrganizer.website}
													</a>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Right Column - Sidebar */}
					<div className="lg:col-span-1">
						<div className="sticky top-8 space-y-6">
							{/* Pricing Card */}
							<div className="bg-white rounded-2xl shadow-lg p-8">
								<div className="text-center mb-6">
									{event.is_free ? (
										<div>
											<p className="text-sm text-gray-600 mb-2">Entrada</p>
											<p className="text-4xl font-bold text-green-600">Gratuita</p>
										</div>
									) : hasTickets ? (
										<div>
											<p className="text-sm text-gray-600 mb-2">Ingressos a partir de</p>
											<p className="text-4xl font-bold text-gray-900">
												R${' '}
												{Math.min(
													...(event.tickets?.map((t: any) => Number(t.buyer_price || t.price)) || [0])
												).toFixed(2)}
											</p>
											<p className="text-xs text-gray-500 mt-1">
												Já inclui taxa de conveniência
											</p>
										</div>
									) : (
										<div>
											<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
												<AlertCircle className="size-6 text-amber-600 mx-auto mb-2" />
												<p className="text-sm text-amber-800 font-medium">
													Ingressos indisponíveis
												</p>
											</div>
										</div>
									)}
								</div>

								{event.is_free ? (
									<button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 text-lg">
										Inscrever-se gratuitamente
									</button>
								) : hasTickets ? (
									<>
										<Link href={`/eventos/${slug}/checkout`} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 text-lg inline-block text-center">
											Comprar ingressos
										</Link>
										<p className="text-center text-sm text-gray-500 mt-4">Parcele em até 12x</p>
									</>
								) : (
									<button
										disabled
										className="w-full bg-gray-300 text-gray-500 font-bold py-4 px-6 rounded-xl cursor-not-allowed text-lg"
									>
										Compra indisponível
									</button>
								)}
							</div>

							{/* Event Info */}
							<div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
								<div className="flex items-start gap-3">
									<Calendar className="size-5 text-purple-600 mt-0.5 flex-shrink-0" />
									<div>
										<p className="font-semibold text-gray-900 mb-1">Data e Hora</p>
										<p className="text-sm text-gray-600">
											{formatDate(event.start_date)} às {formatTime(event.start_date)}
										</p>
										{event.end_date && (
											<p className="text-sm text-gray-600">
												até {formatDate(event.end_date)} às {formatTime(event.end_date)}
											</p>
										)}
									</div>
								</div>

								{event.max_attendees && (
									<div className="flex items-start gap-3">
										<Users className="size-5 text-purple-600 mt-0.5 flex-shrink-0" />
										<div>
											<p className="font-semibold text-gray-900 mb-1">Capacidade</p>
											<p className="text-sm text-gray-600">
												{event.max_attendees.toLocaleString('pt-BR')} participantes
											</p>
										</div>
									</div>
								)}

								<div className="flex items-start gap-3">
									<Globe className="size-5 text-purple-600 mt-0.5 flex-shrink-0" />
									<div>
										<p className="font-semibold text-gray-900 mb-1">Tipo</p>
										<p className="text-sm text-gray-600 capitalize">
											{event.event_type === 'in_person'
												? 'Presencial'
												: event.event_type === 'online'
													? 'Online'
													: 'Híbrido'}
										</p>
									</div>
								</div>

								{(event.registration_start || event.registration_end) && (
									<div className="pt-4 border-t border-gray-100">
										<p className="font-semibold text-gray-900 mb-2 text-sm">Período de Inscrições</p>
										{event.registration_start && (
											<p className="text-xs text-gray-600">
												Início: {formatDate(event.registration_start)}
											</p>
										)}
										{event.registration_end && (
											<p className="text-xs text-gray-600">
												Término: {formatDate(event.registration_end)}
											</p>
										)}
									</div>
								)}
							</div>

							{/* Share Button */}
							<button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2">
								<Share2 className="size-5" />
								Compartilhar
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
