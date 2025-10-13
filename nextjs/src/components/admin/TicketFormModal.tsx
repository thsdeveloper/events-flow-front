'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Info } from 'lucide-react';
import { createItem, updateItem } from '@directus/sdk';
import * as z from 'zod';
import { useDirectusClient } from '@/hooks/useDirectusClient';
import { EventTicket } from '@/types/directus-schema';
import { useToast } from '@/hooks/use-toast';
import { calculateFees, formatCurrency, calculateConvenienceFeePercentage, type FeeConfig } from '@/lib/fees';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

// Zod schema para validação
const ticketFormSchema = z.object({
	// Basic fields
	title: z.string()
		.min(1, 'O título é obrigatório')
		.max(255, 'O título deve ter no máximo 255 caracteres'),

	description: z.string().optional(),

	quantity: z.coerce.number()
		.int('Deve ser um número inteiro')
		.min(1, 'Quantidade mínima é 1')
		.max(1000000, 'Quantidade muito alta'),

	// Pricing fields
	price: z.coerce.number()
		.min(0, 'O preço não pode ser negativo')
		.optional()
		.or(z.literal(0)),

	service_fee_type: z.enum(['absorbed', 'passed_to_buyer'], {
		required_error: 'Selecione como a taxa será cobrada',
	}),

	// Sale period
	sale_start_date: z.string().optional(),
	sale_end_date: z.string().optional(),

	// Purchase limits
	min_quantity_per_purchase: z.coerce.number()
		.int('Deve ser um número inteiro')
		.min(1, 'Mínimo de 1')
		.max(100, 'Máximo de 100'),

	max_quantity_per_purchase: z.coerce.number()
		.int('Deve ser um número inteiro')
		.min(1, 'Mínimo de 1')
		.max(100, 'Máximo de 100'),

	// Visibility
	visibility: z.enum(['public', 'invited_only', 'manual'], {
		required_error: 'Selecione a visibilidade',
	}),

	// Installment fields
	allow_installments: z.boolean().default(false),

	max_installments: z.coerce.number()
		.int('Deve ser um número inteiro')
		.min(2, 'Mínimo de 2 parcelas')
		.max(4, 'Máximo de 4 parcelas')
		.optional(),

	min_amount_for_installments: z.coerce.number()
		.min(0, 'Valor não pode ser negativo')
		.optional(),
}).refine((data) => {
	// Validação: max_quantity deve ser >= min_quantity
	return data.max_quantity_per_purchase >= data.min_quantity_per_purchase;
}, {
	message: 'Máximo deve ser maior ou igual ao mínimo',
	path: ['max_quantity_per_purchase'],
}).refine((data) => {
	// Validação: se allow_installments estiver ativo e houver min_amount, o price deve ser >= min_amount
	if (data.allow_installments && data.min_amount_for_installments && data.price) {
		return data.price >= data.min_amount_for_installments;
	}

	return true;
}, {
	message: 'O valor do ingresso deve ser maior ou igual ao valor mínimo para parcelamento',
	path: ['price'],
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface TicketFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	eventId: string | null;
	ticketType: 'paid' | 'free';
	editingTicket: EventTicket | null;
	onTicketSaved: () => void;
}

export default function TicketFormModal({
	isOpen,
	onClose,
	eventId,
	ticketType,
	editingTicket,
	onTicketSaved,
}: TicketFormModalProps) {
	const client = useDirectusClient();
	const { toast } = useToast();

	// Configuração de taxas
	const [feeConfig, setFeeConfig] = React.useState<FeeConfig>({
		platformFeePercentage: 5,
		stripePercentageFee: 4.35,
		stripeFixedFee: 0.5,
	});

	// React Hook Form
	const form = useForm<TicketFormValues>({
		resolver: zodResolver(ticketFormSchema),
		defaultValues: {
			title: '',
			description: '',
			quantity: 100,
			price: 0,
			service_fee_type: 'passed_to_buyer',
			sale_start_date: '',
			sale_end_date: '',
			min_quantity_per_purchase: 1,
			max_quantity_per_purchase: 10,
			visibility: 'public',
			allow_installments: false,
			max_installments: 4,
			min_amount_for_installments: undefined,
		},
	});

	// Buscar configuração de taxas do Directus
	useEffect(() => {
		const fetchConfig = async () => {
			if (!isOpen) return;

			try {
				const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;
				const response = await fetch(
					`${directusUrl}/items/event_configurations?limit=1&fields=platform_fee_percentage,stripe_percentage_fee,stripe_fixed_fee`,
					{
						cache: 'no-store',
						headers: {
							'Content-Type': 'application/json',
						},
					}
				);

				if (!response.ok) {
					throw new Error('Failed to fetch event configuration');
				}

				const { data } = await response.json();

				if (data) {
					const config = Array.isArray(data) ? data[0] : data;
					setFeeConfig({
						platformFeePercentage: Number(config.platform_fee_percentage || 5),
						stripePercentageFee: Number(config.stripe_percentage_fee || 4.35),
						stripeFixedFee: Number(config.stripe_fixed_fee || 0.5),
					});
				}
			} catch (error) {
				console.error('Erro ao buscar configuração de taxas:', error);
			}
		};

		fetchConfig();
	}, [isOpen]);

	// Carregar dados do ticket em edição
	useEffect(() => {
		if (editingTicket) {
			form.reset({
				title: editingTicket.title || '',
				description: editingTicket.description || '',
				quantity: editingTicket.quantity || 100,
				price: editingTicket.price || 0,
				service_fee_type: (editingTicket.service_fee_type as 'absorbed' | 'passed_to_buyer') || 'passed_to_buyer',
				sale_start_date: editingTicket.sale_start_date || '',
				sale_end_date: editingTicket.sale_end_date || '',
				min_quantity_per_purchase: editingTicket.min_quantity_per_purchase || 1,
				max_quantity_per_purchase: editingTicket.max_quantity_per_purchase || 10,
				visibility: (editingTicket.visibility as 'public' | 'invited_only' | 'manual') || 'public',
				allow_installments: editingTicket.allow_installments || false,
				max_installments: editingTicket.max_installments || 4,
				min_amount_for_installments: editingTicket.min_amount_for_installments || undefined,
			});
		}
	}, [editingTicket, form]);

	// Watch dos valores para cálculos
	const price = form.watch('price');
	const serviceFeeType = form.watch('service_fee_type');
	const allowInstallments = form.watch('allow_installments');
	const maxInstallments = form.watch('max_installments');

	// Calcular taxas
	const fees = ticketType === 'paid' && price
		? calculateFees(Number(price), serviceFeeType, feeConfig)
		: null;

	const convenienceFeePercentage = ticketType === 'paid' && price
		? calculateConvenienceFeePercentage(Number(price), feeConfig)
		: 0;

	// Submit handler
	const onSubmit = async (values: TicketFormValues) => {
		if (!client) {
			toast({
				title: 'Erro',
				description: 'Não autorizado',
				variant: 'destructive',
			});

			return;
		}

		if (!eventId) {
			toast({
				title: 'Erro',
				description: 'ID do evento não encontrado',
				variant: 'destructive',
			});

			return;
		}

		try {
			// Preparar dados do ticket com tipagem adequada
			const ticketData: Partial<EventTicket> = {
				event_id: eventId,
				title: values.title,
				description: values.description || null,
				quantity: values.quantity,
				price: ticketType === 'paid' ? Number(values.price) : 0,
				service_fee_type: ticketType === 'paid' ? values.service_fee_type : 'absorbed',
				sale_start_date: values.sale_start_date ? new Date(values.sale_start_date).toISOString() : null,
				sale_end_date: values.sale_end_date ? new Date(values.sale_end_date).toISOString() : null,
				min_quantity_per_purchase: values.min_quantity_per_purchase || null,
				max_quantity_per_purchase: values.max_quantity_per_purchase || null,
				visibility: values.visibility || null,
				status: 'active',
				allow_installments: ticketType === 'paid' ? values.allow_installments : false,
				max_installments: ticketType === 'paid' && values.allow_installments ? values.max_installments || null : null,
				min_amount_for_installments: ticketType === 'paid' && values.allow_installments && values.min_amount_for_installments
					? Number(values.min_amount_for_installments)
					: null,
			};

			if (editingTicket) {
				await client.request(
					updateItem('event_tickets', editingTicket.id, ticketData)
				);
			} else {
				await client.request(
					createItem('event_tickets', ticketData)
				);
			}

			toast({
				title: 'Sucesso',
				description: editingTicket
					? 'Ingresso atualizado com sucesso!'
					: 'Ingresso criado com sucesso!',
			});

			form.reset();
			onTicketSaved();
		} catch (error: any) {
			console.error('Error saving ticket:', error);
			toast({
				title: 'Erro',
				description: error.message || 'Erro ao salvar ingresso',
				variant: 'destructive',
			});
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						{editingTicket ? '✏️ Editar Ingresso' : '➕ Novo Ingresso'}
						{ticketType === 'free' && ' Gratuito'}
						{ticketType === 'paid' && ' Pago'}
					</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Form */}
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
						{/* Basic Info */}
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Título do Ingresso *</FormLabel>
										<FormControl>
											<Input
												placeholder="Ex: Ingresso Único, Meia-Entrada, VIP"
												{...field}
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
										<FormLabel>Descrição (opcional)</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Informações adicionais sobre este ingresso"
												rows={3}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="quantity"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Quantidade Disponível *</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Pricing (only for paid tickets) */}
						{ticketType === 'paid' && (
							<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									💰 Valores e Taxa de Serviço
								</h3>

								<FormField
									control={form.control}
									name="price"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Valor a Receber (R$) *</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													step="0.01"
													placeholder="100.00"
													{...field}
												/>
											</FormControl>
											<p className="text-xs text-muted-foreground">
												Valor que você receberá por ingresso (sem taxa de serviço)
											</p>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="service_fee_type"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Taxa de Conveniência</FormLabel>
											<div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
												<p className="text-sm text-blue-800 dark:text-blue-300">
													<Info className="inline size-4 mr-1" />
													<strong>Recomendação:</strong> No modelo "Comprador paga", o organizador recebe quase o valor total do ingresso.
												</p>
											</div>
											<FormControl>
												<RadioGroup
													value={field.value}
													onValueChange={field.onChange}
													className="space-y-3"
												>
													<label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
														field.value === 'passed_to_buyer'
															? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
															: 'border-gray-300 dark:border-gray-600'
													}`}>
														<RadioGroupItem value="passed_to_buyer" className="mt-1" />
														<div className="flex-1">
															<div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
																Comprador paga a taxa (recomendado)
																<span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
																	Padrão do mercado
																</span>
															</div>
															<div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
																Você recebe quase o valor total. A taxa de conveniência (~{convenienceFeePercentage.toFixed(2)}%) é cobrada do comprador
															</div>
															{fees && field.value === 'passed_to_buyer' && (
																<div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
																	<div className="space-y-2 text-sm">
																		<div className="flex justify-between">
																			<span className="text-gray-600 dark:text-gray-400">Ingresso:</span>
																			<span className="font-medium">{formatCurrency(fees.ticketPrice)}</span>
																		</div>
																		<div className="flex justify-between text-blue-600 dark:text-blue-400">
																			<span>Taxa de conveniência:</span>
																			<span className="font-medium">{formatCurrency(fees.convenienceFee)}</span>
																		</div>
																		<div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
																			<span className="font-semibold text-gray-900 dark:text-white">Comprador paga:</span>
																			<span className="font-bold text-lg">{formatCurrency(fees.buyerPrice)}</span>
																		</div>
																		<div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
																			<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
																				<span>Taxa Stripe ({feeConfig.stripePercentageFee}% + {formatCurrency(feeConfig.stripeFixedFee)}):</span>
																				<span>-{formatCurrency(fees.stripeFee)}</span>
																			</div>
																			<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
																				<span>Taxa Plataforma ({feeConfig.platformFeePercentage}%):</span>
																				<span>-{formatCurrency(fees.platformFee)}</span>
																			</div>
																		</div>
																		<div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
																			<span className="font-semibold text-green-600 dark:text-green-400">Você recebe:</span>
																			<span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(fees.organizerReceives)}</span>
																		</div>
																	</div>
																</div>
															)}
														</div>
													</label>

													<label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
														field.value === 'absorbed'
															? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
															: 'border-gray-300 dark:border-gray-600'
													}`}>
														<RadioGroupItem value="absorbed" className="mt-1" />
														<div className="flex-1">
															<div className="font-medium text-gray-900 dark:text-white">
																Organizador absorve as taxas
															</div>
															<div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
																Você absorve todas as taxas. O comprador paga apenas o valor do ingresso
															</div>
															{fees && field.value === 'absorbed' && (
																<div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
																	<div className="space-y-2 text-sm">
																		<div className="flex justify-between">
																			<span className="font-semibold text-gray-900 dark:text-white">Comprador paga:</span>
																			<span className="font-bold text-lg">{formatCurrency(fees.buyerPrice)}</span>
																		</div>
																		<div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
																			<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
																				<span>Taxa Stripe ({feeConfig.stripePercentageFee}% + {formatCurrency(feeConfig.stripeFixedFee)}):</span>
																				<span>-{formatCurrency(fees.stripeFee)}</span>
																			</div>
																			<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
																				<span>Taxa Plataforma ({feeConfig.platformFeePercentage}%):</span>
																				<span>-{formatCurrency(fees.platformFee)}</span>
																			</div>
																		</div>
																		<div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
																			<span className="font-semibold text-yellow-600 dark:text-yellow-400">Você recebe:</span>
																			<span className="font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(fees.organizerReceives)}</span>
																		</div>
																	</div>
																</div>
															)}
														</div>
													</label>
												</RadioGroup>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{/* Installment Options */}
						{ticketType === 'paid' && (
							<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									💳 Parcelamento via Pix
								</h3>

								<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
									<div className="flex items-start gap-3">
										<Info className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
										<div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
											<p className="font-medium">Como funciona o Pix Parcelado?</p>
											<p>O cliente paga a primeira parcela via Pix no ato da compra e as demais conforme vencimento mensal. Cada parcela é um pagamento Pix separado gerenciado pela plataforma.</p>
										</div>
									</div>
								</div>

								<FormField
									control={form.control}
									name="allow_installments"
									render={({ field }) => (
										<FormItem className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<div className="flex-1">
												<FormLabel className="font-medium text-gray-900 dark:text-white cursor-pointer">
													Permitir parcelamento via Pix para este ingresso
												</FormLabel>
												<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
													Cliente poderá pagar em parcelas mensais via Pix. A primeira parcela é obrigatória no ato da compra.
												</p>
											</div>
										</FormItem>
									)}
								/>

								{allowInstallments && (
									<div className="space-y-4 pl-7 border-l-2 border-blue-200 dark:border-blue-800">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField
												control={form.control}
												name="max_installments"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Máximo de Parcelas</FormLabel>
														<Select
															value={field.value?.toString()}
															onValueChange={(value) => field.onChange(Number(value))}
														>
															<FormControl>
																<SelectTrigger>
																	<SelectValue placeholder="Selecione" />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="2">2x</SelectItem>
																<SelectItem value="3">3x</SelectItem>
																<SelectItem value="4">4x (recomendado)</SelectItem>
															</SelectContent>
														</Select>
														<p className="text-xs text-muted-foreground">
															Número máximo de parcelas permitidas
														</p>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="min_amount_for_installments"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Valor Mínimo para Parcelar (R$)</FormLabel>
														<FormControl>
															<Input
																type="number"
																min={0}
																step="0.01"
																placeholder="Ex: 50.00"
																{...field}
															/>
														</FormControl>
														<p className="text-xs text-muted-foreground">
															Deixe vazio para permitir qualquer valor
														</p>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>

										{price && Number(price) > 0 && (
											<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
												<p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
													📊 Simulação de Parcelamento
												</p>
												<div className="space-y-1 text-sm text-green-700 dark:text-green-400">
													{[2, 3, 4].map((installments) => {
														const installmentValue = Number(price) / installments;

														return (
															<p key={installments}>
																<strong>{installments}x de {formatCurrency(installmentValue)}</strong>
															</p>
														);
													})}
												</div>
												<p className="text-xs text-green-600 dark:text-green-500 mt-2">
													* Valores para referência. Cliente escolhe quantas parcelas deseja (até {maxInstallments}x).
												</p>
											</div>
										)}

										<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
											<p className="text-xs text-yellow-800 dark:text-yellow-300">
												⚠️ <strong>Atenção:</strong> Cada parcela é um pagamento Pix separado. A primeira parcela deve ser paga no ato da compra. As demais terão vencimento mensal. Parcelas vencidas bloqueiam o check-in do participante.
											</p>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Sale Period */}
						<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								📅 Período de Vendas
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="sale_start_date"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Início das Vendas</FormLabel>
											<FormControl>
												<Input type="datetime-local" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="sale_end_date"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Fim das Vendas</FormLabel>
											<FormControl>
												<Input type="datetime-local" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Purchase Limits */}
						<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								🎯 Limites por Compra
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="min_quantity_per_purchase"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Mínimo por Compra</FormLabel>
											<FormControl>
												<Input type="number" min={1} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="max_quantity_per_purchase"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Máximo por Compra</FormLabel>
											<FormControl>
												<Input type="number" min={1} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Visibility */}
						<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								👁️ Visibilidade
							</h3>

							<FormField
								control={form.control}
								name="visibility"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<RadioGroup
												value={field.value}
												onValueChange={field.onChange}
												className="space-y-2"
											>
												<label className="flex items-center gap-2 cursor-pointer">
													<RadioGroupItem value="public" />
													<span className="text-sm text-gray-700 dark:text-gray-300">Público</span>
												</label>
												<label className="flex items-center gap-2 cursor-pointer">
													<RadioGroupItem value="invited_only" />
													<span className="text-sm text-gray-700 dark:text-gray-300">
														Restrito a Convidados
													</span>
												</label>
												<label className="flex items-center gap-2 cursor-pointer">
													<RadioGroupItem value="manual" />
													<span className="text-sm text-gray-700 dark:text-gray-300">
														Adicionar Manualmente
													</span>
												</label>
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</form>
				</Form>

				{/* Footer */}
				<div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
					<button
						type="button"
						onClick={onClose}
						className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						Cancelar
					</button>
					<button
						type="submit"
						onClick={form.handleSubmit(onSubmit)}
						disabled={form.formState.isSubmitting}
						className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{form.formState.isSubmitting ? 'Salvando...' : editingTicket ? 'Atualizar' : 'Criar Ingresso'}
					</button>
				</div>
			</div>
		</div>
	);
}
