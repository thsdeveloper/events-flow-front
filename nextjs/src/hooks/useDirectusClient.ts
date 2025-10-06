import { useMemo, useState, useEffect } from 'react';
import { getAuthenticatedClient } from '@/lib/directus/directus';

/**
 * Hook to get an authenticated Directus client
 *
 * Note: This hook fetches a token from the server using httpOnly cookies.
 * For new code, prefer using API routes for mutations instead of direct Directus access.
 *
 * @deprecated Consider using API routes for data mutations instead
 */
export function useDirectusClient() {
	const [token, setToken] = useState<string | null>(null);

	useEffect(() => {
		// Get token from server via cookie-based authentication
		fetch('/api/auth/token')
			.then((res) => {
				if (!res.ok) throw new Error('Failed to get token');

				return res.json();
			})
			.then((data) => setToken(data.token))
			.catch((err) => {
				console.warn('No access token available:', err);
				setToken(null);
			});
	}, []);

	const client = useMemo(() => {
		if (!token) {

			return null;
		}

		return getAuthenticatedClient(token);
	}, [token]);

	return client;
}
