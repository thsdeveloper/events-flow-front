import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const input = searchParams.get('input');

		if (!input) {
			return NextResponse.json({ predictions: [] });
		}

		if (!GOOGLE_PLACES_API_KEY) {
			return NextResponse.json(
				{ error: 'Serviço de autocomplete não está configurado.' },
				{ status: 501 },
			);
		}

		const apiUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
		apiUrl.searchParams.set('input', input);
		apiUrl.searchParams.set('language', 'pt-BR');
		apiUrl.searchParams.set('types', 'geocode');
		apiUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

		const response = await fetch(apiUrl.toString());

		if (!response.ok) {
			return NextResponse.json(
				{ error: 'Falha ao consultar o Google Places.' },
				{ status: response.status },
			);
		}

		const data = await response.json();
		const predictions = Array.isArray(data?.predictions)
			? data.predictions.map((prediction: any) => ({
					placeId: prediction.place_id,
					description: prediction.description,
					mainText: prediction.structured_formatting?.main_text ?? prediction.description,
					secondaryText: prediction.structured_formatting?.secondary_text ?? null,
			  }))
			: [];

		return NextResponse.json({ predictions });
	} catch (error) {
		console.error('Places autocomplete error', error);

		return NextResponse.json({ error: 'Erro ao buscar sugestões.' }, { status: 500 });
	}
}
