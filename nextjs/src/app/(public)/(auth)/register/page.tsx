'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
	const router = useRouter();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (password !== confirmPassword) {
			setError('As senhas não coincidem');

			return;
		}

		if (password.length < 8) {
			setError('A senha deve ter pelo menos 8 caracteres');

			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, firstName, lastName }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Erro ao criar conta');
			}

			router.push('/dashboard');
			router.refresh();
		} catch (err: any) {
			setError(err.message || 'Erro ao criar conta');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
			<div className="w-full max-w-md">
				<div className="mb-8">
					<Link
						href="/nextjs/public"
						className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
					>
						<ArrowLeft className="size-4" />
						Voltar ao site
					</Link>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
							Criar Conta
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							Preencha seus dados para começar
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
								{error}
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Nome
								</label>
								<input
									type="text"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									required
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
									placeholder="João"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Sobrenome
								</label>
								<input
									type="text"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									required
									className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
									placeholder="Silva"
								/>
							</div>
						</div>

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

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Confirmar Senha
							</label>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
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
								<>Criando conta...</>
							) : (
								<>
									<UserPlus className="size-5" />
									Criar Conta
								</>
							)}
						</button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Já tem uma conta?{' '}
							<Link
								href="/login"
								className="text-accent hover:text-accent/90 font-medium"
							>
								Fazer login
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
