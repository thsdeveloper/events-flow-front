import { NextRequest, NextResponse } from 'next/server';
import { readItem, updateItem } from '@directus/sdk';
import Stripe from 'stripe';
import { getAuthenticatedClient } from '@/lib/directus/directus';
import { cookies } from 'next/headers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// Rate limiting in-memory store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    
return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  
return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: installmentId } = await params;

    // Get user token from cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('directus_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const directus = getAuthenticatedClient(authToken);

    // 1. Fetch installment with registration and user data
    const installment = await directus.request(
      readItem('payment_installments', installmentId, {
        fields: [
          '*',
          {
            registration_id: [
              'id',
              'participant_email',
              { event_id: ['id', 'title'] },
            ],
          },
        ],
      })
    );

    if (!installment) {
      return NextResponse.json(
        { error: 'Parcela não encontrada' },
        { status: 404 }
      );
    }

    // Type guard: ensure registration_id and event_id were populated
    if (
      typeof installment.registration_id === 'string' ||
      typeof installment.registration_id.event_id === 'string'
    ) {
      return NextResponse.json(
        { error: 'Erro ao carregar dados da inscrição' },
        { status: 500 }
      );
    }

    // 2. Check if installment is already paid
    if (installment.status === 'paid') {
      return NextResponse.json(
        { error: 'Esta parcela já foi paga' },
        { status: 400 }
      );
    }

    if (installment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Esta parcela foi cancelada' },
        { status: 400 }
      );
    }

    // 3. Rate limiting (5 requests per minute per installment)
    const rateLimitKey = `generate-pix:${installmentId}`;

    if (!checkRateLimit(rateLimitKey, 5, 60000)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' },
        { status: 429 }
      );
    }

    // 4. Check if existing Payment Intent is still valid (not expired)
    let paymentIntent: Stripe.PaymentIntent | null = null;
    let shouldCreateNew = true;

    if (installment.stripe_payment_intent_id) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(
          installment.stripe_payment_intent_id
        );

        // Check if Payment Intent is still usable
        if (
          existingPI.status === 'requires_payment_method' ||
          existingPI.status === 'requires_confirmation'
        ) {
          // Check if Pix QR code is still valid (24h expiration)
          const createdAt = new Date(existingPI.created * 1000);
          const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

          if (expiresAt > new Date()) {
            // Still valid, reuse it
            paymentIntent = existingPI;
            shouldCreateNew = false;
          }
        }
      } catch (error) {
        // If retrieval fails, create new one
        console.warn('Failed to retrieve existing Payment Intent:', error);
      }
    }

    // 5. Create new Payment Intent if needed
    if (shouldCreateNew) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(installment.amount * 100), // Convert to cents
        currency: 'brl',
        payment_method_types: ['pix'],
        metadata: {
          installment_id: installment.id,
          registration_id: installment.registration_id.id,
          installment_number: installment.installment_number.toString(),
          total_installments: installment.total_installments.toString(),
          event_id: installment.registration_id.event_id.id,
        },
      });

      // 6. Update installment with new Stripe data
      await directus.request(
        updateItem('payment_installments', installmentId, {
          stripe_payment_intent_id: paymentIntent.id,
          pix_qr_code_base64: paymentIntent.next_action?.pix_display_qr_code?.data || null,
          pix_copy_paste: paymentIntent.next_action?.pix_display_qr_code?.hosted_instructions_url || null,
        })
      );
    }

    if (!paymentIntent) {
      throw new Error('Failed to create or retrieve Payment Intent');
    }

    // 7. Return payment data
    const createdAt = new Date(paymentIntent.created * 1000);
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    return NextResponse.json({
      success: true,
      installment: {
        id: installment.id,
        installment_number: installment.installment_number,
        total_installments: installment.total_installments,
        amount: installment.amount,
        due_date: installment.due_date,
        status: installment.status,
      },
      payment: {
        payment_intent_id: paymentIntent.id,
        pix_qr_code: paymentIntent.next_action?.pix_display_qr_code?.data,
        pix_copy_paste: paymentIntent.next_action?.pix_display_qr_code?.hosted_instructions_url,
        expires_at: expiresAt.toISOString(),
        amount: installment.amount,
      },
      event: {
        id: installment.registration_id.event_id.id,
        name: installment.registration_id.event_id.title,
      },
    });
  } catch (error) {
    console.error('Generate Pix error:', error);

    return NextResponse.json(
      { error: 'Erro ao gerar Pix. Tente novamente.' },
      { status: 500 }
    );
  }
}
