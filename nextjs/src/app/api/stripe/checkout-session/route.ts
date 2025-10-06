import { NextRequest, NextResponse } from 'next/server';
import { stripe, formatAmountForStripe } from '@/lib/stripe/server';
import { createDirectus, rest, readItems, createItem, updateItem, staticToken } from '@directus/sdk';
import type { Schema } from '@/types/directus-schema';
import { calculateFees, type FeeConfig } from '@/lib/fees';

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
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutSessionRequest = await request.json();

    // Validar dados básicos
    if (!body.eventId || !body.tickets?.length || !body.participantInfo) {
      return NextResponse.json(
        { error: 'Dados incompletos. Verifique os campos obrigatórios.' },
        { status: 400 }
      );
    }

    // Criar instância autenticada do Directus para esta requisição
    const formToken = process.env.DIRECTUS_FORM_TOKEN;
    if (!formToken) {
      throw new Error('DIRECTUS_FORM_TOKEN não configurado');
    }

    const directus = createDirectus<Schema>(directusUrl)
      .with(rest())
      .with(staticToken(formToken));

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

    // Verificar se organizador tem Stripe configurado
    const organizer = event.organizer_id;

    if (
      !organizer ||
      !organizer.stripe_account_id ||
      !organizer.stripe_charges_enabled ||
      !organizer.stripe_onboarding_complete
    ) {
      return NextResponse.json(
        { error: 'Organizador não está habilitado para receber pagamentos.' },
        { status: 400 }
      );
    }

    // Buscar configuração de taxas
    const configurations = await directus.request(readItems('event_configurations' as any));
    const config = configurations[0];

    if (!config) {
      return NextResponse.json(
        { error: 'Configuração de taxas não encontrada.' },
        { status: 500 }
      );
    }

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
      const available = ticket.quantity - (ticket.quantity_sold || 0);
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
      const ticketPrice = Number(ticket.price);
      const fees = calculateFees(
        ticketPrice,
        ticket.service_fee_type as 'passed_to_buyer' | 'absorbed',
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
      const registration = await directus.request(
        createItem('event_registrations', {
          event_id: body.eventId,
          ticket_type_id: ticketData.ticket_type_id,
          participant_name: body.participantInfo.name,
          participant_email: body.participantInfo.email,
          participant_phone: body.participantInfo.phone || null,
          participant_document: body.participantInfo.document || null,
          user_id: body.userId || null,
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
      createdRegistrations.push(registration);
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
