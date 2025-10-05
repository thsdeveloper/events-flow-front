'use client';

import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { createItem, updateItem } from '@directus/sdk';
import { useDirectusClient } from '@/hooks/useDirectusClient';
import { EventTicket } from '@/types/directus-schema';
import { useToast } from '@/hooks/use-toast';
import { calculateFees, formatCurrency, calculateConvenienceFeePercentage, type FeeConfig } from '@/lib/fees';

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
	const [isLoading, setIsLoading] = useState(false);
	const [feeConfig, setFeeConfig] = useState<FeeConfig>({
		platformFeePercentage: 5,
		stripePercentageFee: 4.35,
		stripeFixedFee: 0.5,
	});
	const [serviceFeeType, setServiceFeeType] = useState<'passed_to_buyer' | 'absorbed'>(
		'passed_to_buyer'
	);
	const [price, setPrice] = useState('');

	// Form fields
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [quantity, setQuantity] = useState('100');
	const [saleStartDate, setSaleStartDate] = useState('');
	const [saleEndDate, setSaleEndDate] = useState('');
	const [minQuantity, setMinQuantity] = useState('1');
	const [maxQuantity, setMaxQuantity] = useState('10');
	const [visibility, setVisibility] = useState<'public' | 'invited_only' | 'manual'>('public');

	// Buscar configuração de taxas diretamente do Directus
	useEffect(() => {
		const fetchConfig = async () => {
			if (!isOpen) return; // Only fetch when modal is open

			try {
				const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;

				// Fetch directly from Directus to avoid caching issues
				const response = await fetch(
					`${directusUrl}/items/event_configurations?limit=1&fields=platform_fee_percentage,stripe_percentage_fee,stripe_fixed_fee`,
					{
						cache: 'no-store', // Force fresh data
					}
				);

				if (!response.ok) {
					throw new Error('Failed to fetch event configuration');
				}

				const { data } = await response.json();

				if (data) {
					// Directus pode retornar array ou objeto direto dependendo da query
					const config = Array.isArray(data) ? data[0] : data;
					console.log('Fetched config:', config); // Debug log

					setFeeConfig({
						platformFeePercentage: Number(config.platform_fee_percentage || 5),
						stripePercentageFee: Number(config.stripe_percentage_fee || 4.35),
						stripeFixedFee: Number(config.stripe_fixed_fee || 0.5),
					});
				}
			} catch (error) {
				console.error('Erro ao buscar configuração de taxas:', error);
				// Keep default values on error
			}
		};

		fetchConfig();
	}, [isOpen]); // Re-fetch when modal opens

	// Load editing ticket data
	useEffect(() => {
		if (editingTicket) {
			setTitle(editingTicket.title || '');
			setDescription(editingTicket.description || '');
			setQuantity(String(editingTicket.quantity || 100));
			setPrice(String(editingTicket.price || ''));
			setServiceFeeType(editingTicket.service_fee_type as any || 'passed_to_buyer');
			setSaleStartDate(editingTicket.sale_start_date || '');
			setSaleEndDate(editingTicket.sale_end_date || '');
			setMinQuantity(String(editingTicket.min_quantity_per_purchase || 1));
			setMaxQuantity(String(editingTicket.max_quantity_per_purchase || 10));
			setVisibility(editingTicket.visibility as any || 'public');
		}
	}, [editingTicket]);

	// Calcular taxas usando a nova função
	const fees = ticketType === 'paid' && price
		? calculateFees(parseFloat(price), serviceFeeType, feeConfig)
		: null;

	const convenienceFeePercentage = ticketType === 'paid' && price
		? calculateConvenienceFeePercentage(parseFloat(price), feeConfig)
		: 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!client) {
			toast({
				title: 'Erro',
				description: 'Não autorizado',
				variant: 'destructive',
			});
			
return;
		}

		setIsLoading(true);

		try {
			// Validate eventId first
			if (!eventId) {
				toast({
					title: 'Erro',
					description: 'ID do evento não encontrado',
					variant: 'destructive',
				});
				setIsLoading(false);
				
return;
			}

			// Validate required fields
			if (!title.trim()) {
				toast({
					title: 'Erro',
					description: 'O título é obrigatório',
					variant: 'destructive',
				});
				setIsLoading(false);
				
return;
			}

			if (ticketType === 'paid' && (!price || parseFloat(price) <= 0)) {
				toast({
					title: 'Erro',
					description: 'O preço é obrigatório para ingressos pagos',
					variant: 'destructive',
				});
				setIsLoading(false);
				
return;
			}

			const ticketData: any = {
				event_id: eventId,
				title,
				description: description || null,
				quantity: parseInt(quantity),
				price: ticketType === 'paid' ? parseFloat(price) : 0,
				service_fee_type: ticketType === 'paid' ? serviceFeeType : 'absorbed',
				sale_start_date: saleStartDate ? new Date(saleStartDate).toISOString() : null,
				sale_end_date: saleEndDate ? new Date(saleEndDate).toISOString() : null,
				min_quantity_per_purchase: parseInt(minQuantity),
				max_quantity_per_purchase: parseInt(maxQuantity),
				visibility,
				status: 'active',
			};

			console.log('Sending ticket data:', ticketData);

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

			onTicketSaved();
		} catch (error: any) {
			console.error('Error saving ticket:', error);
			toast({
				title: 'Erro',
				description: error.message || 'Erro ao salvar ingresso',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
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
				<form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Basic Info */}
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Título do Ingresso *
							</label>
							<input
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="Ex: Ingresso Único, Meia-Entrada, VIP"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Descrição (opcional)
							</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="Informações adicionais sobre este ingresso"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Quantidade Disponível *
							</label>
							<input
								type="number"
								value={quantity}
								onChange={(e) => setQuantity(e.target.value)}
								required
								min="1"
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>

					{/* Pricing (only for paid tickets) */}
					{ticketType === 'paid' && (
						<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								💰 Valores e Taxa de Serviço
							</h3>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Valor a Receber (R$) *
								</label>
								<input
									type="number"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									required
									min="0"
									step="0.01"
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="100.00"
								/>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Valor que você receberá por ingresso (sem taxa de serviço)
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
									Taxa de Conveniência
								</label>
								<div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-blue-800 dark:text-blue-300">
										<Info className="inline size-4 mr-1" />
										<strong>Recomendação:</strong> No modelo "Comprador paga", o organizador recebe quase o valor total do ingresso.
									</p>
								</div>
								<div className="space-y-3">
									<label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
										serviceFeeType === 'passed_to_buyer'
											? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
											: 'border-gray-300 dark:border-gray-600'
									}`}>
										<input
											type="radio"
											value="passed_to_buyer"
											checked={serviceFeeType === 'passed_to_buyer'}
											onChange={(e) => setServiceFeeType(e.target.value as any)}
											className="mt-1"
										/>
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
											{fees && serviceFeeType === 'passed_to_buyer' && (
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
										serviceFeeType === 'absorbed'
											? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
											: 'border-gray-300 dark:border-gray-600'
									}`}>
										<input
											type="radio"
											value="absorbed"
											checked={serviceFeeType === 'absorbed'}
											onChange={(e) => setServiceFeeType(e.target.value as any)}
											className="mt-1"
										/>
										<div className="flex-1">
											<div className="font-medium text-gray-900 dark:text-white">
												Organizador absorve as taxas
											</div>
											<div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
												Você absorve todas as taxas. O comprador paga apenas o valor do ingresso
											</div>
											{fees && serviceFeeType === 'absorbed' && (
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
								</div>
							</div>
						</div>
					)}

					{/* Sale Period */}
					<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							📅 Período de Vendas
						</h3>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Início das Vendas
								</label>
								<input
									type="datetime-local"
									value={saleStartDate}
									onChange={(e) => setSaleStartDate(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Fim das Vendas
								</label>
								<input
									type="datetime-local"
									value={saleEndDate}
									onChange={(e) => setSaleEndDate(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					{/* Purchase Limits */}
					<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							🎯 Limites por Compra
						</h3>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Mínimo por Compra
								</label>
								<input
									type="number"
									value={minQuantity}
									onChange={(e) => setMinQuantity(e.target.value)}
									min="1"
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Máximo por Compra
								</label>
								<input
									type="number"
									value={maxQuantity}
									onChange={(e) => setMaxQuantity(e.target.value)}
									min="1"
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					{/* Visibility */}
					<div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							👁️ Visibilidade
						</h3>

						<div className="space-y-2">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									value="public"
									checked={visibility === 'public'}
									onChange={(e) => setVisibility(e.target.value as any)}
									className="text-blue-500"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300">Público</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									value="invited_only"
									checked={visibility === 'invited_only'}
									onChange={(e) => setVisibility(e.target.value as any)}
									className="text-blue-500"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300">
									Restrito a Convidados
								</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									value="manual"
									checked={visibility === 'manual'}
									onChange={(e) => setVisibility(e.target.value as any)}
									className="text-blue-500"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300">
									Adicionar Manualmente
								</span>
							</label>
						</div>
					</div>
				</form>

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
						onClick={handleSubmit}
						disabled={isLoading}
						className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? 'Salvando...' : editingTicket ? 'Atualizar' : 'Criar Ingresso'}
					</button>
				</div>
			</div>
		</div>
	);
}
