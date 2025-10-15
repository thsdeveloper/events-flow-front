import { NextRequest, NextResponse } from 'next/server';
import { createItem, readItem, updateItem } from '@directus/sdk';
import Stripe from 'stripe';
import { z } from 'zod';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { withApi, validateBody } from '@/lib/api';
import { AppError, createNotFoundError } from '@/lib/errors';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// Get Directus admin client
const getDirectusClient = () => {
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_FORM_TOKEN;

  if (!adminToken) {
    throw new AppError({
      message: 'DIRECTUS_ADMIN_TOKEN not configured',
      status: 500,
      code: 'INTERNAL_ERROR',
    });
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

export const POST = withApi(async (request: NextRequest) => {
  const body = await validateBody(request, checkoutSchema);
  const directus = getDirectusClient();

  // 1. Fetch ticket details with event
  const ticket = await directus.request(
    readItem('event_tickets', body.ticket_id, {
      fields: [
        '*',
        { event_id: ['*'] },
      ],
    })
  );

  if (!ticket) {
    throw createNotFoundError('Ticket');
  }

  // 2. Validate installment settings
  if (!ticket.allow_installments) {
    throw new AppError({
      message: 'Este ingresso não permite parcelamento',
      status: 400,
      code: 'INSTALLMENTS_NOT_ALLOWED',
    });
  }

  if (body.installments > (ticket.max_installments || 4)) {
    throw new AppError({
      message: `Máximo de ${ticket.max_installments} parcelas permitidas`,
      status: 400,
      code: 'MAX_INSTALLMENTS_EXCEEDED',
      context: { max_installments: ticket.max_installments },
    });
  }

  const totalAmount = (ticket.buyer_price ?? 0) * body.quantity;
  const minAmount = ticket.min_amount_for_installments ?? 50;

  if (totalAmount < minAmount) {
    throw new AppError({
      message: `Valor mínimo de R$ ${minAmount.toFixed(2)} para parcelamento`,
      status: 400,
      code: 'MIN_AMOUNT_NOT_REACHED',
      context: { min_amount: minAmount },
    });
  }

  // 3. Calculate installment amounts
  const installmentAmount = Number((totalAmount / body.installments).toFixed(2));
  const firstInstallmentAmount = Number(
    (totalAmount - (installmentAmount * (body.installments - 1))).toFixed(2)
  );

  // 4. Create event registration
  const registration = await directus.request(
    createItem('event_registrations', {
      event_id: ticket.event_id,
      ticket_type_id: body.ticket_id,
      participant_name: body.participant_name,
      participant_email: body.participant_email,
      participant_phone: body.participant_phone,
      participant_document: body.participant_document,
      quantity: body.quantity,
      unit_price: ticket.buyer_price,
      total_amount: totalAmount,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'pix',
      is_installment_payment: true,
      total_installments: body.installments,
      installment_plan_status: 'active',
    }, {
      fields: ['id'],
    })
  );

  // 5. Create installments
  const now = new Date();
  const installmentsData = [];

  for (let i = 1; i <= body.installments; i++) {
    const dueDate = new Date(now);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    const amount = i === 1 ? firstInstallmentAmount : installmentAmount;

    installmentsData.push({
      registration_id: registration.id,
      installment_number: i,
      total_installments: body.installments,
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
    payment_method_options: {
      pix: {
        expires_after_seconds: 86400, // 24 hours
      },
    },
    metadata: {
      installment_id: firstInstallment.id,
      registration_id: registration.id,
      installment_number: '1',
      total_installments: body.installments.toString(),
      event_id: typeof ticket.event_id === 'string' ? ticket.event_id : ticket.event_id.id,
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
});
