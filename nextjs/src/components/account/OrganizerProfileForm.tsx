'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { readItems, createItem, updateItem, uploadFiles } from '@directus/sdk';
import { useDirectusClient } from '@/hooks/useDirectusClient';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Organizer } from '@/types/directus-schema';
import { Loader2, Save, Upload, Plus, Building2, Info, CreditCard } from 'lucide-react';
import { StripeStatusCard } from '@/components/organizer/StripeStatusCard';
import { StripeOnboardingButton } from '@/components/organizer/StripeOnboardingButton';

const organizerProfileSchema = z.object({
	email: z.string().email('Email inválido'),
	phone: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	website: z.string().url('URL inválida').optional().or(z.literal('')).nullable(),
	document: z.string().optional().nullable(),
});

type OrganizerProfileFormValues = z.infer<typeof organizerProfileSchema>;

interface OrganizerProfileFormProps {
	userId: string;
}

export function OrganizerProfileForm({ userId }: OrganizerProfileFormProps) {
	const client = useDirectusClient();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [organizer, setOrganizer] = useState<Organizer | null>(null);
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const { toast } = useToast();
	const organizerStatusLabel = organizer?.status === 'pending'
		? 'Pendente'
		: organizer?.status === 'archived'
			? 'Arquivado'
			: 'Ativo';
	const organizerStatusBadgeClass = organizer?.status === 'active'
		? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
		: organizer?.status === 'pending'
			? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
			: 'bg-slate-500/10 text-slate-600 border-slate-500/30';

	const form = useForm<OrganizerProfileFormValues>({
		resolver: zodResolver(organizerProfileSchema),
		defaultValues: {
			email: '',
			phone: '',
			description: '',
			website: '',
			document: '',
		},
	});

	useEffect(() => {
		loadOrganizer();
	}, [userId]);

	const loadOrganizer = async () => {
		if (!client) return;

		try {
			setIsLoading(true);

			const organizers = await client.request(
				readItems('organizers', {
					filter: { user_id: { _eq: userId } },
					fields: [
						'*',
						{ logo: ['*'] },
						'stripe_account_id',
						'stripe_onboarding_complete',
						'stripe_charges_enabled',
						'stripe_payouts_enabled',
					],
					limit: 1,
				})
			);

			if (organizers && organizers.length > 0) {
				const org = organizers[0] as Organizer;
				setOrganizer(org);
				form.reset({
					email: org.email || '',
					phone: org.phone || '',
					description: org.description || '',
					website: org.website || '',
					document: org.document || '',
				});
			}
		} catch (error) {
			console.error('Error loading organizer:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setLogoFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setLogoPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const onSubmit = async (values: OrganizerProfileFormValues) => {
		if (!client) return;

		setIsSubmitting(true);

		try {
			let logoId: string | undefined;

			// Upload logo if a new file was selected
			if (logoFile) {
				const formData = new FormData();
				formData.append('file', logoFile);

				const uploadResult = await client.request(uploadFiles(formData));
				logoId = uploadResult.id;
			}

			const organizerData = {
				email: values.email,
				phone: values.phone || null,
				description: values.description || null,
				website: values.website || null,
				document: values.document || null,
				...(logoId && { logo: logoId }),
			};

			if (organizer) {
				// Update existing organizer
				await client.request(
					updateItem('organizers', organizer.id, organizerData)
				);

				toast({
					title: 'Perfil de organizador atualizado',
					description: 'Suas informações foram atualizadas com sucesso.',
				});
			} else {
				// Create new organizer
				await client.request(
					createItem('organizers', {
						...organizerData,
						status: 'active',
						user_id: userId,
					})
				);

				toast({
					title: 'Perfil de organizador criado',
					description: 'Seu perfil de organizador foi criado com sucesso.',
				});
			}

			// Reload organizer data
			await loadOrganizer();

			// Reset file states
			setLogoFile(null);
			setLogoPreview(null);
		} catch (error: any) {
			console.error('Error saving organizer:', error);
			toast({
				title: 'Erro ao salvar perfil',
				description: error.message || 'Ocorreu um erro ao salvar suas informações. Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		);
	}

	const currentLogoUrl =
		typeof organizer?.logo === 'string'
			? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${organizer.logo}`
			: organizer?.logo?.id
				? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${organizer.logo.id}`
				: null;

	return (
		<>
			{!organizer && (
				<div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg flex gap-3">
					<Info className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
					<p className="text-sm text-blue-900">
						Você ainda não possui um perfil de organizador. Preencha o formulário abaixo para criar
						um.
					</p>
				</div>
			)}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{/* Logo Upload */}
					<div className="space-y-2">
						<FormLabel>Logo do Organizador</FormLabel>
						<div className="flex items-center gap-4">
							<div className="flex items-center justify-center size-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden">
								{logoPreview || currentLogoUrl ? (
									<img
										src={logoPreview || currentLogoUrl || ''}
										alt="Logo"
										className="size-full object-cover"
									/>
								) : (
									<Building2 className="size-8 text-gray-400" />
								)}
							</div>
							<div>
								<Input
									type="file"
									accept="image/*"
									onChange={handleLogoChange}
									className="hidden"
									id="logo-upload"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => document.getElementById('logo-upload')?.click()}
								>
									<Upload className="size-4 mr-2" />
									{logoPreview ? 'Alterar Logo' : 'Fazer Upload'}
								</Button>
								<FormDescription className="mt-2">
									Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
								</FormDescription>
					</div>
					</div>
				</div>

				{organizer && (
					<div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
						<Badge variant="outline" className={organizerStatusBadgeClass}>
							Status: {organizerStatusLabel}
						</Badge>

						{organizer.status === 'pending' && (
							<p className="text-sm text-muted-foreground">
								Aguarde a aprovação da nossa equipe para liberar todos os recursos de organizador.
							</p>
						)}
					</div>
				)}

				<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email de Contato *</FormLabel>
								<FormControl>
									<Input placeholder="contato@organizador.com" {...field} />
								</FormControl>
								<FormDescription>Email para contato sobre os eventos</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Telefone</FormLabel>
									<FormControl>
										<Input
											placeholder="(11) 99999-9999"
											{...field}
											value={field.value || ''}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="document"
							render={({ field }) => (
								<FormItem>
									<FormLabel>CPF ou CNPJ</FormLabel>
									<FormControl>
										<Input
											placeholder="000.000.000-00"
											{...field}
											value={field.value || ''}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="website"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Website</FormLabel>
								<FormControl>
									<Input
										placeholder="https://www.seusite.com"
										{...field}
										value={field.value || ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Descrição</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Descreva seu trabalho como organizador de eventos..."
										className="min-h-[120px]"
										{...field}
										value={field.value || ''}
									/>
								</FormControl>
								<FormDescription>
									Esta descrição será exibida nos eventos que você organizar
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex justify-end">
						<Button type="submit" disabled={isSubmitting} className="gap-2">
							{isSubmitting ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Salvando...
								</>
							) : (
								<>
									{organizer ? (
										<>
											<Save className="size-4" />
											Salvar Alterações
										</>
									) : (
										<>
											<Plus className="size-4" />
											Criar Perfil de Organizador
										</>
									)}
								</>
							)}
						</Button>
					</div>
				</form>
			</Form>

			{/* Stripe Payment Section */}
			{organizer && (
				<div className="mt-8 pt-8 border-t">
					<div className="mb-6">
						<h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
							<CreditCard className="size-5 text-primary" />
							Configuração de Pagamentos
						</h3>
						<p className="text-sm text-gray-600">
							Configure sua conta Stripe para receber pagamentos por eventos pagos
						</p>
					</div>

					<div className="space-y-6">
						<StripeStatusCard
							stripeAccountId={organizer.stripe_account_id || null}
							onboardingComplete={organizer.stripe_onboarding_complete || false}
							chargesEnabled={organizer.stripe_charges_enabled || false}
							payoutsEnabled={organizer.stripe_payouts_enabled || false}
						/>

						<StripeOnboardingButton
							organizerId={organizer.id}
							isComplete={organizer.stripe_onboarding_complete || false}
						/>
					</div>
				</div>
			)}
		</>
	);
}
