'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Organizer } from '@/types/directus-schema';
import { Loader2, Save, Upload, Plus, Building2, Info } from 'lucide-react';

const organizerProfileSchema = z.object({
	email: z.string().email('Email inválido'),
	phone: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	website: z.string().url('URL inválida').optional().or(z.literal('')).nullable(),
	document: z.string().optional().nullable(),
	status: z.enum(['active', 'pending', 'archived']).optional(),
});

type OrganizerProfileFormValues = z.infer<typeof organizerProfileSchema>;

interface OrganizerProfileFormProps {
	userId: string;
}

export function OrganizerProfileForm({ userId }: OrganizerProfileFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [organizer, setOrganizer] = useState<Organizer | null>(null);
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const { toast } = useToast();

	const form = useForm<OrganizerProfileFormValues>({
		resolver: zodResolver(organizerProfileSchema),
		defaultValues: {
			email: '',
			phone: '',
			description: '',
			website: '',
			document: '',
			status: 'active',
		},
	});

	useEffect(() => {
		loadOrganizer();
	}, [userId]);

	const loadOrganizer = async () => {
		try {
			setIsLoading(true);

			// Use Next.js API route (cookies sent automatically)
			const response = await fetch(`/api/organizer?userId=${userId}`, {
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Erro ao carregar organizador');
			}

			const data = await response.json();

			if (data.organizer) {
				const org = data.organizer;
				setOrganizer(org);
				form.reset({
					email: org.email || '',
					phone: org.phone || '',
					description: org.description || '',
					website: org.website || '',
					document: org.document || '',
					status: org.status || 'active',
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
		setIsSubmitting(true);

		try {
			let logoId: string | undefined;

			// Upload logo if a new file was selected
			if (logoFile) {
				const formData = new FormData();
				formData.append('file', logoFile);

				// Use Next.js API route (cookies sent automatically)
				const uploadResponse = await fetch('/api/user/profile', {
					method: 'POST',
					credentials: 'include',
					body: formData,
				});

				if (!uploadResponse.ok) {
					throw new Error('Erro ao fazer upload do logo');
				}

				const uploadData = await uploadResponse.json();
				logoId = uploadData.file.id;
			}

			const organizerData = {
				email: values.email,
				phone: values.phone || null,
				description: values.description || null,
				website: values.website || null,
				document: values.document || null,
				status: values.status || 'active',
				...(logoId && { logo: logoId }),
			};

			if (organizer) {
				// Update existing organizer
				const response = await fetch('/api/organizer', {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					credentials: 'include',
					body: JSON.stringify({
						id: organizer.id,
						...organizerData,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Erro ao atualizar organizador');
				}

				toast({
					title: 'Perfil de organizador atualizado',
					description: 'Suas informações foram atualizadas com sucesso.',
				});
			} else {
				// Create new organizer
				const response = await fetch('/api/organizer', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					credentials: 'include',
					body: JSON.stringify({
						...organizerData,
						user_id: userId,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Erro ao criar organizador');
				}

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

					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Status</FormLabel>
								<Select onValueChange={field.onChange} value={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Selecione o status" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="active">Ativo</SelectItem>
										<SelectItem value="pending">Pendente</SelectItem>
										<SelectItem value="archived">Arquivado</SelectItem>
									</SelectContent>
								</Select>
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
		</>
	);
}
