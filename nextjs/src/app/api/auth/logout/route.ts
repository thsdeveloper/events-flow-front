import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	const response = NextResponse.json({
		success: true,
		message: 'Logout realizado com sucesso'
	});

	// Clear authentication cookies
	response.cookies.delete('directus_token');
	response.cookies.delete('directus_refresh_token');

	return response;
}
