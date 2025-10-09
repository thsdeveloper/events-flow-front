'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Mail, Edit3, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const timelineSteps = [
	{
		id: 1,
		title: 'Solicitação enviada',
		description: 'Recebemos suas informações com sucesso',
		icon: CheckCircle2,
		status: 'completed',
		color: 'text-green-600'
	},
	{
		id: 2,
		title: 'Em análise',
		description: 'Nossa equipe está validando seus dados',
		icon: Clock,
		status: 'current',
		color: 'text-amber-600'
	},
	{
		id: 3,
		title: 'Aprovação',
		description: 'Você receberá um email com as próximas etapas',
		icon: Mail,
		status: 'pending',
		color: 'text-gray-400'
	}
];

interface StatusTimelineProps {
	submittedAt?: Date;
	onEdit?: () => void;
}

export function StatusTimeline({ submittedAt, onEdit }: StatusTimelineProps) {
	const submitted = submittedAt || new Date();

	return (
		<div className="space-y-6">
			{/* Main Status Card */}
			<Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
				<CardHeader>
					<CardTitle className="flex items-center gap-3 text-2xl">
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
						>
							<Clock className="size-7 text-amber-600" />
						</motion.div>
						Solicitação em análise
					</CardTitle>
					<CardDescription className="text-base">
						Estamos validando suas informações. Você receberá um email assim que o processo for concluído.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Expected Time */}
					<div className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-gray-900 border">
						<Clock className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
						<div>
							<p className="font-semibold text-gray-900 dark:text-white">
								Tempo médio de análise: 24-48h úteis
							</p>
							<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
								Enviado em {submitted.toLocaleDateString('pt-BR', {
									day: '2-digit',
									month: 'long',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>
					</div>

					{/* Timeline */}
					<div className="relative">
						{timelineSteps.map((step, index) => {
							const Icon = step.icon;
							const isCompleted = step.status === 'completed';
							const isCurrent = step.status === 'current';
							const isPending = step.status === 'pending';

							return (
								<div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
									{/* Connector Line */}
									{index < timelineSteps.length - 1 && (
										<div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800">
											{isCompleted && (
												<motion.div
													initial={{ height: 0 }}
													animate={{ height: '100%' }}
													transition={{ duration: 0.5, delay: index * 0.2 }}
													className="w-full bg-amber-500"
												/>
											)}
										</div>
									)}

									{/* Icon */}
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ delay: index * 0.2, type: "spring" }}
										className={`relative z-10 flex-shrink-0 size-11 rounded-full flex items-center justify-center ${
											isCompleted
												? 'bg-green-100 dark:bg-green-900/30'
												: isCurrent
													? 'bg-amber-100 dark:bg-amber-900/30'
													: 'bg-gray-100 dark:bg-gray-800'
										}`}
									>
										<Icon className={`size-5 ${step.color}`} />
										{isCurrent && (
											<motion.div
												animate={{
													scale: [1, 1.2, 1],
													opacity: [0.5, 0.2, 0.5]
												}}
												transition={{
													duration: 2,
													repeat: Infinity,
													ease: "easeInOut"
												}}
												className="absolute inset-0 rounded-full bg-amber-400"
											/>
										)}
									</motion.div>

									{/* Content */}
									<div className="flex-1 pt-1">
										<h4 className={`font-semibold mb-1 ${
											isCompleted || isCurrent
												? 'text-gray-900 dark:text-white'
												: 'text-gray-400 dark:text-gray-600'
										}`}>
											{step.title}
										</h4>
										<p className={`text-sm ${
											isCompleted || isCurrent
												? 'text-gray-600 dark:text-gray-400'
												: 'text-gray-400 dark:text-gray-600'
										}`}>
											{step.description}
										</p>

										{isCompleted && (
											<Badge className="mt-2 bg-green-100 text-green-800 border-green-200">
												<CheckCircle2 className="size-3 mr-1" />
												Concluído
											</Badge>
										)}

										{isCurrent && (
											<div className="mt-3 flex gap-3">
												<div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
													<motion.div
														initial={{ width: 0 }}
														animate={{ width: '60%' }}
														transition={{ duration: 1, ease: "easeOut" }}
														className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
													/>
												</div>
												<span className="text-xs text-gray-500 dark:text-gray-400">
													~60% concluído
												</span>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>

					{/* Actions */}
					<div className="pt-4 border-t flex flex-wrap gap-3">
						{onEdit && (
							<Button variant="outline" onClick={onEdit} className="gap-2">
								<Edit3 className="size-4" />
								Editar solicitação
							</Button>
						)}
						<Button variant="outline" asChild className="gap-2">
							<Link href="/suporte">
								<HelpCircle className="size-4" />
								Falar com suporte
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* What to do while waiting */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">O que fazer enquanto aguarda?</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{[
						{
							title: 'Explore a plataforma',
							description: 'Navegue pelos eventos e veja como funciona a experiência do comprador',
							link: '/explorar'
						},
						{
							title: 'Prepare seu primeiro evento',
							description: 'Comece a planejar: data, local, descrição e precificação',
							link: null
						},
						{
							title: 'Configure notificações',
							description: 'Ative avisos por email para não perder a aprovação',
							link: '/perfil'
						}
					].map((item, index) => (
						<motion.div
							key={item.title}
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.6 + index * 0.1 }}
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
		</div>
	);
}
