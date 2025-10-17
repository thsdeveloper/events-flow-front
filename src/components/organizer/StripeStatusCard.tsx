'use client';

interface StripeStatusCardProps {
	stripeAccountId: string | null;
	onboardingComplete: boolean;
	chargesEnabled: boolean;
	payoutsEnabled: boolean;
}

export function StripeStatusCard({
	stripeAccountId,
	onboardingComplete,
	chargesEnabled,
	payoutsEnabled,
}: StripeStatusCardProps) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
			<div className="flex items-start justify-between mb-6">
				<div>
					<h3 className="text-lg font-semibold text-gray-900">
						Status da Conta Stripe
					</h3>
					<p className="text-sm text-gray-500 mt-1">
						Configure sua conta para receber pagamentos
					</p>
				</div>
				<svg
					className="size-8 text-purple-600"
					fill="currentColor"
					viewBox="0 0 24 24"
				>
					<path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
				</svg>
			</div>

			<div className="space-y-4">
				{/* Status Badges */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<StatusBadge
						label="Cadastro"
						status={onboardingComplete ? 'success' : 'pending'}
						icon={onboardingComplete ? 'check' : 'clock'}
					/>
					<StatusBadge
						label="Pagamentos"
						status={chargesEnabled ? 'success' : 'disabled'}
						icon={chargesEnabled ? 'check' : 'x'}
					/>
					<StatusBadge
						label="Transferências"
						status={payoutsEnabled ? 'success' : 'disabled'}
						icon={payoutsEnabled ? 'check' : 'x'}
					/>
				</div>

				{/* Account ID */}
				{stripeAccountId && (
					<div className="pt-4 border-t border-gray-100">
						<p className="text-xs text-gray-500">
							ID da Conta:{' '}
							<span className="font-mono text-gray-700">{stripeAccountId}</span>
						</p>
					</div>
				)}

				{/* Alert if not complete */}
				{!onboardingComplete && (
					<div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
						<div className="flex gap-3">
							<svg
								className="size-5 text-amber-600 flex-shrink-0 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
							<div className="flex-1">
								<p className="text-sm font-medium text-amber-800">
									Cadastro Incompleto
								</p>
								<p className="text-sm text-amber-700 mt-1">
									Complete o cadastro no Stripe para começar a receber pagamentos
									por eventos.
								</p>
							</div>
						</div>
					</div>
				)}

				{onboardingComplete && (
					<div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
						<div className="flex gap-3">
							<svg
								className="size-5 text-green-600 flex-shrink-0 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<div className="flex-1">
								<p className="text-sm font-medium text-green-800">
									Conta Ativa
								</p>
								<p className="text-sm text-green-700 mt-1">
									Sua conta está configurada e pronta para receber pagamentos!
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function StatusBadge({
	label,
	status,
	icon,
}: {
	label: string;
	status: 'success' | 'pending' | 'disabled';
	icon: 'check' | 'clock' | 'x';
}) {
	const colors = {
		success: 'bg-green-100 text-green-700 border-green-200',
		pending: 'bg-amber-100 text-amber-700 border-amber-200',
		disabled: 'bg-gray-100 text-gray-500 border-gray-200',
	};

	const icons = {
		check: (
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M5 13l4 4L19 7"
			/>
		),
		clock: (
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		),
		x: (
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M6 18L18 6M6 6l12 12"
			/>
		),
	};

	return (
		<div
			className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${colors[status]}`}
		>
			<svg
				className="size-4 flex-shrink-0"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				{icons[icon]}
			</svg>
			<span className="text-sm font-medium">{label}</span>
		</div>
	);
}
