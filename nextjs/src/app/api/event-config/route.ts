import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
	try {
		console.log('[event-config v2] Starting fetch...');

		const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
		const publicToken = process.env.DIRECTUS_PUBLIC_TOKEN;

		console.log('[event-config v2] Fetching configuration from:', directusUrl);
		console.log('[event-config v2] Token available:', !!publicToken);

		if (!publicToken) {
			console.error('[event-config] No public token available');
			return NextResponse.json(
				{ error: 'Server configuration error' },
				{ status: 500 }
			);
		}

		// Fetch configuration directly with fetch API
		const url = `${directusUrl}/items/event_configurations?limit=1&fields=platform_fee_percentage,stripe_percentage_fee,stripe_fixed_fee`;
		console.log('[event-config] Fetching from URL:', url);

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${publicToken}`,
			},
			cache: 'no-store', // Disable caching to always get fresh data
		});

		console.log('[event-config] Response status:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('[event-config] Directus error:', errorText);
			throw new Error(`Directus API error: ${response.status}`);
		}

		const result = await response.json();
		console.log('[event-config] Directus response:', JSON.stringify(result));

		const { data } = result;

		if (!data || data.length === 0) {
			console.log('[event-config] No data found, returning defaults');
			return NextResponse.json({
				platformFeePercentage: 5,
				stripePercentageFee: 4.35,
				stripeFixedFee: 0.5,
			});
		}

		const config = data[0];
		console.log('[event-config] Config:', config);

		const responseData = {
			platformFeePercentage: Number(config.platform_fee_percentage || 5),
			stripePercentageFee: Number(config.stripe_percentage_fee || 4.35),
			stripeFixedFee: Number(config.stripe_fixed_fee || 0.5),
		};

		console.log('[event-config] Returning:', responseData);

		return NextResponse.json(responseData);
	} catch (error: any) {
		console.error('[event-config] Error fetching event configuration:', error);

		// Return default values on error
		return NextResponse.json({
			platformFeePercentage: 5,
			stripePercentageFee: 4.35,
			stripeFixedFee: 0.5,
		});
	}
}
