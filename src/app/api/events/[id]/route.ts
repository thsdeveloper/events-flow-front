import { NextRequest } from 'next/server';
import { deleteItem, readItem } from '@directus/sdk';
import { withApi } from '@/lib/api';
import { fromDirectusError } from '@/lib/errors';
import { getAuthenticatedClient } from '@/lib/directus/directus';

/**
 * DELETE /api/events/[id]
 * Deleta um evento no Directus
 * Valida se o evento possui participantes antes de excluir
 */
export const DELETE = withApi(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	const { id } = await params;
	const requestId = request.headers.get('x-request-id');

	try {
		// Pega o token de autenticação do cookie
		const token = request.cookies.get('access_token')?.value;

		if (!token) {
			return Response.json(
				{
					type: 'https://problems.directus.app/unauthorized',
					title: 'Não autenticado',
					status: 401,
					detail: 'Você precisa estar autenticado para excluir eventos.',
					instance: requestId,
				},
				{ status: 401 }
			);
		}

		// Cria cliente Directus com token do usuário
		const client = getAuthenticatedClient(token);

		// Busca o evento com os registros de participantes
		const event = await client.request(
			readItem('events', id, {
				fields: ['id', 'title', { registrations: ['id'] }],
			})
		);

		// Verifica se há participantes registrados
		const registrationsCount = Array.isArray(event.registrations) ? event.registrations.length : 0;

		if (registrationsCount > 0) {
			return Response.json(
				{
					type: 'https://problems.eventplatform.app/event-has-participants',
					title: 'Evento possui participantes',
					status: 400,
					detail: `Não é possível excluir o evento "${event.title}" pois há ${registrationsCount} participante(s) registrado(s). Cancele as inscrições antes de excluir o evento.`,
					instance: requestId,
					participantsCount: registrationsCount,
				},
				{ status: 400 }
			);
		}

		// Deleta o evento se não houver participantes
		await client.request(deleteItem('events', id));

		return Response.json(
			{
				success: true,
				message: 'Evento excluído com sucesso',
			},
			{ status: 200 }
		);
	} catch (error) {
		throw fromDirectusError(error, requestId);
	}
});
