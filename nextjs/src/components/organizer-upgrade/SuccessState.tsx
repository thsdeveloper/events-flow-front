'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
	CheckCircle2,
	Sparkles,
	Calendar,
	CreditCard,
	UserCircle,
	Users,
	ArrowRight,
	Trophy
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';

const onboardingSteps = [
	{
		id: 1,
		title: 'Configure pagamentos Stripe',
		description: 'Conecte sua conta para receber repasses automáticos',
		icon: CreditCard,
		href: '/dashboard/financeiro',
		completed: false
	},
	{
		id: 2,
		title: 'Crie seu primeiro evento',
		description: 'Publique um evento e comece a vender ingressos',
		icon: Calendar,
		href: '/dashboard/eventos/novo',
		completed: false
	},
	{
		id: 3,
		title: 'Personalize seu perfil público',
		description: 'Adicione foto, bio e links para suas redes sociais',
		icon: UserCircle,
		href: '/perfil/organizador/editar',
		completed: false
	},
	{
		id: 4,
		title: 'Convide membros da equipe',
		description: 'Adicione colaboradores para gerenciar eventos juntos',
		icon: Users,
		href: '/dashboard/equipe',
		completed: false
	}
];

interface SuccessStateProps {
	organizerName?: string;
	approvedAt?: Date;
	hasStripeAccount?: boolean;
	onGetStarted?: () => void;
}

export function SuccessState({
	organizerName = 'Organizador',
	approvedAt,
	hasStripeAccount = false,
	onGetStarted
}: SuccessStateProps) {
	const [showConfetti, setShowConfetti] = useState(true);
	const { width, height } = useWindowSize();
	const approved = approvedAt || new Date();

	// Update onboarding steps based on props
	const steps = onboardingSteps.map(step =>
		step.id === 1 ? { ...step, completed: hasStripeAccount } : step
	);

	const completedSteps = steps.filter(s => s.completed).length;
	const progressPercentage = (completedSteps / steps.length) * 100;

	useEffect(() => {
		// Stop confetti after 5 seconds
		const timer = setTimeout(() => setShowConfetti(false), 5000);
		
return () => clearTimeout(timer);
	}, []);

	return (
		<div className="space-y-6">
			{/* Confetti Effect */}
			{showConfetti && width && height && (
				<Confetti
					width={width}
					height={height}
					recycle={false}
					numberOfPieces={500}
					gravity={0.3}
				/>
			)}

			{/* Celebration Card */}
			<Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800 overflow-hidden relative">
				{/* Decorative Elements */}
				<div className="absolute inset-0 opacity-10">
					<div className="absolute top-0 right-0 size-64 bg-green-400 rounded-full blur-3xl" />
					<div className="absolute bottom-0 left-0 size-48 bg-emerald-400 rounded-full blur-3xl" />
				</div>

				<CardHeader className="relative z-10">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
						className="flex justify-center mb-6"
					>
						<div className="relative">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
								className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 blur-xl opacity-50"
							/>
							<div className="relative size-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl">
								<Trophy className="size-12 text-white" />
							</div>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<CardTitle className="text-3xl md:text-4xl font-bold text-center mb-3">
							<span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
								Parabéns, {organizerName}!
							</span>
						</CardTitle>
						<CardDescription className="text-center text-lg text-gray-700 dark:text-gray-300">
							Sua conta de organizador foi aprovada com sucesso
						</CardDescription>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.4 }}
						className="flex justify-center mt-6"
					>
						<Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 px-4 py-2 text-base">
							<CheckCircle2 className="size-4 mr-2" />
							Aprovado em {approved.toLocaleDateString('pt-BR', {
								day: '2-digit',
								month: 'long',
								year: 'numeric'
							})}
						</Badge>
					</motion.div>
				</CardHeader>

				<CardContent className="relative z-10 space-y-6">
					{/* Onboarding Progress */}
					<div className="p-6 rounded-xl bg-white dark:bg-gray-900 border shadow-sm">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
								<Sparkles className="size-5 text-purple-600" />
								Primeiros passos
							</h3>
							<span className="text-sm text-gray-600 dark:text-gray-400">
								{completedSteps} de {steps.length} concluídos
							</span>
						</div>

						{/* Progress Bar */}
						<div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-6">
							<motion.div
								initial={{ width: 0 }}
								animate={{ width: `${progressPercentage}%` }}
								transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
								className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
							/>
						</div>

						{/* Onboarding Steps */}
						<div className="space-y-3">
							{steps.map((step, index) => {
								const Icon = step.icon;
								
return (
									<motion.div
										key={step.id}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: 0.6 + index * 0.1 }}
									>
										<Link
											href={step.href}
											className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 group"
										>
											<div className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
												step.completed
													? 'bg-green-100 dark:bg-green-900/30'
													: 'bg-purple-100 dark:bg-purple-900/30'
											}`}>
												{step.completed ? (
													<CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
												) : (
													<Icon className="size-5 text-purple-600 dark:text-purple-400" />
												)}
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<h4 className={`font-semibold ${
														step.completed
															? 'text-gray-500 dark:text-gray-500 line-through'
															: 'text-gray-900 dark:text-white'
													}`}>
														{step.title}
													</h4>
													{step.completed && (
														<Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
															Concluído
														</Badge>
													)}
												</div>
												<p className="text-sm text-gray-600 dark:text-gray-400">
													{step.description}
												</p>
											</div>

											<ArrowRight className="size-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex-shrink-0 mt-2" />
										</Link>
									</motion.div>
								);
							})}
						</div>
					</div>

					{/* Primary CTA */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1 }}
						className="flex flex-col sm:flex-row gap-3"
					>
						<Button
							size="lg"
							onClick={onGetStarted}
							asChild
							className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
						>
							<Link href="/dashboard/eventos/novo">
								<Calendar className="size-5 mr-2 group-hover:rotate-12 transition-transform" />
								Criar meu primeiro evento
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							asChild
							className="sm:w-auto"
						>
							<Link href="/dashboard">
								Ir para o Dashboard
							</Link>
						</Button>
					</motion.div>

					{/* Tips */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 1.2 }}
						className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900"
					>
						<div className="flex gap-3">
							<Sparkles className="size-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
							<div>
								<h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
									Dica pro
								</h5>
								<p className="text-sm text-purple-700 dark:text-purple-300">
									Configure seus pagamentos primeiro para poder começar a vender ingressos imediatamente após criar seu evento.
								</p>
							</div>
						</div>
					</motion.div>
				</CardContent>
			</Card>

			{/* What's Next */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">O que vem a seguir?</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{[
						{
							title: 'Acesso a recursos premium',
							description: 'Criação ilimitada de eventos, análises em tempo real e suporte prioritário'
						},
						{
							title: 'Dashboard completo',
							description: 'Gerencie vendas, participantes, check-ins e financeiro em um só lugar'
						},
						{
							title: 'Repasses automáticos',
							description: 'Receba seus pagamentos automaticamente via Stripe Connect'
						}
					].map((item, index) => (
						<motion.div
							key={item.title}
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 1.3 + index * 0.1 }}
							className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
						>
							<div className="size-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
								<CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
							</div>
							<div className="flex-1">
								<h5 className="font-semibold text-gray-900 dark:text-white">
									{item.title}
								</h5>
								<p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
									{item.description}
								</p>
							</div>
						</motion.div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
