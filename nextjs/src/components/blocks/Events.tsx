'use client';

import { useEffect, useState } from 'react';
import DirectusImage from '@/components/shared/DirectusImage';
import Tagline from '../ui/Tagline';
import Headline from '@/components/ui/Headline';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Clock } from 'lucide-react';
import { setAttr } from '@directus/visual-editing';
import Link from 'next/link';

interface Event {
	id: string;
	title: string;
	slug: string;
	short_description?: string;
	cover_image?: string;
	start_date: string;
	end_date: string;
	location_name?: string;
	location_address?: string;
	event_type: 'in_person' | 'online' | 'hybrid';
	is_free: boolean;
	featured: boolean;
}

interface EventsData {
	id: string;
	headline?: string;
	description?: string;
	events: Event[];
}

interface EventsProps {
	data: EventsData;
}

const Events = ({ data }: EventsProps) => {
	const { headline, description, events, id } = data;

	const [currentIndex, setCurrentIndex] = useState(0);
	const [itemsPerView, setItemsPerView] = useState(1);

	// Responsive items per view
	useEffect(() => {
		const updateItemsPerView = () => {
			if (window.innerWidth >= 1024) {
				setItemsPerView(3);
			} else if (window.innerWidth >= 768) {
				setItemsPerView(2);
			} else {
				setItemsPerView(1);
			}
		};

		updateItemsPerView();
		window.addEventListener('resize', updateItemsPerView);
		
return () => window.removeEventListener('resize', updateItemsPerView);
	}, []);

	const maxIndex = Math.max(0, events.length - itemsPerView);

	const handlePrev = () => {
		setCurrentIndex((prev) => Math.max(0, prev - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		
return date.toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
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

	if (!events || events.length === 0) {
		return null;
	}

	return (
		<section className="relative py-12">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{headline && (
					<Headline
						headline={headline}
						className="text-center mb-4"
						data-directus={setAttr({
							collection: 'block_events',
							item: id,
							fields: 'headline',
							mode: 'popover',
						})}
					/>
				)}
				{description && (
					<p
						className="text-center text-gray-600 mb-12 max-w-2xl mx-auto"
						data-directus={setAttr({
							collection: 'block_events',
							item: id,
							fields: 'description',
							mode: 'popover',
						})}
					>
						{description}
					</p>
				)}

				<div className="relative">
					{/* Navigation Buttons */}
					{events.length > itemsPerView && (
						<>
							<button
								onClick={handlePrev}
								disabled={currentIndex === 0}
								className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
								aria-label="Previous"
							>
								<ArrowLeft className="size-6 text-gray-800" />
							</button>
							<button
								onClick={handleNext}
								disabled={currentIndex >= maxIndex}
								className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
								aria-label="Next"
							>
								<ArrowRight className="size-6 text-gray-800" />
							</button>
						</>
					)}

					{/* Carousel Container */}
					<div className="overflow-hidden">
						<div
							className="flex transition-transform duration-500 ease-in-out gap-6"
							style={{
								transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
							}}
						>
							{events.map((event) => (
								<div
									key={event.id}
									className="flex-shrink-0"
									style={{ width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * 24 / itemsPerView}px)` }}
								>
									<Link href={`/eventos/${event.slug}`} className="block group">
										<div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 h-full">
											{/* Event Image */}
											<div className="relative h-64 overflow-hidden">
												{event.cover_image ? (
													<DirectusImage
														uuid={event.cover_image}
														alt={event.title}
														fill
														sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
														className="object-cover group-hover:scale-105 transition-transform duration-300"
													/>
												) : (
													<div className="size-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
														<Calendar className="size-20 text-white opacity-50" />
													</div>
												)}
												{event.featured && (
													<div className="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
														Destaque
													</div>
												)}
											</div>

											{/* Event Info */}
											<div className="p-6">
												<h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
													{event.title}
												</h3>

												{event.short_description && (
													<p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.short_description}</p>
												)}

												<div className="space-y-2 text-sm text-gray-600">
													<div className="flex items-start gap-2">
														<Calendar className="size-4 mt-0.5 flex-shrink-0 text-purple-600" />
														<span>
															{formatDate(event.start_date)} às {formatTime(event.start_date)}
														</span>
													</div>

													{event.location_name && (
														<div className="flex items-start gap-2">
															<MapPin className="size-4 mt-0.5 flex-shrink-0 text-purple-600" />
															<span className="line-clamp-1">{event.location_name}</span>
														</div>
													)}

													<div className="flex items-center gap-2 pt-2">
														{event.is_free && (
															<span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
																Gratuito
															</span>
														)}
														<span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold capitalize">
															{event.event_type === 'in_person'
																? 'Presencial'
																: event.event_type === 'online'
																	? 'Online'
																	: 'Híbrido'}
														</span>
													</div>
												</div>
											</div>
										</div>
									</Link>
								</div>
							))}
						</div>
					</div>

					{/* Dots Indicator */}
					{events.length > itemsPerView && (
						<div className="flex justify-center gap-2 mt-8">
							{Array.from({ length: maxIndex + 1 }).map((_, index) => (
								<button
									key={index}
									onClick={() => setCurrentIndex(index)}
									className={`size-2 rounded-full transition-all ${
										index === currentIndex ? 'bg-purple-600 w-8' : 'bg-gray-300'
									}`}
									aria-label={`Go to slide ${index + 1}`}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</section>
	);
};

export default Events;
