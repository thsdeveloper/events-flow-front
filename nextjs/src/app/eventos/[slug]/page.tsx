import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchEventBySlug } from '@/lib/directus/fetchers';
import DirectusImage from '@/components/shared/DirectusImage';
import { Calendar, MapPin, Clock, Users, DollarSign, Globe, Share2 } from 'lucide-react';

interface EventPageProps {
	params: {
		slug: string;
	};
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
	try {
		const event = await fetchEventBySlug(params.slug);

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
	let event;

	try {
		event = await fetchEventBySlug(params.slug);
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

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Hero Section with Image */}
			<div className="relative h-[400px] bg-gradient-to-br from-purple-900 to-indigo-800">
				{event.cover_image ? (
					<DirectusImage
						uuid={event.cover_image}
						alt={event.title}
						fill
						className="object-cover opacity-60"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center">
						<Calendar className="w-32 h-32 text-white opacity-30" />
					</div>
				)}

				{/* Overlay gradient */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

				{/* Event Title */}
				<div className="absolute bottom-0 left-0 right-0 p-8">
					<div className="max-w-7xl mx-auto">
						<h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{event.title}</h1>
						<div className="flex flex-wrap gap-4 text-white/90">
							<div className="flex items-center gap-2">
								<Calendar className="w-5 h-5" />
								<span className="font-medium">{formatDateRange()}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock className="w-5 h-5" />
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
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Descrição do evento</h2>
							{event.short_description && (
								<p className="text-lg text-gray-700 mb-4 font-medium">{event.short_description}</p>
							)}
							{event.description && (
								<div
									className="prose prose-lg max-w-none text-gray-600"
									dangerouslySetInnerHTML={{ __html: event.description }}
								/>
							)}
						</div>

						{/* Location */}
						{(event.location_name || event.location_address) && (
							<div className="bg-white rounded-2xl shadow-sm p-8">
								<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
									<MapPin className="w-6 h-6 text-purple-600" />
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
									<Globe className="w-6 h-6 text-purple-600" />
									Link Online
								</h2>
								<a
									href={event.online_url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-purple-600 hover:text-purple-700 underline break-all"
								>
									{event.online_url}
								</a>
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
									) : (
										<div>
											<p className="text-sm text-gray-600 mb-2">Ingressos entre</p>
											<p className="text-4xl font-bold text-gray-900">
												R$ {Number(event.price || 0).toFixed(2)}
											</p>
										</div>
									)}
								</div>

								<button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 text-lg">
									Comprar ingressos
								</button>

								{!event.is_free && (
									<p className="text-center text-sm text-gray-500 mt-4">Parcele em até 12x</p>
								)}
							</div>

							{/* Event Info */}
							<div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
								<div className="flex items-start gap-3">
									<Calendar className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
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
										<Users className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
										<div>
											<p className="font-semibold text-gray-900 mb-1">Capacidade</p>
											<p className="text-sm text-gray-600">
												{event.max_attendees.toLocaleString('pt-BR')} participantes
											</p>
										</div>
									</div>
								)}

								<div className="flex items-start gap-3">
									<Globe className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
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
							</div>

							{/* Share Button */}
							<button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2">
								<Share2 className="w-5 h-5" />
								Compartilhar
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
