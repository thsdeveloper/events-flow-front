'use client';

import { memo } from 'react';
import { AlertCircle, CheckCircle2, LinkIcon } from 'lucide-react';
import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PayoutSummary } from './PayoutHistory';

interface StripeAccountStatusProps {
	organizer: OrganizerProfile;
	payoutSummary: PayoutSummary | null;
}

const statusItems = [
	{
		key: 'stripe_onboarding_complete',
		title: 'Onboarding Stripe',
		description: 'Cadastro concluído na plataforma Stripe Connect',
	},
	{
		key: 'stripe_charges_enabled',
		title: 'Pagamentos habilitados',
		description: 'Pronto para receber pagamentos e vender ingressos',
	},
	{
		key: 'stripe_payouts_enabled',
		title: 'Transferências habilitadas',
		description: 'Transferências bancárias liberadas para sua conta',
	},
] as const;

function StripeAccountStatus({ organizer, payoutSummary }: StripeAccountStatusProps) {
	const hasStripeAccount = Boolean(organizer.stripe_account_id);
	const pendingItems = statusItems.filter((item) => !organizer[item.key]);

	return (
		<Card className="border border-gray-200 shadow-sm dark:border-gray-800">
			<CardHeader>
				<CardTitle>Status da conta Stripe</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-3">
					{statusItems.map((item) => {
						const isActive = Boolean(organizer[item.key]);

						return (
							<div key={item.key} className="flex items-start gap-3">
								{isActive ? (
									<CheckCircle2 className="mt-0.5 size-5 flex-shrink-0 text-emerald-500" />
								) : (
									<AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-amber-500" />
								)}
								<div>
									<p className="text-sm font-semibold text-gray-900 dark:text-white">
										{item.title}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{item.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
				<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
					{hasStripeAccount ? (
						pendingItems.length === 0 ? (
							<div>
								<p className="font-semibold text-emerald-600 dark:text-emerald-300">
									Conta Stripe Connect ativa ✅
								</p>
								<p className="mt-1 text-sm">
									Seus repasses são gerenciados pelo Stripe. Últimos repasses: {payoutSummary?.payouts?.length ?? 0}.
								</p>
							</div>
						) : (
							<div>
								<p className="font-semibold text-amber-600 dark:text-amber-300">
									Atenção: ajustes necessários
								</p>
								<ul className="mt-2 list-disc pl-5 text-xs">
									{pendingItems.map((item) => (
										<li key={item.key}>{item.title}</li>
									))}
								</ul>
								<a
									href="/admin/minha-conta?tab=stripe"
									className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:underline dark:text-purple-300"
								>
									<LinkIcon className="size-4" />
									Acessar painel Stripe
								</a>
							</div>
						)
					) : (
						<div>
							<p className="font-semibold text-amber-600 dark:text-amber-300">
								Configure sua conta Stripe
							</p>
							<p className="mt-2 text-sm">
								É necessário concluir o onboarding Stripe Connect para liberar vendas e repasses.
							</p>
							<a
								href="/admin/minha-conta?tab=stripe"
								className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:underline dark:text-purple-300"
							>
								<LinkIcon className="size-4" />
								Prosseguir com configuração
							</a>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export default memo(StripeAccountStatus);
