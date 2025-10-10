'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Sparkles, Check } from 'lucide-react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { EventCategory } from '@/types/directus-schema';
import type { EventWizardFormValues } from '../types';

interface BasicInfoStepProps {
	categories: EventCategory[];
}

const MAX_TITLE_LENGTH = 100;
const MAX_SHORT_DESCRIPTION_LENGTH = 160;

export function BasicInfoStep({ categories }: BasicInfoStepProps) {
	const form = useFormContext<EventWizardFormValues>();
	const selectedCategory = form.watch('category_id');

	const categoryCards = useMemo(() => {
		return categories.map(category => ({
			id: String(category.id),
			name: category.name,
			icon: category.icon,
			description: category.description,
		}));
	}, [categories]);

	return (
		<div className="space-y-8">
			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<div className="flex items-start justify-between">
					<div>
						<h2 className="text-xl font-semibold">Comece com o essencial</h2>
						<p className="text-sm text-muted-foreground">
							Um nome claro e uma categoria adequada ajudam seu evento a ser encontrado com mais facilidade.
						</p>
					</div>
					<Sparkles className="size-5 text-primary" />
				</div>

				<div className="mt-6 grid gap-6">
					<FormField
						control={form.control}
						name="title"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center justify-between gap-4">
									<FormLabel>Nome do evento</FormLabel>
									<span className="text-xs text-muted-foreground">
										{field.value?.length ?? 0}/{MAX_TITLE_LENGTH}
									</span>
								</div>
								<FormControl>
									<Input {...field} placeholder="Ex: Imersão em Product Design 2025" />
								</FormControl>
								<FormMessage />
								<p className="text-xs text-muted-foreground">
									Dica: combine tema + público + formato. Ex: &quot;Workshop Intensivo de UX Writing&quot;.
								</p>
							</FormItem>
						)}
					/>

					<div>
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium">Categoria principal</h3>
							<span className="text-xs text-muted-foreground">Escolha uma categoria para organizar o catálogo</span>
						</div>
						<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{categoryCards.length === 0 ? (
								<div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
									Nenhuma categoria disponível. Cadastre categorias antes de criar eventos.
								</div>
							) : (
								categoryCards.map(category => {
									const isActive = selectedCategory === category.id;

									return (
										<button
											key={category.id}
											type="button"
											onClick={() => form.setValue('category_id', category.id, { shouldValidate: true, shouldTouch: true })}
											className={cn(
												'flex h-full flex-col gap-2 rounded-lg border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2',
												isActive
													? 'border-primary bg-primary/15 shadow-sm ring-2 ring-primary/40'
													: 'border-border hover:border-primary/40 hover:bg-muted',
											)}
											aria-pressed={isActive}
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-center gap-2">
												<span className="text-lg">{category.icon ?? '🎉'}</span>
												<span className="font-medium">{category.name}</span>
											</div>
												{isActive && <Check className="size-4 text-primary" />}
											</div>
											<p className="text-xs text-muted-foreground line-clamp-2">
												{category.description ?? 'Eventos relacionados a este segmento.'}
											</p>
										</button>
									);
								})
							)}
						</div>
						{form.formState.errors.category_id?.message && (
							<p className="mt-2 text-sm font-medium text-destructive">
								{form.formState.errors.category_id.message}
							</p>
						)}
					</div>

					<FormField
						control={form.control}
						name="short_description"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center justify-between gap-4">
									<FormLabel>Descrição curta</FormLabel>
									<span className="text-xs text-muted-foreground">
										{field.value?.length ?? 0}/{MAX_SHORT_DESCRIPTION_LENGTH}
									</span>
								</div>
								<FormControl>
									<Textarea
										{...field}
										rows={3}
										placeholder="Este texto aparece nos cards e compartilhamentos. Responda: o que é, para quem é e qual o principal benefício?"
									/>
								</FormControl>
								<FormMessage />
								<div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
									<p className="font-medium">Pré-visualização SEO</p>
									<p className="mt-1 line-clamp-2 text-muted-foreground">{field.value || 'Seu resumo aparecerá aqui.'}</p>
								</div>
							</FormItem>
						)}
					/>
				</div>
			</div>
		</div>
	);
}
