'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useOrganizer } from '@/hooks/useOrganizer';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Import new components
import { HeroSection } from '@/components/organizer-upgrade/HeroSection';
import { BenefitsGrid } from '@/components/organizer-upgrade/BenefitsGrid';
import { SocialProof } from '@/components/organizer-upgrade/SocialProof';
import { MultiStepFormWizard } from '@/components/organizer-upgrade/MultiStepFormWizard';
import { StatusTimeline } from '@/components/organizer-upgrade/StatusTimeline';
import { SuccessState } from '@/components/organizer-upgrade/SuccessState';
import { FAQAccordion } from '@/components/organizer-upgrade/FAQAccordion';
import { StripeStatusCard } from '@/components/organizer/StripeStatusCard';
import { StripeOnboardingButton } from '@/components/organizer/StripeOnboardingButton';

export default function PerfilOrganizadorPage() {
	const router = useRouter();
	const formRef = useRef<HTMLDivElement>(null);
	const [showForm, setShowForm] = useState(false);
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
		hasPendingOrganizerRequest,
		organizerStatus,
		refresh,
	} = useServerAuth();

	useEffect(() => {
		if (!isLoading && !user) {
			router.push('/login?redirect=/perfil/organizador');
		}
	}, [user, isLoading, router]);

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

		window.history.replaceState({}, '', '/perfil/organizador');
	}, [refresh, refetchOrganizer, toast]);

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Carregando...</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	// Determine user state
	const isApprovedOrganizer = isOrganizer && organizerStatus === 'active';
	const isPending = hasPendingOrganizerRequest;
	const isRegularUser = !isOrganizer && !isPending;
	const hasStripeSetup =
		Boolean(
			organizer?.stripe_account_id &&
				organizer?.stripe_onboarding_complete &&
				organizer?.stripe_charges_enabled
		);

	// Handlers
	const handleGetStarted = () => {
		setShowForm(true);
		setTimeout(() => {
			formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 100);
	};

	const handleLearnMore = () => {
		window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
	};

	const handleFormSubmit = () => {
		refresh();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleEditRequest = () => {
		setShowForm(true);
		setTimeout(() => {
			formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 100);
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

				{/* STATE 1: Regular User - Show Full Marketing Flow */}
				{isRegularUser && (
					<div className="space-y-16">
						<HeroSection
							onGetStarted={handleGetStarted}
							onLearnMore={handleLearnMore}
						/>

						<BenefitsGrid />

						<SocialProof />

						{/* Form Section */}
						<div ref={formRef}>
							{showForm ? (
								<MultiStepFormWizard
									user={user}
									onSuccess={handleFormSubmit}
								/>
							) : (
								<div className="text-center py-12">
									<Button
										size="lg"
										onClick={handleGetStarted}
										className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl"
									>
										Solicitar acesso agora
									</Button>
								</div>
							)}
						</div>

						<FAQAccordion />
					</div>
				)}

				{/* STATE 2: Pending Request - Show Status Timeline */}
				{isPending && !isApprovedOrganizer && (
					<div className="">
						<StatusTimeline
							onEdit={handleEditRequest}
						/>

						{showForm && (
							<div ref={formRef} className="mt-8">
								<MultiStepFormWizard
									user={user}
									onSuccess={handleFormSubmit}
								/>
							</div>
						)}

						{/* FAQ for waiting users */}
						<div className="mt-16">
							<FAQAccordion />
						</div>
					</div>
				)}

				{/* STATE 3: Approved Organizer - Show Success State */}
				{isApprovedOrganizer && (
					<div className="mx-auto space-y-12">
						<SuccessState
							organizerName={user.first_name || 'Organizador'}
							hasStripeAccount={hasStripeSetup}
							onGetStarted={() => router.push('/dashboard/eventos/novo')}
						/>

						<section className="space-y-6">
							<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
								Configure seus pagamentos
							</h2>

							{organizerLoading ? (
								<div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 p-8 dark:border-gray-800 dark:bg-gray-900/40">
									<Loader2 className="size-6 animate-spin text-primary" />
									<span className="ml-3 text-sm text-muted-foreground">
										Carregando status do Stripe...
									</span>
								</div>
							) : organizer ? (
								<div className="space-y-6">
									<StripeStatusCard
										stripeAccountId={organizer.stripe_account_id || null}
										onboardingComplete={Boolean(organizer.stripe_onboarding_complete)}
										chargesEnabled={Boolean(organizer.stripe_charges_enabled)}
										payoutsEnabled={Boolean(organizer.stripe_payouts_enabled)}
									/>

									<div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-6 dark:border-purple-900 dark:bg-purple-950/20">
										<h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
											Conecte sua conta Stripe
										</h3>
										<p className="mt-2 text-sm text-purple-700 dark:text-purple-300">
											Finalize o onboarding para habilitar pagamentos e repasses automáticos. Você pode revisar seus dados sempre que precisar.
										</p>
										<StripeOnboardingButton
											organizerId={String(organizer.id)}
											isComplete={hasStripeSetup}
											successRedirectPath="/perfil/organizador?setup=success"
											refreshRedirectPath="/perfil/organizador?setup=refresh"
											className="mt-6 w-full md:w-auto"
										/>
									</div>
								</div>
							) : (
								<div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
									<p>
										Não encontramos seu perfil de organizador no momento. Recarregue a página ou tente novamente mais tarde.
									</p>
								</div>
							)}
						</section>

						{/* FAQ for new organizers */}
						<div>
							<FAQAccordion />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
