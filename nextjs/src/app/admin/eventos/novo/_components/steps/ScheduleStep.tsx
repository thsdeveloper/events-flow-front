'use client';

import { CalendarIcon, Clock } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { differenceInHours, addHours } from 'date-fns';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { EventWizardFormValues } from '../types';

export function ScheduleStep() {
	const form = useFormContext<EventWizardFormValues>();
	const startValue = form.watch('start_date');
	const endValue = form.watch('end_date');

	const duration =
		startValue && endValue ? differenceInHours(new Date(endValue), new Date(startValue)) : undefined;

	const alignEndToSuggestion = (hours: number) => {
		if (!startValue) return;
		const targetDate = addHours(new Date(startValue), hours);
		form.setValue('end_date', targetDate.toISOString().slice(0, 16), { shouldDirty: true, shouldValidate: true });
	};

	return (
		<div className="space-y-8">
			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-xl font-semibold">Agenda e inscrições</h2>
						<p className="text-sm text-muted-foreground">
							Defina quando o evento acontece e quando as inscrições abrem e encerram. Fique atento à ordem lógica das
							datas.
						</p>
					</div>
					<CalendarIcon className="size-5 text-primary" />
				</div>

				<div className="mt-6 grid gap-6">
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="start_date"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Data e hora de início</FormLabel>
									<FormControl>
										<Input {...field} type="datetime-local" min={new Date().toISOString().slice(0, 16)} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="end_date"
							render={({ field }) => (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Data e hora de término</FormLabel>
										{startValue && (
											<div className="flex gap-2 text-xs">
												<button
													type="button"
													className="rounded-full border px-2 py-0.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
													onClick={() => alignEndToSuggestion(2)}
												>
													+2h
												</button>
												<button
													type="button"
													className="rounded-full border px-2 py-0.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
													onClick={() => alignEndToSuggestion(4)}
												>
													+4h
												</button>
												<button
													type="button"
													className="rounded-full border px-2 py-0.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
													onClick={() => alignEndToSuggestion(24)}
												>
													+1 dia
												</button>
											</div>
										)}
									</div>
									<FormControl>
										<Input {...field} type="datetime-local" min={startValue || undefined} />
									</FormControl>
									<FormMessage />
									{duration !== undefined && duration >= 0 && (
										<p className="text-xs text-muted-foreground">
											Duração estimada: {duration === 0 ? '< 1 hora' : `${duration} hora(s)`}
										</p>
									)}
								</FormItem>
							)}
						/>
					</div>

					<div className="rounded-lg border border-dashed p-4">
						<div className="flex items-center gap-2">
							<Clock className="size-4 text-primary" />
							<div>
								<p className="text-sm font-medium">Período de inscrições</p>
								<p className="text-xs text-muted-foreground">
									Defina quando o público já pode garantir presença ou deixe aberto até o início.
								</p>
							</div>
						</div>

						<div className="mt-4 grid gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="registration_start"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Início das inscrições</FormLabel>
										<FormControl>
											<Input {...field} type="datetime-local" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="registration_end"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Encerramento das inscrições</FormLabel>
										<FormControl>
											<Input {...field} type="datetime-local" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
							Se deixar em branco, as inscrições permanecem abertas até o início do evento.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
