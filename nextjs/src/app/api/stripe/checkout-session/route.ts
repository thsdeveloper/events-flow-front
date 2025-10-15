import { NextRequest, NextResponse } from 'next/server';
import { stripe, formatAmountForStripe } from '@/lib/stripe/server';
import { createDirectus, rest, staticToken, readItems, createItem, updateItem, readItem } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';
import { calculateFees, type FeeConfig } from '@/lib/fees';
import { getServerAuth, getAuthenticatedServerClient } from '@/lib/auth/server-auth';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

interface CheckoutSessionRequest {
  eventId: string;
  tickets: Array<{
    ticketId: string;
    quantity: number;
  }>;
  participantInfo: {
    name: string;
    email: string;
    phone?: string;
    document?: string;
  };
  // userId não é mais enviado pelo cliente - vem da sessão autenticada
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação PRIMEIRO
    const auth = await getServerAuth();

    if (!auth) {
      return NextResponse.json(
        { error: 'Você precisa estar logado para realizar uma compra.' },
        { status: 401 }
      );
    }

    console.log(`[Checkout] Usuário autenticado: ${auth.user.email} (ID: ${auth.user.id})`);

    const body: CheckoutSessionRequest = await request.json();

    // Validar dados básicos
    if (!body.eventId || !body.tickets?.length || !body.participantInfo) {
      return NextResponse.json(
        { error: 'Dados incompletos. Verifique os campos obrigatórios.' },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
    }

    // Buscar organizador com admin token para acessar campos stripe_*
    // (usuários comuns não têm permissão para ler esses campos sensíveis)
    const adminToken = process.env.DIRECTUS_ADMIN_TOKEN;
    if (!adminToken) {
      throw new Error('DIRECTUS_ADMIN_TOKEN não configurado');
    }

    const adminClient = createDirectus<Schema>(directusUrl)
      .with(rest())
      .with(staticToken(adminToken));

    const organizerId = typeof event.organizer_id === 'string'
      ? event.organizer_id
      : event.organizer_id?.id;

    if (!organizerId) {
      return NextResponse.json({ error: 'Evento sem organizador configurado.' }, { status: 400 });
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
      return NextResponse.json(
        { error: 'Organizador não está habilitado para receber pagamentos.' },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: `Ingresso ${selectedTicket.ticketId} não encontrado.` },
          { status: 404 }
        );
      }

      if (ticket.status !== 'active') {
        return NextResponse.json(
          { error: `Ingresso "${ticket.title}" não está disponível.` },
          { status: 400 }
        );
      }

      // Validar estoque disponível
      const totalQuantity = ticket.quantity ?? 0;
      const soldQuantity = ticket.quantity_sold ?? 0;
      const available = totalQuantity - soldQuantity;
      if (selectedTicket.quantity > available) {
        return NextResponse.json(
          {
            error: `Quantidade solicitada de "${ticket.title}" não disponível. Disponível: ${available}`,
          },
          { status: 400 }
        );
      }

      // Validar limites de compra
      if (
        ticket.max_quantity_per_purchase &&
        selectedTicket.quantity > ticket.max_quantity_per_purchase
      ) {
        return NextResponse.json(
          {
            error: `Quantidade máxima por compra de "${ticket.title}": ${ticket.max_quantity_per_purchase}`,
          },
          { status: 400 }
        );
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
            user_id: auth.user.id, // ← Usar ID do usuário autenticado (mais seguro)
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
          throw new Error('Falha ao criar registration - sem permissão ou resposta inválida do Directus');
        }

        createdRegistrations.push(registration);
      } catch (regError) {
        console.error('[Checkout] Erro ao criar registration:', regError);
        throw new Error(`Erro ao criar ingresso: ${regError instanceof Error ? regError.message : 'Verifique as permissões no Directus'}`);
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
  } catch (error) {
    console.error('Erro ao criar checkout session:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao processar pagamento.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Erro ao processar pagamento.' }, { status: 500 });
  }
}
