import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe, formatAmountForStripe } from '@/lib/stripe/server';
import { createDirectus, rest, staticToken, readItems, createItem, updateItem, readItem } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';
import { calculateFees, type FeeConfig } from '@/lib/fees';
import { getServerAuth, getAuthenticatedServerClient } from '@/lib/auth/server-auth';
import { withApi, validateBody } from '@/lib/api';
import { AppError, createUnauthorizedError, createNotFoundError } from '@/lib/errors';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

const checkoutSessionSchema = z.object({
  eventId: z.string().uuid(),
  tickets: z.array(z.object({
    ticketId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1),
  participantInfo: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    document: z.string().optional(),
  }),
});

export const POST = withApi(async (request: NextRequest) => {
  // 1. Verificar autenticação PRIMEIRO
  const auth = await getServerAuth();

  if (!auth) {
    throw createUnauthorizedError('Você precisa estar logado para realizar uma compra.');
  }

  console.log(`[Checkout] Usuário autenticado: ${auth.user.email} (ID: ${auth.user.id})`);

  const body = await validateBody(request, checkoutSessionSchema);

  // 2. Usar cliente autenticado com o token do usuário
  const directus = await getAuthenticatedServerClient();

  // Buscar dados do evento com relacionamentos
  const events = await directus.request(
    readItems('events', {
      filter: { id: { _eq: body.eventId } },
      fields: [
        'id',
        'title',
        'slug',
        'organizer_id',
        {
          organizer_id: [
            'id',
            'stripe_account_id',
            'stripe_charges_enabled',
            'stripe_onboarding_complete',
          ],
        },
        {
          tickets: [
            'id',
            'title',
            'price',
            'quantity',
            'quantity_sold',
            'service_fee_type',
            'status',
            'max_quantity_per_purchase',
          ],
        },
      ],
    })
  );

  const event = events[0];
  if (!event) {
    throw createNotFoundError('Evento');
  }

  // Buscar organizador com admin token para acessar campos stripe_*
  // (usuários comuns não têm permissão para ler esses campos sensíveis)
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;
  if (!adminToken) {
    throw new AppError({
      message: 'DIRECTUS_ADMIN_TOKEN não configurado',
      status: 500,
      code: 'INTERNAL_ERROR',
    });
  }

  const adminClient = createDirectus<Schema>(directusUrl)
    .with(rest())
    .with(staticToken(adminToken));

  const organizerId = typeof event.organizer_id === 'string'
    ? event.organizer_id
    : event.organizer_id?.id;

  if (!organizerId) {
    throw new AppError({
      message: 'Evento sem organizador configurado.',
      status: 400,
      code: 'INVALID_EVENT',
    });
  }

  const organizer = await adminClient.request(
    readItem('organizers', organizerId, {
      fields: [
        'id',
        'stripe_account_id',
        'stripe_charges_enabled',
        'stripe_onboarding_complete',
      ],
    })
  );

  console.log('[Checkout] Organizer validation:', {
    organizerId: organizer.id,
    hasStripeAccount: !!organizer.stripe_account_id,
    chargesEnabled: organizer.stripe_charges_enabled,
    onboardingComplete: organizer.stripe_onboarding_complete,
  });

  if (
    !organizer.stripe_account_id ||
    !organizer.stripe_charges_enabled ||
    !organizer.stripe_onboarding_complete
  ) {
    throw new AppError({
      message: 'Organizador não está habilitado para receber pagamentos.',
      status: 400,
      code: 'ORGANIZER_NOT_ENABLED',
    });
  }

  // Buscar configuração de taxas com admin token
  console.log('[Checkout] Fetching event_configurations...');
  let config: any;

  try {
    const configurations = await adminClient.request(
      readItems('event_configurations' as any, {
        fields: ['platform_fee_percentage', 'stripe_percentage_fee', 'stripe_fixed_fee'],
        limit: 1,
      })
    );
    console.log('[Checkout] Configurations response:', configurations);
    config = Array.isArray(configurations) ? configurations[0] : configurations;

    if (!config) {
      console.warn('[Checkout] No configuration found in database');
    }
  } catch (configError) {
    console.error('[Checkout] Error fetching config:', configError);
    // Use default values if config fetch fails
    config = null;
  }

  // Use default values if no config found
  if (!config) {
    console.warn('[Checkout] Using default fee configuration (fallback)');
    config = {
      platform_fee_percentage: 1.99,
      stripe_percentage_fee: 4.35,
      stripe_fixed_fee: 0.39,
    };
  }

  console.log('[Checkout] Final config:', {
    platform_fee_percentage: config.platform_fee_percentage,
    stripe_percentage_fee: config.stripe_percentage_fee,
    stripe_fixed_fee: config.stripe_fixed_fee,
  });

  const feeConfig: FeeConfig = {
    platformFeePercentage: Number(config.platform_fee_percentage || 5),
    stripePercentageFee: Number(config.stripe_percentage_fee || 4.35),
    stripeFixedFee: Number(config.stripe_fixed_fee || 0.5),
  };

  // Validar e calcular valores dos ingressos
  let totalPlatformFee = 0;
  let totalStripeFee = 0;
  let totalAmount = 0;

  const lineItems: Array<{
    price_data: {
      currency: string;
      product_data: { name: string; description?: string };
      unit_amount: number;
    };
    quantity: number;
  }> = [];

  const registrationTickets: Array<{
    ticket_type_id: string;
    quantity: number;
    unit_price: number;
    convenience_fee: number;
    stripe_fee: number;
    platform_fee: number;
    total_amount: number;
  }> = [];

  for (const selectedTicket of body.tickets) {
    const ticket = event.tickets?.find((t) => t.id === selectedTicket.ticketId);

    if (!ticket) {
      throw createNotFoundError(`Ingresso ${selectedTicket.ticketId}`);
    }

    if (ticket.status !== 'active') {
      throw new AppError({
        message: `Ingresso "${ticket.title}" não está disponível.`,
        status: 400,
        code: 'TICKET_UNAVAILABLE',
      });
    }

    // Validar estoque disponível
    const totalQuantity = ticket.quantity ?? 0;
    const soldQuantity = ticket.quantity_sold ?? 0;
    const available = totalQuantity - soldQuantity;
    if (selectedTicket.quantity > available) {
      throw new AppError({
        message: `Quantidade solicitada de "${ticket.title}" não disponível. Disponível: ${available}`,
        status: 400,
        code: 'INSUFFICIENT_STOCK',
        context: { available, requested: selectedTicket.quantity },
      });
    }

    // Validar limites de compra
    if (
      ticket.max_quantity_per_purchase &&
      selectedTicket.quantity > ticket.max_quantity_per_purchase
    ) {
      throw new AppError({
        message: `Quantidade máxima por compra de "${ticket.title}": ${ticket.max_quantity_per_purchase}`,
        status: 400,
        code: 'QUANTITY_LIMIT_EXCEEDED',
        context: { max: ticket.max_quantity_per_purchase },
      });
    }

    // Calcular valores usando a nova função
    const ticketPrice = Number(ticket.price ?? 0);
    const serviceFeeType = (ticket.service_fee_type ?? 'passed_to_buyer') as 'passed_to_buyer' | 'absorbed';
    const fees = calculateFees(
      ticketPrice,
      serviceFeeType,
      feeConfig
    );

    // Calcular para quantidade de ingressos
    const ticketTotal = fees.buyerPrice * selectedTicket.quantity;
    const ticketConvenienceFee = fees.convenienceFee * selectedTicket.quantity;
    const ticketStripeFee = fees.stripeFee * selectedTicket.quantity;
    const ticketPlatformFee = fees.platformFee * selectedTicket.quantity;

    totalAmount += ticketTotal;
    totalPlatformFee += ticketPlatformFee;
    totalStripeFee += ticketStripeFee;

    // Adicionar ao line items do Stripe
    lineItems.push({
      price_data: {
        currency: 'brl',
        product_data: {
          name: ticket.title,
          description: event.title,
        },
        unit_amount: formatAmountForStripe(fees.buyerPrice),
      },
      quantity: selectedTicket.quantity,
    });

    // Guardar para criar registration
    registrationTickets.push({
      ticket_type_id: ticket.id,
      quantity: selectedTicket.quantity,
      unit_price: ticketPrice,
      convenience_fee: fees.convenienceFee,
      stripe_fee: fees.stripeFee,
      platform_fee: fees.platformFee,
      total_amount: fees.buyerPrice,
    });
  }

  // Criar registrations (um para cada tipo de ingresso)
  const createdRegistrations = [];

  for (const ticketData of registrationTickets) {
    console.log('[Checkout] Criando registration:', {
      event_id: body.eventId,
      ticket_type_id: ticketData.ticket_type_id,
      user_id: auth.user.id,
      quantity: ticketData.quantity,
    });

    try {
      const registration = await directus.request(
        createItem('event_registrations', {
          event_id: body.eventId,
          ticket_type_id: ticketData.ticket_type_id,
          participant_name: body.participantInfo.name,
          participant_email: body.participantInfo.email,
          participant_phone: body.participantInfo.phone || null,
          participant_document: body.participantInfo.document || null,
          user_id: auth.user.id,
          payment_status: 'pending',
          status: 'pending',
          payment_amount: ticketData.total_amount * ticketData.quantity,
          quantity: ticketData.quantity,
          unit_price: ticketData.unit_price,
          service_fee: ticketData.convenience_fee,
          total_amount: ticketData.total_amount * ticketData.quantity,
          payment_method: 'card',
        })
      );

      console.log('[Checkout] Registration retornado do Directus:', JSON.stringify(registration, null, 2));
      console.log('[Checkout] Tipo de registration:', typeof registration);
      console.log('[Checkout] registration.id:', registration?.id);

      if (!registration || !registration.id) {
        throw new AppError({
          message: 'Falha ao criar registration - sem permissão ou resposta inválida do Directus',
          status: 500,
          code: 'REGISTRATION_CREATION_FAILED',
        });
      }

      createdRegistrations.push(registration);
    } catch (regError) {
      console.error('[Checkout] Erro ao criar registration:', regError);
      throw new AppError({
        message: `Erro ao criar ingresso: ${regError instanceof Error ? regError.message : 'Verifique as permissões no Directus'}`,
        status: 500,
        code: 'REGISTRATION_ERROR',
        cause: regError,
      });
    }
  }

  // Criar Checkout Session no Stripe
  const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/eventos/${event.slug}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/eventos/${event.slug}/checkout/cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: body.participantInfo.email,
    payment_intent_data: {
      application_fee_amount: formatAmountForStripe(totalPlatformFee),
      transfer_data: {
        destination: organizer.stripe_account_id,
      },
      metadata: {
        registration_ids: createdRegistrations.map(r => r.id).join(','),
        event_id: body.eventId,
        organizer_id: organizer.id,
        total_stripe_fee: totalStripeFee.toFixed(2),
        total_platform_fee: totalPlatformFee.toFixed(2),
      },
    },
    metadata: {
      registration_ids: createdRegistrations.map(r => r.id).join(','),
      event_id: body.eventId,
      organizer_id: organizer.id,
    },
    payment_method_types: ['card'],
    locale: 'pt-BR',
  });

  // Atualizar registrations com checkout_session_id
  for (const registration of createdRegistrations) {
    await directus.request(
      updateItem('event_registrations', registration.id, {
        stripe_checkout_session_id: session.id,
      })
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    url: session.url,
    registrationIds: createdRegistrations.map(r => r.id),
  });
});
