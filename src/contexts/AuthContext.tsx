'use client';

/**
 * @deprecated This AuthContext is deprecated and should not be used in new code.
 *
 * Authentication has been migrated to server-side httpOnly cookies for better security.
 *
 * For Client Components, use:
 * - useServerAuth() hook from '@/hooks/useServerAuth' for auth state
 * - Direct API calls to /api/auth/login, /api/auth/register, /api/auth/logout
 *
 * For Server Components and API routes:
 * - Use getCurrentUser() from '@/lib/auth/server-auth'
 * - Use getAuthToken() from '@/lib/auth/cookies'
 *
 * This file is kept only for backward compatibility and will be removed in a future version.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
}

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
	refreshAuth: () => Promise<void>;
	getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		checkAuth();
	}, []);

	const getAccessToken = () => {
		if (typeof window === 'undefined') return null;
		
return localStorage.getItem('access_token');
	};

	const getRefreshToken = () => {
		if (typeof window === 'undefined') return null;
		
return localStorage.getItem('refresh_token');
	};

	const setTokens = (accessToken: string, refreshToken: string, expires: number) => {
		localStorage.setItem('access_token', accessToken);
		localStorage.setItem('refresh_token', refreshToken);
		localStorage.setItem('token_expires', expires.toString());
	};

	const clearTokens = () => {
		localStorage.removeItem('access_token');
		localStorage.removeItem('refresh_token');
		localStorage.removeItem('token_expires');
	};

	const checkAuth = async () => {
		try {
			const accessToken = getAccessToken();

			if (!accessToken) {
				setUser(null);
				setIsLoading(false);
				
return;
			}

			// Try to get user with current token
			const response = await fetch('/api/auth/me', {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				setUser(data.user);
			} else if (response.status === 401) {
				// Token expired, try to refresh
				const refreshToken = getRefreshToken();
				if (refreshToken) {
					try {
						const refreshResponse = await fetch('/api/auth/refresh', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ refresh_token: refreshToken }),
						});

						if (refreshResponse.ok) {
							const refreshData = await refreshResponse.json();
							setTokens(refreshData.access_token, refreshData.refresh_token, refreshData.expires);
							setUser(refreshData.user);
						} else {
							// Refresh failed, clear tokens
							clearTokens();
							setUser(null);
						}
					} catch (error) {
						console.error('Refresh failed:', error);
						clearTokens();
						setUser(null);
					}
				} else {
					clearTokens();
					setUser(null);
				}
			} else {
				clearTokens();
				setUser(null);
			}
		} catch (error) {
			console.error('Auth check failed:', error);
			clearTokens();
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogin = async (email: string, password: string) => {
		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Falha ao fazer login');
			}

			// Store tokens in localStorage
			setTokens(data.access_token, data.refresh_token, data.expires);
			setUser(data.user);
		} catch (error: any) {
			console.error('Login failed:', error);
			throw new Error(error.message || 'Falha ao fazer login. Verifique suas credenciais.');
		}
	};

	const handleLogout = async () => {
		try {
			const refreshToken = getRefreshToken();

			if (refreshToken) {
				await fetch('/api/auth/logout', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ refresh_token: refreshToken }),
				});
			}

			clearTokens();
			setUser(null);
			window.location.href = '/login';
		} catch (error) {
			console.error('Logout failed:', error);
			clearTokens();
			setUser(null);
		}
	};

	const handleRegister = async (email: string, password: string, firstName: string, lastName: string) => {
		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					password,
					first_name: firstName,
					last_name: lastName,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Falha ao criar conta');
			}

			// Auto login after registration
			await handleLogin(email, password);
		} catch (error: any) {
			console.error('Registration failed:', error);
			throw new Error(error.message || 'Falha ao criar conta');
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				login: handleLogin,
				logout: handleLogout,
				register: handleRegister,
				refreshAuth: checkAuth,
				getAccessToken,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}

	return context;
}
