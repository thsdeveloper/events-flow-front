import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	// Since we're using localStorage for tokens, logout is client-side only
	// But we provide this endpoint for consistency and future server-side session management
	return NextResponse.json({ success: true, message: 'Logout realizado com sucesso' });
}
