'use client';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		checkAuth();
	}, []);

	const refreshToken = async (): Promise<boolean> => {
		try {
			const refresh_token = localStorage.getItem('directus_refresh_token');
			if (!refresh_token) return false;

			const response = await fetch('/api/auth/refresh', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ refresh_token }),
			});

			if (response.ok) {
				const data = await response.json();
				localStorage.setItem('directus_token', data.access_token);
				if (data.refresh_token) {
					localStorage.setItem('directus_refresh_token', data.refresh_token);
				}
				setUser(data.user);
				return true;
			}
			return false;
		} catch (error) {
			console.error('Token refresh failed:', error);
			return false;
		}
	};

	const checkAuth = async () => {
		try {
			const token = localStorage.getItem('directus_token');
			if (token) {
				const response = await fetch('/api/auth/me', {
					headers: {
						'Authorization': `Bearer ${token}`,
					},
				});

				if (response.ok) {
					const data = await response.json();
					setUser(data.user);
				} else if (response.status === 401) {
					// Token expired, try to refresh
					const refreshed = await refreshToken();
					if (!refreshed) {
						// Refresh failed, clear tokens
						localStorage.removeItem('directus_token');
						localStorage.removeItem('directus_refresh_token');
					}
				} else {
					localStorage.removeItem('directus_token');
					localStorage.removeItem('directus_refresh_token');
				}
			}
		} catch (error) {
			console.error('Auth check failed:', error);
			localStorage.removeItem('directus_token');
			localStorage.removeItem('directus_refresh_token');
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

			if (data.access_token) {
				localStorage.setItem('directus_token', data.access_token);
				if (data.refresh_token) {
					localStorage.setItem('directus_refresh_token', data.refresh_token);
				}
				setUser(data.user);
			}
		} catch (error: any) {
			console.error('Login failed:', error);
			throw new Error(error.message || 'Falha ao fazer login. Verifique suas credenciais.');
		}
	};

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			localStorage.removeItem('directus_token');
			localStorage.removeItem('directus_refresh_token');
			setUser(null);
		} catch (error) {
			console.error('Logout failed:', error);
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
