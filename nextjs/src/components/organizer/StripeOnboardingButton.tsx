'use client';

import { useState } from 'react';
import { Loader2, CreditCard, RotateCw } from 'lucide-react';

interface StripeOnboardingButtonProps {
	organizerId: string;
	isComplete?: boolean;
	className?: string;
}

export function StripeOnboardingButton({
	organizerId,
	isComplete = false,
	className = '',
}: StripeOnboardingButtonProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleClick = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch('/api/organizer/stripe/onboarding', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					organizer_id: organizerId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Erro ao criar link de onboarding');
			}

			if (data.url) {
				// Redirect to Stripe onboarding
				window.location.href = data.url;
			} else {
				throw new Error('URL não retornada');
			}
		} catch (err: any) {
			console.error('Error creating onboarding link:', err);
			setError(err.message || 'Erro ao criar link de onboarding');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<button
				onClick={handleClick}
				disabled={loading}
				className={`
					inline-flex items-center justify-center gap-2
					px-6 py-3 rounded-xl font-medium
					transition-all duration-200
					disabled:opacity-50 disabled:cursor-not-allowed
					${
						isComplete
							? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:shadow-md border border-gray-300'
							: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/30'
					}
					${className}
				`}
			>
				{loading ? (
					<>
						<Loader2 className="size-5 animate-spin" />
						Carregando...
					</>
				) : (
					<>
						{isComplete ? (
							<>
								<RotateCw className="size-5" />
								Atualizar Cadastro Stripe
							</>
						) : (
							<>
								<CreditCard className="size-5" />
								Configurar Pagamentos
							</>
						)}
					</>
				)}
			</button>

			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-sm text-red-600">{error}</p>
				</div>
			)}
		</div>
	);
}
