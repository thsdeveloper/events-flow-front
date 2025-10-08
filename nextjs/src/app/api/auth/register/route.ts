import { NextRequest, NextResponse } from 'next/server';
import { getDefaultClientRoleId } from '@/lib/auth/roles';

export async function POST(request: NextRequest) {
	try {
		const { email, password, firstName, lastName } = await request.json();

		// Validate input
		if (!email || !password || !firstName || !lastName) {
			return NextResponse.json(
				{ error: 'Todos os campos são obrigatórios' },
				{ status: 400 }
			);
		}

		const roleId = getDefaultClientRoleId();

		if (!roleId) {
			console.error('Missing Directus client role configuration.');

			return NextResponse.json(
				{ error: 'Configuração do servidor inválida' },
				{ status: 500 }
			);
		}

		const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

		// Note: Public registration requires either:
		// 1. A public role with permission to create users, OR
		// 2. Directus public registration endpoint (if enabled)
		// For now, using public token which should have create user permission
		const publicToken = process.env.DIRECTUS_PUBLIC_TOKEN;

		if (!publicToken) {
			return NextResponse.json(
				{ error: 'Configuração do servidor inválida' },
				{ status: 500 }
			);
		}

		// Create user with direct fetch
		const createUserResponse = await fetch(`${directusUrl}/users`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${publicToken}`,
			},
			body: JSON.stringify({
				email,
				password,
				first_name: firstName,
				last_name: lastName,
				role: roleId,
				status: 'active',
			}),
		});

		if (!createUserResponse.ok) {
			const errorData = await createUserResponse.json();
			throw new Error(errorData.errors?.[0]?.message || 'Erro ao criar usuário');
		}

		const createUserData = await createUserResponse.json();
		const newUser = createUserData.data;

		return NextResponse.json(
			{
				success: true,
				message: 'Usuário criado com sucesso',
				user: {
					id: newUser.id,
					email: newUser.email,
					first_name: newUser.first_name,
					last_name: newUser.last_name,
				}
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('Registration error:', error);

		// Handle specific Directus errors
		if (error.errors) {
			const firstError = error.errors[0];
			
return NextResponse.json(
				{ error: firstError.message || 'Erro ao criar usuário' },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: 'Erro ao criar usuário. Tente novamente.' },
			{ status: 500 }
		);
	}
}
