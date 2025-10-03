import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthenticatedClient } from '@/lib/directus/directus';

/**
 * Hook to get an authenticated Directus client
 * Uses the access token from AuthContext
 */
export function useDirectusClient() {
	const { getAccessToken } = useAuth();
	const token = getAccessToken();

	const client = useMemo(() => {
		if (!token) {
			console.warn('No access token available');
			
return null;
		}
		console.log('Creating Directus client with token:', token.substring(0, 20) + '...');
		
return getAuthenticatedClient(token);
	}, [token]);

	return client;
}
