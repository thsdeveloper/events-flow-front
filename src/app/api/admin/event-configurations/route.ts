import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { readItems, readSingleton } from '@directus/sdk';

export interface EventConfiguration {
  id: number;
  allow_free_events: boolean;
  max_tickets_per_event: number | null;
  ticket_code_prefix: string;
  registration_confirmation_email: boolean;
  platform_fee_percentage: number;
  stripe_percentage_fee: number;
  stripe_fixed_fee: number;
  convenience_fee_calculation_method: 'buyer_pays' | 'organizer_absorbs';
}

export async function GET() {
  try {
    const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;

    if (!adminToken) {
      throw new Error('DIRECTUS_ADMIN_TOKEN não configurado');
    }

    const client = getAuthenticatedClient(adminToken);

    // Tentar buscar como singleton primeiro, depois como collection
    let config = null;

    try {
      config = await client.request(
        readSingleton('event_configurations', {
          fields: [
            'id',
            'allow_free_events',
            'max_tickets_per_event',
            'ticket_code_prefix',
            'registration_confirmation_email',
            'platform_fee_percentage',
            'stripe_percentage_fee',
            'stripe_fixed_fee',
            'convenience_fee_calculation_method',
          ],
        })
      );
    } catch (singletonError) {
      // Se não for singleton, tentar buscar como collection
      const configs = await client.request(
        readItems('event_configurations', {
          limit: 1,
          fields: [
            'id',
            'allow_free_events',
            'max_tickets_per_event',
            'ticket_code_prefix',
            'registration_confirmation_email',
            'platform_fee_percentage',
            'stripe_percentage_fee',
            'stripe_fixed_fee',
            'convenience_fee_calculation_method',
          ],
        })
      );
      config = Array.isArray(configs) && configs.length > 0 ? configs[0] : null;
    }

    if (!config) {
      // Valores padrão se não houver configuração
      return NextResponse.json({
        id: 0,
        allow_free_events: true,
        max_tickets_per_event: null,
        ticket_code_prefix: 'TKT',
        registration_confirmation_email: true,
        platform_fee_percentage: 5,
        stripe_percentage_fee: 4.35,
        stripe_fixed_fee: 0.5,
        convenience_fee_calculation_method: 'buyer_pays',
      } as EventConfiguration);
    }

    return NextResponse.json({
      id: config.id,
      allow_free_events: config.allow_free_events,
      max_tickets_per_event: config.max_tickets_per_event,
      ticket_code_prefix: config.ticket_code_prefix,
      registration_confirmation_email: config.registration_confirmation_email,
      platform_fee_percentage: Number(config.platform_fee_percentage),
      stripe_percentage_fee: Number(config.stripe_percentage_fee),
      stripe_fixed_fee: Number(config.stripe_fixed_fee),
      convenience_fee_calculation_method: config.convenience_fee_calculation_method,
    } as EventConfiguration);
  } catch (error) {
    console.error('Error fetching event configurations:', error);

    // Retornar valores padrão em caso de erro
    return NextResponse.json({
      id: 0,
      allow_free_events: true,
      max_tickets_per_event: null,
      ticket_code_prefix: 'TKT',
      registration_confirmation_email: true,
      platform_fee_percentage: 5,
      stripe_percentage_fee: 4.35,
      stripe_fixed_fee: 0.5,
      convenience_fee_calculation_method: 'buyer_pays',
    } as EventConfiguration);
  }
}
