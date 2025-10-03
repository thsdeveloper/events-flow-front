'use client';

import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { createItem, updateItem } from '@directus/sdk';
import { useDirectusClient } from '@/hooks/useDirectusClient';
import { EventTicket } from '@/types/directus-schema';
import { useToast } from '@/hooks/use-toast';

interface TicketFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	eventId: string | null;
	ticketType: 'paid' | 'free';
	editingTicket: EventTicket | null;
	onTicketSaved: () => void;
}

interface EventConfiguration {
	service_fee_percentage: number;
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
	const [serviceFeePercentage, setServiceFeePercentage] = useState(10);
	const [serviceFeeType, setServiceFeeType] = useState<'passed_to_buyer' | 'absorbed'>(
		'passed_to_buyer'
	);
	const [price, setPrice] = useState('');
	const [buyerPrice, setBuyerPrice] = useState(0);

	// Form fields
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [quantity, setQuantity] = useState('100');
	const [saleStartDate, setSaleStartDate] = useState('');
	const [saleEndDate, setSaleEndDate] = useState('');
	const [minQuantity, setMinQuantity] = useState('1');
	const [maxQuantity, setMaxQuantity] = useState('10');
	const [visibility, setVisibility] = useState<'public' | 'invited_only' | 'manual'>('public');

	// Service fee is set to default 10% - can be made configurable later if needed

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

	// Calculate buyer price
	useEffect(() => {
		if (ticketType === 'paid' && price) {
			const priceNum = parseFloat(price);
			if (serviceFeeType === 'passed_to_buyer') {
				const calculated = priceNum + priceNum * (serviceFeePercentage / 100);
				setBuyerPrice(calculated);
			} else {
				setBuyerPrice(priceNum);
			}
		} else {
			setBuyerPrice(0);
		}
	}, [price, serviceFeeType, serviceFeePercentage, ticketType]);

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
									Taxa de Serviço ({serviceFeePercentage}%)
								</label>
								<div className="space-y-3">
									<label className="flex items-start gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
										<input
											type="radio"
											value="passed_to_buyer"
											checked={serviceFeeType === 'passed_to_buyer'}
											onChange={(e) => setServiceFeeType(e.target.value as any)}
											className="mt-1"
										/>
										<div className="flex-1">
											<div className="font-medium text-gray-900 dark:text-white">
												Repassar ao Comprador
											</div>
											<div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
												A taxa de serviço é exibida junto com o valor do ingresso e não será
												mostrada ao comprador
											</div>
											{price && serviceFeeType === 'passed_to_buyer' && (
												<div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
													<div className="text-gray-700 dark:text-gray-300">
														Comprador paga: <strong>R$ {buyerPrice.toFixed(2)}</strong>
													</div>
													<div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
														Você recebe: R$ {parseFloat(price).toFixed(2)}
													</div>
												</div>
											)}
										</div>
									</label>

									<label className="flex items-start gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
										<input
											type="radio"
											value="absorbed"
											checked={serviceFeeType === 'absorbed'}
											onChange={(e) => setServiceFeeType(e.target.value as any)}
											className="mt-1"
										/>
										<div className="flex-1">
											<div className="font-medium text-gray-900 dark:text-white">
												Absorver a Taxa
											</div>
											<div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
												Você absorve a taxa de serviço. O comprador paga apenas o valor do
												ingresso
											</div>
											{price && serviceFeeType === 'absorbed' && (
												<div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
													<div className="text-gray-700 dark:text-gray-300">
														Comprador paga: <strong>R$ {parseFloat(price).toFixed(2)}</strong>
													</div>
													<div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
														Você recebe: R${' '}
														{(
															parseFloat(price) -
															parseFloat(price) * (serviceFeePercentage / 100)
														).toFixed(2)}{' '}
														(taxa deduzida)
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
