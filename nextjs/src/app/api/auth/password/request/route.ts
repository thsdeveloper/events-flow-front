import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApi, validateBody } from '@/lib/api';

const schema = z.object({
	email: z.string().email('Email inválido'),
	reset_url: z.string().url().optional(),
});

export const POST = withApi(async (request: NextRequest) => {
	const { email, reset_url } = await validateBody(request, schema);

	const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

	// Request password reset email from Directus
	// This sends an email with a reset link to the user
	const response = await fetch(`${directusUrl}/auth/password/request`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			email,
			...(reset_url && { reset_url }), // Only include reset_url if provided
		}),
	});

	// Always return success even if email doesn't exist (security best practice)
	// Don't reveal if the email exists or not
	return NextResponse.json({
		success: true,
		message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
	});
});
