'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
	const [isLogin, setIsLogin] = useState(true);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [error, setError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setIsSubmitting(true);

		try {
			if (isLogin) {
				// Call login API
				const response = await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password }),
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || 'Login failed');
				}
			} else {
				if (!firstName || !lastName) {
					setError('Por favor, preencha todos os campos');
					setIsSubmitting(false);

					return;
				}

				// Call register API
				const response = await fetch('/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password, firstName, lastName }),
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || 'Registration failed');
				}
			}

			onClose();
			resetForm();
			router.refresh(); // Refresh to update server components with new auth state
		} catch (err: any) {
			setError(err.message || 'Ocorreu um erro. Tente novamente.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setEmail('');
		setPassword('');
		setFirstName('');
		setLastName('');
		setError('');
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
		setError('');
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{isLogin ? 'Entrar' : 'Criar conta'}</DialogTitle>
					<DialogDescription>
						{isLogin ? 'Entre com sua conta para acessar a plataforma' : 'Crie sua conta para começar'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{!isLogin && (
						<>
							<div className="space-y-2">
								<Label htmlFor="firstName">Nome</Label>
								<Input
									id="firstName"
									type="text"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									required={!isLogin}
									placeholder="Digite seu nome"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="lastName">Sobrenome</Label>
								<Input
									id="lastName"
									type="text"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									required={!isLogin}
									placeholder="Digite seu sobrenome"
								/>
							</div>
						</>
					)}
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							placeholder="seu@email.com"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Senha</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							placeholder="••••••••"
							minLength={8}
						/>
					</div>

					{error && <p className="text-sm text-red-500">{error}</p>}

					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
					</Button>

					<div className="text-center text-sm">
						<button type="button" onClick={toggleMode} className="text-blue-500 hover:underline">
							{isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
						</button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
