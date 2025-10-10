'use client';

import { Sparkles } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { EventWizardFormValues } from '../types';

const STATUS_LABELS: Record<EventWizardFormValues['status'], string> = {
	draft: 'Rascunho',
	published: 'Publicado',
	cancelled: 'Cancelado',
	archived: 'Arquivado',
};

export function TicketsStep() {
	const form = useFormContext<EventWizardFormValues>();
	const isFree = form.watch('is_free');
	const maxAttendees = form.watch('max_attendees');

	return (
		<div className="space-y-8">
			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-xl font-semibold">Ingressos e publicação</h2>
						<p className="text-sm text-muted-foreground">
							Defina se o evento é gratuito ou pago, limite de vagas e como quer publicar.
						</p>
					</div>
					<Sparkles className="size-5 text-primary" />
				</div>

				<div className="mt-6 space-y-6">
					<div className="grid gap-3 rounded-lg bg-muted/60 p-4 md:grid-cols-2">
						<button
							type="button"
							onClick={() => form.setValue('is_free', true, { shouldDirty: true, shouldValidate: true })}
							className={cn(
								'rounded-lg border p-4 text-left transition-all',
								isFree ? 'border-primary bg-background shadow-sm' : 'border-border hover:border-primary/40',
							)}
						>
							<p className="text-sm font-medium">🎟️ Evento gratuito</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Os participantes garantem presença sem custo. Você pode solicitar inscrição prévia.
							</p>
						</button>

						<button
							type="button"
							onClick={() => form.setValue('is_free', false, { shouldDirty: true, shouldValidate: true })}
							className={cn(
								'rounded-lg border p-4 text-left transition-all',
								!isFree ? 'border-primary bg-background shadow-sm' : 'border-border hover:border-primary/40',
							)}
						>
							<p className="text-sm font-medium">💰 Evento pago</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Defina lotes de ingressos e preços após salvar. Mostraremos uma calculadora de receita.
							</p>
						</button>
					</div>

					<FormField
						control={form.control}
						name="max_attendees"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Limite de vagas</FormLabel>
								<FormControl>
									<Input
										type="number"
										min={1}
										placeholder="Ex: 150"
										value={field.value ?? ''}
										onChange={event => {
											const value = event.target.value;
											field.onChange(value ? Number(value) : null);
										}}
									/>
								</FormControl>
								<FormMessage />
								<p className="text-xs text-muted-foreground">
									{maxAttendees
										? `Os participantes verão "${maxAttendees} lugares disponíveis".`
										: 'Deixe vazio para vagas ilimitadas.'}
								</p>
							</FormItem>
						)}
					/>

					<div className="rounded-lg border border-dashed p-4">
						<h3 className="text-sm font-medium">Status inicial</h3>
						<p className="text-xs text-muted-foreground">
							Você pode salvar como rascunho para continuar depois ou publicar imediatamente.
						</p>

						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem className="mt-3 space-y-3">
									<FormControl>
										<RadioGroup
											value={field.value}
											onValueChange={value => field.onChange(value as EventWizardFormValues['status'])}
											className="grid gap-3 sm:grid-cols-2"
										>
											{(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(statusKey => (
												<label
													key={statusKey}
													className={cn(
														'flex items-center gap-3 rounded-lg border p-3 transition-colors',
														field.value === statusKey
															? 'border-primary bg-primary/10'
															: 'border-border hover:border-primary/40 hover:bg-muted',
													)}
												>
													<RadioGroupItem value={statusKey} />
													<div>
														<p className="text-sm font-medium">{STATUS_LABELS[statusKey]}</p>
														<p className="text-xs text-muted-foreground">
															{statusKey === 'draft' && 'Visível apenas para você.'}
															{statusKey === 'published' && 'Evento publicado imediatamente.'}
															{statusKey === 'cancelled' && 'Use apenas se precisar cancelar o evento.'}
															{statusKey === 'archived' && 'Mantém no histórico sem exibir publicamente.'}
														</p>
													</div>
												</label>
											))}
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid gap-4 rounded-lg border border-dashed p-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="featured"
							render={({ field }) => (
								<FormItem className="flex items-start justify-between gap-3 rounded-md border p-3">
									<div>
										<FormLabel>Destacar homepage</FormLabel>
										<p className="text-xs text-muted-foreground">
											Seu evento aparece em destaque para toda a audiência.
										</p>
									</div>
									<FormControl>
										<Switch checked={field.value} onCheckedChange={field.onChange} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="publish_after_create"
							render={({ field }) => (
								<FormItem className="flex items-start justify-between gap-3 rounded-md border p-3">
									<div>
										<FormLabel>Publicar automaticamente</FormLabel>
										<p className="text-xs text-muted-foreground">
											Quando concluído, o evento já ficará visível se o status estiver definido como publicado.
										</p>
									</div>
									<FormControl>
										<Switch checked={field.value} onCheckedChange={field.onChange} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
