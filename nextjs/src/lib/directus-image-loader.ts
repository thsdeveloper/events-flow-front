/**
 * Custom image loader for Next.js Image component
 * Adds Directus public token to image URLs for authentication
 */

interface DirectusImageLoaderProps {
	src: string;
	width: number;
	quality?: number;
}

export default function directusImageLoader({ src, width, quality }: DirectusImageLoaderProps): string {
	// If not a Directus URL, return as is
	const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
	if (!src.startsWith(directusUrl)) {
		return src;
	}

	// Get public token from environment
	const publicToken = process.env.NEXT_PUBLIC_DIRECTUS_PUBLIC_TOKEN || process.env.DIRECTUS_PUBLIC_TOKEN;

	// Build URL with Directus transformation parameters
	const url = new URL(src);

	// Add access token if available
	if (publicToken) {
		url.searchParams.set('access_token', publicToken);
	}

	// Add width parameter for Directus image optimization
	if (width) {
		url.searchParams.set('width', width.toString());
	}

	// Add quality parameter (Directus accepts 0-100)
	if (quality) {
		url.searchParams.set('quality', quality.toString());
	}

	// Add fit parameter for better image handling
	url.searchParams.set('fit', 'cover');

	return url.toString();
}
