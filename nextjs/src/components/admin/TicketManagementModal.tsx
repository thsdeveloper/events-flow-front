'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Ticket, Edit, Trash2 } from 'lucide-react';
import { EventTicket } from '@/types/directus-schema';
import TicketFormModal from './TicketFormModal';

interface TicketManagementModalProps {
	isOpen: boolean;
	onClose: () => void;
	eventId: string | null;
	onTicketsUpdate?: () => void;
}

export default function TicketManagementModal({
	isOpen,
	onClose,
	eventId,
	onTicketsUpdate,
}: TicketManagementModalProps) {
	const [tickets, setTickets] = useState<EventTicket[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showTicketForm, setShowTicketForm] = useState(false);
	const [ticketType, setTicketType] = useState<'paid' | 'free'>('paid');
	const [editingTicket, setEditingTicket] = useState<EventTicket | null>(null);

	useEffect(() => {
		if (isOpen && eventId) {
			fetchTickets();
		}
	}, [isOpen, eventId]);

	const fetchTickets = async () => {
		if (!eventId) return;

		try {
			// Use Next.js API route (cookies sent automatically)
			const response = await fetch(`/api/tickets?eventId=${eventId}`, {
				credentials: 'include',
			});
			const data = await response.json();
			if (response.ok && data.tickets) {
				setTickets(data.tickets);
			}
		} catch (error) {
			console.error('Error fetching tickets:', error);
		}
	};

	const handleCreateTicket = (type: 'paid' | 'free') => {
		setTicketType(type);
		setEditingTicket(null);
		setShowTicketForm(true);
	};

	const handleEditTicket = (ticket: EventTicket) => {
		setEditingTicket(ticket);
		setTicketType(ticket.price && ticket.price > 0 ? 'paid' : 'free');
		setShowTicketForm(true);
	};

	const handleDeleteTicket = async (ticketId: string) => {
		if (!confirm('Tem certeza que deseja excluir este ingresso?')) return;

		try {
			// Use Next.js API route (cookies sent automatically)
			const response = await fetch(`/api/tickets/${ticketId}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (response.ok) {
				fetchTickets();
				onTicketsUpdate?.();
			}
		} catch (error) {
			console.error('Error deleting ticket:', error);
		}
	};

	const handleTicketSaved = () => {
		setShowTicketForm(false);
		setEditingTicket(null);
		fetchTickets();
		onTicketsUpdate?.();
	};

	if (!isOpen) return null;

	if (showTicketForm) {
		return (
			<TicketFormModal
				isOpen={true}
				onClose={() => setShowTicketForm(false)}
				eventId={eventId}
				ticketType={ticketType}
				editingTicket={editingTicket}
				onTicketSaved={handleTicketSaved}
			/>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						🎫 Gerenciar Ingressos
					</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Ticket Type Selection */}
					{tickets.length === 0 && (
						<div className="text-center py-8">
							<p className="text-gray-600 dark:text-gray-400 mb-6">
								Que tipo de ingresso você deseja criar?
							</p>
							<div className="flex gap-4 justify-center">
								<button
									onClick={() => handleCreateTicket('paid')}
									className="flex items-center gap-2 px-6 py-3 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
								>
									<Plus className="size-5" />
									INGRESSO PAGO
								</button>
								<button
									onClick={() => handleCreateTicket('free')}
									className="flex items-center gap-2 px-6 py-3 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
								>
									<Plus className="size-5" />
									INGRESSO GRATUITO
								</button>
							</div>
						</div>
					)}

					{/* Tickets List */}
					{tickets.length > 0 && (
						<>
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									Ingressos Cadastrados ({tickets.length})
								</h3>
								<div className="flex gap-2">
									<button
										onClick={() => handleCreateTicket('paid')}
										className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm"
									>
										<Plus className="size-4" />
										Ingresso Pago
									</button>
									<button
										onClick={() => handleCreateTicket('free')}
										className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm"
									>
										<Plus className="size-4" />
										Ingresso Gratuito
									</button>
								</div>
							</div>

							<div className="space-y-3">
								{tickets.map((ticket) => (
									<div
										key={ticket.id}
										className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
									>
										<div className="flex items-center gap-4 flex-1">
											<Ticket className="size-5 text-blue-600 dark:text-blue-400" />
											<div className="flex-1">
												<h4 className="font-semibold text-gray-900 dark:text-white">
													{ticket.title}
												</h4>
												<div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
													<span>
														{ticket.price && ticket.price > 0
															? `R$ ${ticket.buyer_price?.toFixed(2) || '0,00'}`
															: 'Gratuito'}
													</span>
													<span>•</span>
													<span>
														{ticket.quantity_sold || 0} / {ticket.quantity} vendidos
													</span>
													<span>•</span>
													<span className="capitalize">
														{ticket.status === 'active' && '✅ Ativo'}
														{ticket.status === 'sold_out' && '⚠️ Esgotado'}
														{ticket.status === 'inactive' && '⛔ Inativo'}
													</span>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button
												onClick={() => handleEditTicket(ticket)}
												className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
												title="Editar"
											>
												<Edit className="size-4" />
											</button>
											<button
												onClick={() => handleDeleteTicket(ticket.id)}
												className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
												title="Excluir"
											>
												<Trash2 className="size-4" />
											</button>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
					<button
						onClick={onClose}
						className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						Fechar
					</button>
				</div>
			</div>
		</div>
	);
}
