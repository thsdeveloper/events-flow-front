import { directus } from '@/lib/directus/directus';
import { readItems, readItem, updateItem, aggregate } from '@directus/sdk';
import type { ParticipantFilters } from './types';

/**
 * Busca ID do organizador pelo user_id
 */
export async function getOrganizerByUserId(userId: string, client = directus) {
  try {
    const organizers = await client.request(
      readItems('organizers', {
        filter: {
          user_id: { _eq: userId },
        },
        limit: 1,
        fields: ['id', 'name'],
      })
    );

    return organizers[0] || null;
  } catch (error) {
    console.error('Error fetching organizer:', error);

    return null;
  }
}

/**
 * Constrói filtro Directus baseado nos filtros da UI
 */
export function buildDirectusFilter(organizerId: string, filters: ParticipantFilters) {
  const baseFilter: any = {
    event_id: {
      organizer_id: { _eq: organizerId },
    },
  };

  // Busca
  if (filters.search) {
    baseFilter._or = [
      { participant_name: { _icontains: filters.search } },
      { participant_email: { _icontains: filters.search } },
      { participant_phone: { _icontains: filters.search } },
      { participant_document: { _icontains: filters.search } },
      { ticket_code: { _icontains: filters.search } },
    ];
  }

  // Filtro de eventos
  if (filters.eventIds.length > 0) {
    baseFilter.event_id.id = { _in: filters.eventIds };
  }

  // Filtro de tipos de ingresso
  if (filters.ticketTypeIds.length > 0) {
    baseFilter.ticket_type_id = { _in: filters.ticketTypeIds };
  }

  // Filtro de status de inscrição
  if (filters.registrationStatus.length > 0) {
    baseFilter.status = { _in: filters.registrationStatus };
  }

  // Filtro de status de pagamento
  if (filters.paymentStatus.length > 0) {
    baseFilter.payment_status = { _in: filters.paymentStatus };
  }

  // Filtro de check-in
  if (filters.hasCheckedIn === true) {
    baseFilter.check_in_date = { _nnull: true };
  } else if (filters.hasCheckedIn === false) {
    baseFilter.check_in_date = { _null: true };
  }

  // Filtro de data de check-in
  if (filters.checkInDateRange.start && filters.checkInDateRange.end) {
    baseFilter.check_in_date = {
      _between: [filters.checkInDateRange.start, filters.checkInDateRange.end],
    };
  }

  return baseFilter;
}

/**
 * Busca participantes com paginação e filtros
 */
export async function fetchParticipants(
  organizerId: string,
  page: number = 1,
  limit: number = 25,
  filters: ParticipantFilters,
  sortField: string = 'date_created',
  sortDirection: 'asc' | 'desc' = 'desc',
  client = directus
) {
  const offset = (page - 1) * limit;
  const filter = buildDirectusFilter(organizerId, filters);

  try {
    const [data, totalResult] = await Promise.all([
      client.request(
        readItems('event_registrations', {
          filter,
          limit,
          offset,
          sort: (sortDirection === 'desc' ? `-${sortField}` : sortField) as any,
          fields: [
            'id',
            'ticket_code',
            'participant_name',
            'participant_email',
            'participant_phone',
            'participant_document',
            'status',
            'payment_status',
            'check_in_date',
            'quantity',
            'unit_price',
            'service_fee',
            'total_amount',
            'payment_method',
            'date_created',
            'date_updated',
            'notes',
            {
              event_id: [
                'id',
                'title',
                'slug',
                'start_date',
                'location_name',
                { organizer_id: ['id'] },
              ],
            },
            {
              ticket_type_id: ['id', 'title', 'price'],
            },
            {
              user_id: ['id', 'first_name', 'last_name', 'email', 'avatar'],
            },
          ],
        })
      ),
      client.request(
        aggregate('event_registrations', {
          filter,
          aggregate: { count: 'id' },
        })
      ),
    ]);

    return {
      data,
      total: (totalResult as any)[0]?.count?.id || 0,
    };
  } catch (error) {
    console.error('Error fetching participants:', error);

    throw error;
  }
}

/**
 * Calcula métricas dos participantes
 */
export async function fetchParticipantMetrics(organizerId: string, filters: ParticipantFilters, client = directus) {
  const filter = buildDirectusFilter(organizerId, filters);

  // Debug: Log do filtro aplicado
  console.log('[fetchParticipantMetrics] Filtro aplicado:', JSON.stringify(filter, null, 2));
  console.log('[fetchParticipantMetrics] Filtros recebidos:', JSON.stringify(filters, null, 2));

  try {
    const [allParticipants, checkedInParticipants] = await Promise.all([
      client.request(
        aggregate('event_registrations', {
          filter,
          aggregate: { count: 'id' },
        })
      ),
      client.request(
        aggregate('event_registrations', {
          filter: {
            ...filter,
            check_in_date: { _nnull: true },
          },
          aggregate: { count: 'id' },
        })
      ),
    ]);

    const total = (allParticipants as any)[0]?.count?.id || 0;
    const checkedIn = (checkedInParticipants as any)[0]?.count?.id || 0;
    const pending = total - checkedIn;
    const checkInRate = total > 0 ? (checkedIn / total) * 100 : 0;

    return {
      total,
      checkedIn,
      pending,
      checkInRate: Math.round(checkInRate * 10) / 10, // 1 casa decimal
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);

    return {
      total: 0,
      checkedIn: 0,
      pending: 0,
      checkInRate: 0,
    };
  }
}

/**
 * Busca participante por ID
 */
export async function fetchParticipantById(id: string, organizerId: string, client = directus) {
  try {
    const participant = await client.request(
      readItem('event_registrations', id, {
        fields: [
          '*',
          {
            event_id: [
              'id',
              'title',
              'slug',
              'start_date',
              'end_date',
              'location_name',
              'location_address',
              { organizer_id: ['id'] },
            ],
          },
          {
            ticket_type_id: ['id', 'title', 'price', 'description'],
          },
          {
            user_id: ['id', 'first_name', 'last_name', 'email', 'avatar'],
          },
        ],
      })
    );

    // Verificar se o participante pertence ao organizador
    if ((participant as any)?.event_id?.organizer_id?.id !== organizerId) {
      return null;
    }

    return participant;
  } catch (error) {
    console.error('Error fetching participant:', error);

    return null;
  }
}

/**
 * Realiza check-in do participante
 */
export async function performCheckIn(id: string, organizerId: string, client = directus) {
  // Primeiro verificar se pertence ao organizador
  const participant = await fetchParticipantById(id, organizerId, client);

  if (!participant) {
    throw new Error('Participante não encontrado ou não autorizado');
  }

  if (participant.status === 'cancelled') {
    throw new Error('Não é possível fazer check-in de inscrição cancelada');
  }

  // Validar se já tem check-in
  if (participant.check_in_date) {
    throw new Error('Check-in já foi realizado para este participante');
  }

  try {
    const updated = await client.request(
      updateItem('event_registrations', id, {
        check_in_date: new Date().toISOString(),
        status: 'checked_in',
      })
    );

    return updated;
  } catch (error) {
    console.error('Error performing check-in:', error);

    throw error;
  }
}

/**
 * Desfaz check-in do participante
 */
export async function undoCheckIn(id: string, organizerId: string, client = directus) {
  // Primeiro verificar se pertence ao organizador
  const participant = await fetchParticipantById(id, organizerId, client);

  if (!participant) {
    throw new Error('Participante não encontrado ou não autorizado');
  }

  try {
    const updated = await client.request(
      updateItem('event_registrations', id, {
        check_in_date: null,
        status: 'confirmed',
      })
    );

    return updated;
  } catch (error) {
    console.error('Error undoing check-in:', error);

    throw error;
  }
}
