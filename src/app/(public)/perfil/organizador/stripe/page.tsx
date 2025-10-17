'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, CreditCard, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useOrganizer } from '@/hooks/useOrganizer';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { StripeOnboardingButton } from '@/components/organizer/StripeOnboardingButton';
import { StripeStatusCard } from '@/components/organizer/StripeStatusCard';

export default function StripeConfigPage() {
	const router = useRouter();
	const { toast } = useToast();
	const {
		organizer,
		loading: organizerLoading,
		refetch: refetchOrganizer,
	} = useOrganizer();

	const {
		user,
		isLoading,
		isOrganizer,
		organizerStatus,
		refresh,
	} = useServerAuth();

	useEffect(() => {
		if (!isLoading && !user) {
			router.push('/login?redirect=/perfil/organizador/stripe');
		}
	}, [user, isLoading, router]);

	useEffect(() => {
		// If not an organizer (even pending), redirect to main organizer page
		if (!isLoading && !isOrganizer && organizerStatus !== 'pending') {
			router.push('/perfil/organizador');
		}
	}, [isLoading, isOrganizer, organizerStatus, router]);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const setupStatus = params.get('setup');

		if (!setupStatus) {
			return;
		}

		if (setupStatus === 'success') {
			toast({
				title: 'Conta conectada! ✨',
				description: 'Sua conta Stripe foi configurada com sucesso.',
				variant: 'success',
			});
			void refresh();
			void refetchOrganizer();
		} else if (setupStatus === 'refresh') {
			toast({
				title: 'Sessão expirada',
				description: 'Conclua o cadastro novamente para finalizar a configuração.',
				variant: 'destructive',
			});
		}

		window.history.replaceState({}, '', '/perfil/organizador/stripe');
	}, [refresh, refetchOrganizer, toast]);

	if (isLoading || organizerLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Carregando...</p>
				</div>
			</div>
		);
	}

	if (!user || !organizer) {
		return null;
	}

	const hasStripeSetup = Boolean(
		organizer.stripe_account_id &&
			organizer.stripe_onboarding_complete &&
			organizer.stripe_charges_enabled
	);

	return (
		<div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				{/* Header with back button */}
				<div className="mb-8">
					<Button
						variant="ghost"
						asChild
						className="mb-4"
					>
						<Link href="/perfil/organizador">
							<ArrowLeft className="size-4 mr-2" />
							Voltar
						</Link>
					</Button>

					<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
						Configuração de Pagamentos
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-400">
						Configure sua conta Stripe para receber pagamentos dos eventos
					</p>
				</div>

				<div className="space-y-6">
					{/* Main Stripe Setup Card */}
					<Card className="border-2 border-purple-200 dark:border-purple-900">
						<CardHeader>
							<div className="flex items-center gap-3 mb-2">
								<div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
									<CreditCard className="size-6" />
								</div>
								<div>
									<CardTitle className="text-2xl">Stripe Connect</CardTitle>
									<CardDescription>
										Processamento seguro de pagamentos
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* How it works */}
							<div className="space-y-3 rounded-lg bg-purple-50 p-4 dark:bg-purple-950/20">
								<h3 className="font-semibold text-purple-900 dark:text-purple-100">
									Como funciona:
								</h3>
								<div className="space-y-2">
									<div className="flex items-start gap-3">
										<div className="mt-1 flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-white shadow dark:bg-gray-700">
											<CreditCard className="size-4 text-purple-600" />
										</div>
										<div>
											<p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
												1. Conecte sua conta Stripe
											</p>
											<p className="text-xs text-purple-600 dark:text-purple-400">
												Preencha dados obrigatórios e valide identidade
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-1 flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-white shadow dark:bg-gray-700">
											<ShieldCheck className="size-4 text-emerald-600" />
										</div>
										<div>
											<p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
												2. Acompanhe a verificação
											</p>
											<p className="text-xs text-purple-600 dark:text-purple-400">
												Notificações automáticas sobre aprovações
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="mt-1 flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-white shadow dark:bg-gray-700">
											<CheckCircle2 className="size-4 text-indigo-600" />
										</div>
										<div>
											<p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
												3. Receba automaticamente
											</p>
											<p className="text-xs text-purple-600 dark:text-purple-400">
												Repasses diretos na conta configurada
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Stripe Status Card */}
							{organizer.stripe_account_id && (
								<div>
									<StripeStatusCard
										stripeAccountId={organizer.stripe_account_id}
										onboardingComplete={Boolean(organizer.stripe_onboarding_complete)}
										chargesEnabled={Boolean(organizer.stripe_charges_enabled)}
										payoutsEnabled={Boolean(organizer.stripe_payouts_enabled)}
									/>
								</div>
							)}

							{/* Onboarding Button */}
							<div className="pt-4">
								<StripeOnboardingButton
									organizerId={String(organizer.id)}
									isComplete={hasStripeSetup}
									successRedirectPath="/perfil/organizador/stripe?setup=success"
									refreshRedirectPath="/perfil/organizador/stripe?setup=refresh"
									className="w-full"
								/>
							</div>

							{/* Info Alert */}
							<Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
								<AlertCircle className="size-4 text-blue-600" />
								<AlertTitle className="text-blue-900 dark:text-blue-100">
									Por que o Stripe?
								</AlertTitle>
								<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
									Processamos pagamentos com segurança e conformidade PCI-DSS.
									Você recebe automaticamente e os participantes têm garantia de reembolso.
								</AlertDescription>
							</Alert>
						</CardContent>
					</Card>

					{/* Benefits Card */}
					<Card>
						<CardHeader>
							<CardTitle>Benefícios do Stripe Connect</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="flex items-start gap-3 rounded-lg border p-4">
									<ShieldCheck className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
									<div>
										<h4 className="font-semibold text-gray-900 dark:text-white">
											Pagamentos seguros
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Certificação PCI-DSS Level 1 e criptografia de ponta
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3 rounded-lg border p-4">
									<CreditCard className="size-5 text-purple-600 flex-shrink-0 mt-0.5" />
									<div>
										<h4 className="font-semibold text-gray-900 dark:text-white">
											Múltiplos métodos
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Aceite cartões, PIX, boleto e parcelamento
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3 rounded-lg border p-4">
									<CheckCircle2 className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
									<div>
										<h4 className="font-semibold text-gray-900 dark:text-white">
											Repasse automático
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Receba direto na sua conta após cada venda
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3 rounded-lg border p-4">
									<AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
									<div>
										<h4 className="font-semibold text-gray-900 dark:text-white">
											Proteção contra fraude
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Sistema inteligente de detecção de fraudes
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Help Section */}
					<Card>
						<CardHeader>
							<CardTitle>Precisa de ajuda?</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Se você tiver dúvidas sobre o processo de configuração do Stripe ou encontrar algum problema, nossa equipe de suporte está pronta para ajudar.
								</p>
								<Button variant="outline" asChild>
									<Link href="/suporte">
										Falar com suporte
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
