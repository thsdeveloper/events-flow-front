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
	refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		checkAuth();
	}, []);

	const checkAuth = async () => {
		try {
			// Cookies are sent automatically with fetch
			// No need to pass tokens manually!
			const response = await fetch('/api/auth/me', {
				credentials: 'include', // Important: include cookies
			});

			if (response.ok) {
				const data = await response.json();
				setUser(data.user);
			} else if (response.status === 401) {
				// Token expired, try to refresh
				const refreshResponse = await fetch('/api/auth/refresh', {
					method: 'POST',
					credentials: 'include',
				});

				if (refreshResponse.ok) {
					// Refresh succeeded, check auth again
					await checkAuth();
				} else {
					// Refresh failed, user needs to login
					setUser(null);
				}
			} else {
				setUser(null);
			}
		} catch (error) {
			console.error('Auth check failed:', error);
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
				credentials: 'include', // Include cookies
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Falha ao fazer login');
			}

			// Tokens are now stored in httpOnly cookies by the API
			// No need to manually store them!
			setUser(data.user);
		} catch (error: any) {
			console.error('Login failed:', error);
			throw new Error(error.message || 'Falha ao fazer login. Verifique suas credenciais.');
		}
	};

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});
			setUser(null);
			window.location.href = '/login';
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
				refreshAuth: checkAuth,
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
