import { NextRequest, NextResponse } from 'next/server';
import { createItem, readItem, updateItem } from '@directus/sdk';
import Stripe from 'stripe';
import { z } from 'zod';
import { getAuthenticatedClient } from '@/lib/directus/directus';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// Get Directus admin client
const getDirectusClient = () => {
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_FORM_TOKEN;

  if (!adminToken) {
    throw new Error('DIRECTUS_ADMIN_TOKEN not configured');
  }

  return getAuthenticatedClient(adminToken);
};

// Validation schema
const checkoutSchema = z.object({
  ticket_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  installments: z.number().int().min(2).max(12),
  participant_name: z.string().min(1),
  participant_email: z.string().email(),
  participant_phone: z.string().optional(),
  participant_document: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = checkoutSchema.parse(body);

    const directus = getDirectusClient();

    // 1. Fetch ticket details with event
    const ticket = await directus.request(
      readItem('event_tickets', validatedData.ticket_id, {
        fields: [
          '*',
          { event_id: ['*'] },
        ],
      })
    );

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // 2. Validate installment settings
    if (!ticket.allow_installments) {
      return NextResponse.json(
        { error: 'Este ingresso não permite parcelamento' },
        { status: 400 }
      );
    }

    if (validatedData.installments > (ticket.max_installments || 4)) {
      return NextResponse.json(
        {
          error: `Máximo de ${ticket.max_installments} parcelas permitidas`,
          max_installments: ticket.max_installments
        },
        { status: 400 }
      );
    }

    const totalAmount = (ticket.buyer_price ?? 0) * validatedData.quantity;
    const minAmount = ticket.min_amount_for_installments ?? 50;

    if (totalAmount < minAmount) {
      return NextResponse.json(
        {
          error: `Valor mínimo de R$ ${minAmount.toFixed(2)} para parcelamento`,
          min_amount: minAmount
        },
        { status: 400 }
      );
    }

    // 3. Calculate installment amounts
    const installmentAmount = Number((totalAmount / validatedData.installments).toFixed(2));
    const firstInstallmentAmount = Number(
      (totalAmount - (installmentAmount * (validatedData.installments - 1))).toFixed(2)
    );

    // 4. Create event registration
    const registration = await directus.request(
      createItem('event_registrations', {
        event_id: ticket.event_id,
        ticket_type_id: validatedData.ticket_id,
        participant_name: validatedData.participant_name,
        participant_email: validatedData.participant_email,
        participant_phone: validatedData.participant_phone,
        participant_document: validatedData.participant_document,
        quantity: validatedData.quantity,
        unit_price: ticket.buyer_price,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'pix',
        is_installment_payment: true,
        total_installments: validatedData.installments,
        installment_plan_status: 'active',
      }, {
        fields: ['id'],
      })
    );

    // 5. Create installments
    const now = new Date();
    const installmentsData = [];

    for (let i = 1; i <= validatedData.installments; i++) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const amount = i === 1 ? firstInstallmentAmount : installmentAmount;

      installmentsData.push({
        registration_id: registration.id,
        installment_number: i,
        total_installments: validatedData.installments,
        amount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending' as const,
      });
    }

    const createdInstallments = await Promise.all(
      installmentsData.map((data) =>
        directus.request(
          createItem('payment_installments', data, {
            fields: ['id', 'amount', 'due_date', 'installment_number'],
          })
        )
      )
    );

    // 6. Create Stripe Payment Intent for first installment
    const firstInstallment = createdInstallments[0];

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(firstInstallment.amount * 100), // Convert to cents
      currency: 'brl',
      payment_method_types: ['pix'],
      metadata: {
        installment_id: firstInstallment.id,
        registration_id: registration.id,
        installment_number: '1',
        total_installments: validatedData.installments.toString(),
      },
    });

    // 7. Update first installment with Stripe data
    await directus.request(
      updateItem('payment_installments', firstInstallment.id, {
        stripe_payment_intent_id: paymentIntent.id,
        pix_qr_code_base64: paymentIntent.next_action?.pix_display_qr_code?.data || null,
        pix_copy_paste: paymentIntent.next_action?.pix_display_qr_code?.hosted_instructions_url || null,
      })
    );

    // 8. Return response
    return NextResponse.json({
      success: true,
      registration_id: registration.id,
      total_amount: totalAmount,
      installments: createdInstallments.map((inst) => ({
        id: inst.id,
        installment_number: inst.installment_number,
        amount: inst.amount,
        due_date: inst.due_date,
      })),
      first_installment: {
        id: firstInstallment.id,
        amount: firstInstallment.amount,
        pix_qr_code: paymentIntent.next_action?.pix_display_qr_code?.data,
        pix_copy_paste: paymentIntent.next_action?.pix_display_qr_code?.hosted_instructions_url,
        payment_intent_id: paymentIntent.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      },
    });
  } catch (error) {
    console.error('Checkout installments error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao processar checkout. Tente novamente.' },
      { status: 500 }
    );
  }
}
