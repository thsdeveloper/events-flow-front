'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Edit3, HelpCircle, CreditCard, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

// Timeline steps removed - no longer needed for automatic approval

interface StatusTimelineProps {
	submittedAt?: Date;
	onEdit?: () => void;
	organizerId?: string;
	stripeAccountId?: string | null;
	stripeOnboardingComplete?: boolean;
	stripeChargesEnabled?: boolean;
}

export function StatusTimeline({
	submittedAt,
	onEdit,
	organizerId,
	stripeAccountId,
	stripeOnboardingComplete = false,
	stripeChargesEnabled = false,
}: StatusTimelineProps) {
	const submitted = submittedAt || new Date();

	// Check if Stripe is fully configured (will trigger status: 'active' via webhook)
	const hasStripeSetup = stripeAccountId && stripeOnboardingComplete && stripeChargesEnabled;

	return (
		<div className="space-y-6">
			{/* Stripe Setup Required Alert */}
			{!hasStripeSetup && organizerId && (
				<Alert className="border-2 border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/20">
					<CreditCard className="size-5 text-purple-600" />
					<AlertTitle className="text-purple-900 dark:text-purple-100">
						Finalize seu cadastro conectando sua conta Stripe 🎉
					</AlertTitle>
					<AlertDescription className="space-y-4 text-purple-700 dark:text-purple-300">
						<p>
							Para criar eventos e receber pagamentos, você precisa conectar uma conta Stripe. O processo é rápido e seguro!
						</p>

						<Button
							asChild
							size="lg"
							className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
						>
							<Link href="/perfil/organizador/stripe">
								<CreditCard className="size-5 mr-2" />
								Configurar Stripe agora
							</Link>
						</Button>

						<Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
							<AlertCircle className="size-4 text-blue-600" />
							<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
								<strong>Por que o Stripe?</strong> Processamos pagamentos com segurança e conformidade PCI-DSS.
								Você recebe automaticamente e os participantes têm garantia de reembolso.
							</AlertDescription>
						</Alert>
					</AlertDescription>
				</Alert>
			)}

			{/* Show registration confirmation only if Stripe is NOT set up yet */}
			{!hasStripeSetup && organizerId && (
				<Card className="border-purple-200 bg-purple-50/60 dark:bg-purple-950/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-3 text-2xl">
							<CheckCircle2 className="size-7 text-purple-600" />
							Cadastro criado com sucesso!
						</CardTitle>
						<CardDescription className="text-base">
							Enviado em {submitted.toLocaleDateString('pt-BR', {
								day: '2-digit',
								month: 'long',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
							<AlertCircle className="size-4 text-blue-600" />
							<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
								<strong>Próximo passo:</strong> Conecte sua conta Stripe acima para ativar sua conta de organizador e começar a criar eventos pagos.
							</AlertDescription>
						</Alert>

						{/* Actions */}
						<div className="pt-4 border-t flex flex-wrap gap-3">
							{onEdit && (
								<Button variant="outline" onClick={onEdit} className="gap-2">
									<Edit3 className="size-4" />
									Editar informações
								</Button>
							)}
							<Button variant="outline" asChild className="gap-2">
								<Link href="/suporte">
									<HelpCircle className="size-4" />
									Precisa de ajuda?
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* What to do next */}
			{!hasStripeSetup && organizerId && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Próximos passos após conectar o Stripe</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{[
							{
								title: 'Crie seu primeiro evento',
								description: 'Configure data, local, descrição e tipos de ingressos',
								link: null
							},
							{
								title: 'Configure métodos de pagamento',
								description: 'Defina se aceita PIX, cartão e parcelamento',
								link: null
							},
							{
								title: 'Publique e compartilhe',
								description: 'Divulgue seu evento nas redes sociais e comece a vender',
								link: null
							}
						].map((item, index) => (
							<motion.div
								key={item.title}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.3 + index * 0.1 }}
								className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
							>
								<div className="size-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
									<span className="text-xs font-bold text-purple-600 dark:text-purple-400">
										{index + 1}
									</span>
								</div>
								<div className="flex-1">
									<h5 className="font-semibold text-gray-900 dark:text-white">
										{item.title}
									</h5>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
										{item.description}
									</p>
									{item.link && (
										<Link
											href={item.link}
											className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 mt-1 inline-block"
										>
											Ir agora →
										</Link>
									)}
								</div>
							</motion.div>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
