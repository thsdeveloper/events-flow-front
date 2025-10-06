'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			// ⭐ Call login API directly (no AuthContext)
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include', // ⭐ Important: Include cookies in request/response
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Falha ao fazer login');
			}

			// ⭐ Redirect priority:
			// 1. If user tried to access a specific page, redirect there
			// 2. Otherwise, use role-based redirect from API
			const redirectUrl = searchParams.get('redirect') || data.redirect || '/perfil';

			// ⭐ Small delay to ensure cookies are set before redirect
			await new Promise(resolve => setTimeout(resolve, 100));

			window.location.href = redirectUrl;
		} catch (err: any) {
			setError(err.message || 'Erro ao fazer login');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
			<div className="w-full max-w-md">
				<div className="mb-8">
					<Link
						href="/"
						className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
					>
						<ArrowLeft className="size-4" />
						Voltar ao site
					</Link>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
							Admin Login
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							Entre com suas credenciais
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
								{error}
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Email
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
								placeholder="seu@email.com"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Senha
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
								placeholder="••••••••"
							/>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<>Entrando...</>
							) : (
								<>
									<LogIn className="size-5" />
									Entrar
								</>
							)}
						</button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Não tem uma conta?{' '}
							<Link
								href="/register"
								className="text-accent hover:text-accent/90 font-medium"
							>
								Criar conta
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
