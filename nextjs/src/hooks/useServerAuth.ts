'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	role?: {
		id: string;
		name: string;
	} | null;
}

interface ServerAuthState {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
}

/**
 * Hook for Client Components to access server-side authentication state
 * Replaces the old useAuth() hook from AuthContext
 *
 * This hook:
 * - Reads authentication from httpOnly cookies (via API endpoint)
 * - Provides logout functionality
 * - Automatically redirects to login on 401 errors
 *
 * Note: For login/register, use the API routes directly:
 * - POST /api/auth/login
 * - POST /api/auth/register
 */
export function useServerAuth(): ServerAuthState & {
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
} {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	const fetchUser = async () => {
		try {
			setIsLoading(true);
			const response = await fetch('/api/auth/me');

			if (!response.ok) {
				if (response.status === 401) {
					setUser(null);

					return;
				}
				throw new Error('Failed to fetch user');
			}

			const data = await response.json();
			setUser(data.user);
		} catch (error) {
			console.error('Error fetching user:', error);
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			setUser(null);
			router.push('/login');
			router.refresh();
		} catch (error) {
			console.error('Logout error:', error);
		}
	};

	const refresh = async () => {
		await fetchUser();
	};

	useEffect(() => {
		fetchUser();
	}, []);

	return {
		user,
		isLoading,
		isAuthenticated: !!user,
		logout,
		refresh,
	};
}
