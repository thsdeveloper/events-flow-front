'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EventCategory } from '@/types/directus-schema';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import ImageUpload, { ImageUploadRef } from '@/components/admin/ImageUpload';
import TicketManagementModal from '@/components/admin/TicketManagementModal';

export default function NovoEventoPage() {
	const router = useRouter();
	const { user } = useAuth();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [hasOrganizer, setHasOrganizer] = useState<boolean | null>(null);
	const [checkingOrganizer, setCheckingOrganizer] = useState(true);
	const [categories, setCategories] = useState<EventCategory[]>([]);
	const [eventType, setEventType] = useState<'in_person' | 'online' | 'hybrid'>('in_person');
	const [isFree, setIsFree] = useState(true);
	const [tags, setTags] = useState<string[]>([]);
	const [currentTag, setCurrentTag] = useState('');
	const [status, setStatus] = useState('draft');
	const [categoryId, setCategoryId] = useState('');
	const [coverImage, setCoverImage] = useState<string | null>(null);
	const imageUploadRef = useRef<ImageUploadRef>(null);
	const [showTicketModal, setShowTicketModal] = useState(false);
	const [createdEventId, setCreatedEventId] = useState<string | null>(null);

	// Check if user has organizer profile and fetch categories
	useEffect(() => {
		const checkOrganizerProfile = async () => {
			try {
				if (!user?.id) {
					setCheckingOrganizer(false);
					return;
				}

				// Use Next.js API route (cookies sent automatically)
				const response = await fetch(`/api/organizer?userId=${user.id}`, {
					credentials: 'include',
				});

				const data = await response.json();
				setHasOrganizer(!!data.organizer);
			} catch (error) {
				console.error('Error checking organizer:', error);
				setHasOrganizer(false);
			} finally {
				setCheckingOrganizer(false);
			}
		};

		const fetchCategories = async () => {
			try {
				const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
				// Fetch public categories data (no auth needed)
				const response = await fetch(`${directusUrl}/items/event_categories?sort=name&limit=-1`);
				const data = await response.json();
				if (response.ok && data.data) {
					setCategories(data.data);
				}
			} catch (error) {
				console.error('Error fetching categories:', error);
			}
		};

		if (user) {
			checkOrganizerProfile();
			fetchCategories();
		}
	}, [user]);

	const addTag = () => {
		if (currentTag.trim() && !tags.includes(currentTag.trim())) {
			setTags([...tags, currentTag.trim()]);
			setCurrentTag('');
		}
	};

	const removeTag = (tagToRemove: string) => {
		setTags(tags.filter(tag => tag !== tagToRemove));
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const formData = new FormData(e.currentTarget);

			// Upload image first if there's a new one
			let uploadedImageId = coverImage;
			if (imageUploadRef.current) {
				try {
					uploadedImageId = await imageUploadRef.current.uploadFile();
				} catch (error) {
					toast({
						title: 'Erro',
						description: 'Erro ao fazer upload da imagem',
						variant: 'destructive',
					});
					setIsLoading(false);
					return;
				}
			}

			// Parse form data
			const title = formData.get('title') as string;
			const description = formData.get('description') as string;
			const shortDescription = formData.get('short_description') as string;
			const startDate = formData.get('start_date') as string;
			const endDate = formData.get('end_date') as string;
			const maxAttendees = formData.get('max_attendees') as string;
			const locationName = formData.get('location_name') as string;
			const locationAddress = formData.get('location_address') as string;
			const onlineUrl = formData.get('online_url') as string;
			const registrationStart = formData.get('registration_start') as string;
			const registrationEnd = formData.get('registration_end') as string;
			const price = formData.get('price') as string;
			const featured = formData.get('featured') === 'on';

			// Validate required fields
			if (!title || !description || !startDate) {
				toast({
					title: 'Erro',
					description: 'Preencha todos os campos obrigatórios',
					variant: 'destructive',
				});
				setIsLoading(false);
				return;
			}

			// Create event data
			const eventData: any = {
				title,
				description,
				short_description: shortDescription || null,
				start_date: startDate,
				end_date: endDate || startDate,
				event_type: eventType,
				location_name: locationName || null,
				location_address: locationAddress || null,
				online_url: onlineUrl || null,
				max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
				registration_start: registrationStart || null,
				registration_end: registrationEnd || null,
				status: status || 'draft',
				is_free: isFree,
				price: !isFree && price ? parseFloat(price) : null,
				category_id: categoryId || null,
				tags: tags.length > 0 ? tags : null,
				featured: featured,
				cover_image: uploadedImageId,
			};

			// Use Next.js API route (cookies sent automatically)
			const response = await fetch('/api/events', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(eventData),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Erro ao criar evento');
			}

			toast({
				title: 'Sucesso',
				description: 'Evento criado com sucesso!',
			});

			// Save event ID and show ticket management option
			setCreatedEventId(data.event?.id || null);

			// Optionally navigate after a delay to allow ticket setup
			// router.push('/admin-eventos');
		} catch (error: any) {
			console.error('Error creating event:', error);
			toast({
				title: 'Erro',
				description: error.message || 'Erro ao criar evento',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	if (checkingOrganizer) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Verificando perfil...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link
					href="/admin-eventos"
					className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
				>
					<ArrowLeft className="size-5" />
				</Link>
				<div>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Criar Novo Evento
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Preencha os dados do seu evento
					</p>
				</div>
			</div>

			{/* Warning if no organizer profile */}
			{hasOrganizer === false && (
				<div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded-lg">
					<div className="flex items-start gap-4">
						<AlertCircle className="size-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
								Perfil de Organizador Necessário
							</h3>
							<p className="text-yellow-700 dark:text-yellow-300 mb-4">
								Para criar eventos, você precisa primeiro cadastrar seu perfil como organizador.
								O perfil de organizador permite que você gerencie seus eventos, acompanhe inscrições
								e tenha acesso a todas as funcionalidades da plataforma.
							</p>
							<div className="flex gap-3">
								<Link
									href="/account"
									className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
								>
									Criar Perfil de Organizador
								</Link>
								<Link
									href="/admin-eventos"
									className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
								>
									Voltar
								</Link>
							</div>
						</div>
					</div>
				</div>
			)}

			<form
				onSubmit={handleSubmit}
				className={`space-y-6 ${hasOrganizer === false ? 'opacity-50 pointer-events-none' : ''}`}
			>
				{/* Status e Publicação */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
						📋 Status e Publicação
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Status do Evento *
							</label>
							<Select value={status} onValueChange={setStatus}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione o status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="draft">
										<div className="flex items-center gap-2">
											<span className="inline-block size-2 rounded-full bg-gray-500"></span>
											Rascunho
										</div>
									</SelectItem>
									<SelectItem value="published">
										<div className="flex items-center gap-2">
											<span className="inline-block size-2 rounded-full bg-green-500"></span>
											Publicado
										</div>
									</SelectItem>
									<SelectItem value="cancelled">
										<div className="flex items-center gap-2">
											<span className="inline-block size-2 rounded-full bg-red-500"></span>
											Cancelado
										</div>
									</SelectItem>
									<SelectItem value="archived">
										<div className="flex items-center gap-2">
											<span className="inline-block size-2 rounded-full bg-yellow-500"></span>
											Arquivado
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Categoria
							</label>
							<Select value={categoryId} onValueChange={setCategoryId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione uma categoria" />
								</SelectTrigger>
								<SelectContent>
									{categories.length === 0 ? (
										<div className="px-2 py-1.5 text-sm text-gray-500">
											Nenhuma categoria disponível
										</div>
									) : (
										categories.map((category) => (
											<SelectItem key={category.id} value={category.id}>
												{category.icon && <span className="mr-2">{category.icon}</span>}
												{category.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							name="featured"
							id="featured"
							className="size-4 text-accent border-gray-300 rounded focus:ring-accent"
						/>
						<label htmlFor="featured" className="text-sm text-gray-700 dark:text-gray-300">
							⭐ Destacar este evento na página inicial
						</label>
					</div>
				</div>

				{/* Informações Básicas */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
						📝 Informações Básicas
					</h2>

					<ImageUpload
						ref={imageUploadRef}
						value={coverImage}
						onChange={setCoverImage}
						label="Imagem de Capa"
						description="Imagem principal do evento (recomendado: 1200x630px)"
					/>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Nome do Evento *
						</label>
						<input
							type="text"
							name="title"
							required
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
							placeholder="Ex: Workshop de React Avançado"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Descrição Resumida
						</label>
						<input
							type="text"
							name="short_description"
							maxLength={160}
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
							placeholder="Uma breve descrição para listagens (máx. 160 caracteres)"
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Aparecerá nos cards e compartilhamentos
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Descrição Completa *
						</label>
						<textarea
							name="description"
							required
							rows={6}
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
							placeholder="Descreva detalhadamente seu evento: conteúdo, objetivos, o que os participantes vão aprender..."
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Tags
						</label>
						<div className="space-y-2">
							<div className="flex gap-2">
								<input
									type="text"
									value={currentTag}
									onChange={(e) => setCurrentTag(e.target.value)}
									onKeyPress={handleKeyPress}
									className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
									placeholder="Digite uma tag e pressione Enter"
								/>
								<button
									type="button"
									onClick={addTag}
									className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
								>
									Adicionar
								</button>
							</div>
							{tags.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{tags.map((tag) => (
										<span
											key={tag}
											className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
										>
											{tag}
											<button
												type="button"
												onClick={() => removeTag(tag)}
												className="hover:text-accent-foreground"
											>
												<X className="size-3" />
											</button>
										</span>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Datas e Horários */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
						📅 Datas e Horários
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Data e Hora de Início *
							</label>
							<input
								type="datetime-local"
								name="start_date"
								required
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Data e Hora de Término
							</label>
							<input
								type="datetime-local"
								name="end_date"
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
							/>
						</div>
					</div>

					<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
							Período de Inscrições
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Início das Inscrições
								</label>
								<input
									type="datetime-local"
									name="registration_start"
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Encerramento das Inscrições
								</label>
								<input
									type="datetime-local"
									name="registration_end"
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Tipo e Localização */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
						📍 Tipo e Localização
					</h2>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
							Tipo de Evento *
						</label>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${eventType === 'in_person' ? 'border-accent bg-accent/5' : 'border-gray-300 dark:border-gray-600'}`}>
								<input
									type="radio"
									name="event_type"
									value="in_person"
									checked={eventType === 'in_person'}
									onChange={(e) => setEventType(e.target.value as any)}
									className="sr-only"
								/>
								<div className="flex-1">
									<div className="text-2xl mb-1">🏢</div>
									<div className="font-medium text-gray-900 dark:text-white">Presencial</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">Evento físico</div>
								</div>
							</label>

							<label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${eventType === 'online' ? 'border-accent bg-accent/5' : 'border-gray-300 dark:border-gray-600'}`}>
								<input
									type="radio"
									name="event_type"
									value="online"
									checked={eventType === 'online'}
									onChange={(e) => setEventType(e.target.value as any)}
									className="sr-only"
								/>
								<div className="flex-1">
									<div className="text-2xl mb-1">💻</div>
									<div className="font-medium text-gray-900 dark:text-white">Online</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">Virtual</div>
								</div>
							</label>

							<label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${eventType === 'hybrid' ? 'border-accent bg-accent/5' : 'border-gray-300 dark:border-gray-600'}`}>
								<input
									type="radio"
									name="event_type"
									value="hybrid"
									checked={eventType === 'hybrid'}
									onChange={(e) => setEventType(e.target.value as any)}
									className="sr-only"
								/>
								<div className="flex-1">
									<div className="text-2xl mb-1">🌐</div>
									<div className="font-medium text-gray-900 dark:text-white">Híbrido</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">Ambos</div>
								</div>
							</label>
						</div>
					</div>

					{(eventType === 'in_person' || eventType === 'hybrid') && (
						<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Nome do Local
								</label>
								<input
									type="text"
									name="location_name"
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
									placeholder="Ex: Teatro Municipal, Centro de Convenções"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Endereço Completo
								</label>
								<input
									type="text"
									name="location_address"
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
									placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
								/>
							</div>
						</div>
					)}

					{(eventType === 'online' || eventType === 'hybrid') && (
						<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Link do Evento Online
							</label>
							<input
								type="url"
								name="online_url"
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
								placeholder="https://zoom.us/j/123456789 ou https://meet.google.com/..."
							/>
						</div>
					)}
				</div>

				{/* Ingressos e Vagas */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
							🎫 Ingressos e Vagas
						</h2>
						{createdEventId && (
							<button
								type="button"
								onClick={() => setShowTicketModal(true)}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
							>
								Gerenciar Ingressos
							</button>
						)}
					</div>

					{!createdEventId ? (
						<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<p className="text-sm text-blue-800 dark:text-blue-300">
								💡 <strong>Dica:</strong> Primeiro salve o evento, depois você poderá criar e gerenciar diferentes tipos de ingressos (gratuitos, pagos, meia-entrada, VIP, etc.) com controle de quantidade, período de vendas e muito mais.
							</p>
						</div>
					) : (
						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
							<p className="text-sm text-green-800 dark:text-green-300">
								✅ Evento criado! Agora você pode adicionar ingressos clicando no botão "Gerenciar Ingressos" acima.
							</p>
						</div>
					)}

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Vagas Totais do Evento
						</label>
						<input
							type="number"
							name="max_attendees"
							min="1"
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
							placeholder="Ex: 100 (deixe vazio para vagas ilimitadas)"
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Limite geral de participantes (independente dos ingressos)
						</p>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-4 pt-4">
					<button
						type="submit"
						disabled={isLoading || hasOrganizer === false}
						className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? 'Criando...' : 'Criar Evento'}
					</button>
					<Link
						href="/admin-eventos"
						className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						Cancelar
					</Link>
				</div>
			</form>

			{/* Ticket Management Modal */}
			<TicketManagementModal
				isOpen={showTicketModal}
				onClose={() => setShowTicketModal(false)}
				eventId={createdEventId}
				onTicketsUpdate={() => {
					// Refresh or handle ticket updates if needed
				}}
			/>
		</div>
	);
}
