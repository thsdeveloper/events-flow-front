import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { email, reset_url } = await request.json();

		if (!email) {
			return NextResponse.json(
				{ error: 'Email é obrigatório' },
				{ status: 400 }
			);
		}

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

		// Directus returns 204 No Content on success
		if (response.status === 204 || response.ok) {
			// Always return success even if email doesn't exist (security best practice)
			return NextResponse.json({
				success: true,
				message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
			});
		}

		// If there's an error response, still don't reveal details
		return NextResponse.json({
			success: true,
			message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
		});
	} catch (error: any) {
		console.error('Password reset request error:', error);

		// Don't reveal if the email exists or not (security best practice)
		return NextResponse.json({
			success: true,
			message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
		});
	}
}
