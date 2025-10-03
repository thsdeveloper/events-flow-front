import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { token, password } = await request.json();

		if (!token || !password) {
			return NextResponse.json(
				{ error: 'Token e senha são obrigatórios' },
				{ status: 400 }
			);
		}

		if (password.length < 8) {
			return NextResponse.json(
				{ error: 'A senha deve ter no mínimo 8 caracteres' },
				{ status: 400 }
			);
		}

		const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

		// Reset the password using the token from the email
		const response = await fetch(`${directusUrl}/auth/password/reset`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				token,
				password,
			}),
		});

		// Directus returns 204 No Content on success
		if (response.status === 204 || response.ok) {
			return NextResponse.json({
				success: true,
				message: 'Senha redefinida com sucesso. Você pode fazer login agora.'
			});
		}

		// Handle error responses
		const errorData = await response.json().catch(() => ({}));
		const errorMessage = errorData.errors?.[0]?.message || 'Token inválido ou expirado';

		return NextResponse.json(
			{ error: errorMessage },
			{ status: response.status }
		);
	} catch (error: any) {
		console.error('Password reset error:', error);

		return NextResponse.json(
			{ error: 'Erro ao redefinir senha. Tente novamente ou solicite um novo link.' },
			{ status: 500 }
		);
	}
}
