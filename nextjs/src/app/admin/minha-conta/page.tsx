'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
	AlertCircle,
	ArrowRightLeft,
	BadgeCheck,
	Building2,
	CalendarDays,
	Camera,
	CheckCircle2,
	CreditCard,
	Globe,
	Loader2,
	Mail,
	NotebookPen,
	Phone,
	Save,
	ShieldCheck,
	TrendingUp,
	Users,
} from 'lucide-react';
import { useOrganizer } from '@/hooks/useOrganizer';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useToast } from '@/hooks/use-toast';
import { StripeOnboardingButton } from '@/components/organizer/StripeOnboardingButton';
import { httpClient } from '@/lib/http-client';
import { toastSuccess } from '@/lib/toast-helpers';

type Tab = 'perfil' | 'pagamentos';

interface OrganizerStats {
	totalEvents: number;
	totalRegistrations: number;
	totalRevenue: number;
}

export default function AdminAccountPage() {
	const { organizer, loading: organizerLoading, refetch } = useOrganizer();
	const { user } = useServerAuth();
	const { toast } = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [activeTab, setActiveTab] = useState<Tab>('perfil');
	const [savingProfile, setSavingProfile] = useState(false);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [stats, setStats] = useState<OrganizerStats>({
		totalEvents: 0,
		totalRegistrations: 0,
		totalRevenue: 0,
	});
	const [loadingStats, setLoadingStats] = useState(false);

	const [profileData, setProfileData] = useState({
		name: '',
		email: '',
		phone: '',
		website: '',
		description: '',
	});

	useEffect(() => {
		if (!organizer) return;

		setProfileData({
			name: organizer.name || '',
			email: organizer.email || '',
			phone: organizer.phone || '',
			website: organizer.website || '',
			description: organizer.description || '',
		});
	}, [organizer]);

	useEffect(() => {
		async function fetchStats() {
			if (!organizer?.id) return;

			setLoadingStats(true);
			try {
				const data = await httpClient.get<{ stats: OrganizerStats }>(
					`/api/organizer/stats?organizerId=${organizer.id}`
				);
				setStats(data.stats);
			} finally {
				setLoadingStats(false);
			}
		}

		fetchStats();
	}, [organizer?.id]);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const setup = params.get('setup');

		if (!setup) return;

		setActiveTab('pagamentos');

		if (setup === 'success') {
			toastSuccess({
				title: 'Conta conectada! ✨',
				description:
					'Sua conta Stripe foi configurada. Aguarde alguns instantes enquanto sincronizamos os dados.',
			});
			refetch();
		} else if (setup === 'refresh') {
			toast({
				title: 'Sessão expirada',
				description: 'Conclua a etapa de pagamentos novamente para finalizar a configuração.',
				variant: 'destructive',
			});
		}

		window.history.replaceState({}, '', '/admin/minha-conta');
	}, [refetch, toast]);

	const stripeStatus = useMemo(() => {
		if (!organizer) {
			return 'incomplete';
		}

		if (organizer.stripe_charges_enabled && organizer.stripe_payouts_enabled) {
			return 'complete';
		}

		if (organizer.stripe_account_id) {
			return 'pending';
		}

		return 'incomplete';
	}, [organizer]);

	const getStatusConfig = () => {
		switch (stripeStatus) {
			case 'complete':
				return {
					title: 'Pagamentos liberados',
					description: 'Você já pode receber pelos seus eventos.',
					accent: 'from-emerald-500 to-emerald-600',
					icon: CheckCircle2,
					badge: 'Conta verificada',
				};
			case 'pending':
				return {
					title: 'Verificação em progresso',
					description: 'Estamos analisando os dados da sua conta Stripe.',
					accent: 'from-amber-500 to-orange-500',
					icon: ShieldCheck,
					badge: 'Revisão Stripe',
				};
			default:
				return {
					title: 'Configure seus pagamentos',
					description: 'Finalize o onboarding para começar a vender ingressos.',
					accent: 'from-purple-500 to-indigo-500',
					icon: AlertCircle,
					badge: 'Ação necessária',
				};
		}
	};

	const statusConfig = getStatusConfig();

	const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!organizer?.id && !user?.id) {
			return;
		}

		setSavingProfile(true);
		try {
			const payload = organizer?.id
				? { organizerId: organizer.id, ...profileData }
				: { userId: user?.id, ...profileData };

			if (organizer?.id) {
				await httpClient.patch('/api/organizer/profile', payload);
			} else {
				await httpClient.post('/api/organizer/profile', payload);
			}

			toastSuccess({
				title: 'Perfil atualizado',
				description: 'Suas informações foram salvas com sucesso.',
			});
			refetch();
		} finally {
			setSavingProfile(false);
		}
	};

	const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		if (!file || !organizer?.id) {
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			toast({
				title: 'Arquivo muito grande',
				description: 'Selecione uma imagem com até 5MB.',
				variant: 'destructive',
			});

			return;
		}

		setUploadingLogo(true);
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('organizerId', organizer.id);

			await httpClient.post('/api/organizer/logo', formData);

			toastSuccess({
				title: 'Logo atualizado',
				description: 'Sua identidade visual já aparece nos eventos.',
			});
			refetch();
		} finally {
			setUploadingLogo(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	const logoUrl = useMemo(() => {
		if (!organizer?.logo) {

			return null;
		}

		const logoId = typeof organizer.logo === 'string' ? organizer.logo : organizer.logo.id;

		return `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${logoId}`;
	}, [organizer?.logo]);

	if (organizerLoading || !organizer) {

		return (
			<div className="flex h-[60vh] items-center justify-center">
				<Loader2 className="size-8 animate-spin text-purple-600" />
			</div>
		);
	}

	const tabs = [
		{
			id: 'perfil' as const,
			label: 'Perfil de organizador',
			icon: Building2,
		},
		{
			id: 'pagamentos' as const,
			label: 'Pagamentos',
			icon: CreditCard,
		},
	];

	return (
		<div className="space-y-8">
			<section className="relative overflow-hidden rounded-3xl bg-slate-950 p-1 shadow-xl">
				<div className="absolute inset-0 bg-gradient-to-br from-purple-500/40 via-indigo-500/30 to-cyan-500/30" />
				<div className="relative rounded-[22px] bg-slate-900 px-8 py-10">
					<div className="flex flex-col gap-8 lg:flex-row lg:items-center">
						<div className="relative flex items-center gap-6">
							<div className="relative">
								<div className="size-28 overflow-hidden rounded-2xl border-4 border-white/10 bg-white/5 backdrop-blur">
									{logoUrl ? (
										<Image
											src={logoUrl}
											alt={organizer.name}
											width={112}
											height={112}
											className="size-full object-cover"
										/>
									) : (
										<div className="flex size-full items-center justify-center">
											<Building2 className="size-12 text-white/60" />
										</div>
									)}
								</div>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="group absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
								>
									<Camera className="size-4" />
									Atualizar logo
								</button>
								<input
									type="file"
									ref={fileInputRef}
									accept="image/*"
									className="hidden"
									onChange={handleLogoUpload}
								/>
								{uploadingLogo && (
									<div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
										<Loader2 className="size-6 animate-spin text-white" />
									</div>
								)}
							</div>

							<div className="space-y-2">
								<p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
									<span className="size-2 rounded-full bg-emerald-400" />
									Organizador ativo
								</p>
								<h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
									{organizer.name || 'Seu evento, sua assinatura'}
								</h1>
								<div className="flex flex-wrap gap-4 text-sm text-white/70">
									<div className="flex items-center gap-2">
										<Mail className="size-4" />
										<span>{organizer.email || user?.email}</span>
									</div>
									{organizer.phone && (
										<div className="flex items-center gap-2">
											<Phone className="size-4" />
											<span>{organizer.phone}</span>
										</div>
									)}
									<div className="flex items-center gap-2">
										<CalendarDays className="size-4" />
										<span>
											Membro ativo
										</span>
									</div>
								</div>
							</div>
						</div>

						<div className="grid flex-1 gap-4 sm:grid-cols-3">
							{[
								{
									title: 'Eventos publicados',
									value: loadingStats ? '—' : stats.totalEvents,
									icon: CalendarDays,
								},
								{
									title: 'Ingressos confirmados',
									value: loadingStats ? '—' : stats.totalRegistrations,
									icon: Users,
								},
								{
									title: 'Receita total',
									value: loadingStats
										? '—'
										: new Intl.NumberFormat('pt-BR', {
											style: 'currency',
											currency: 'BRL',
										}).format(stats.totalRevenue / 100),
									icon: TrendingUp,
								},
								].map((item) => {
									const Icon = item.icon;

									return (
									<div
										key={item.title}
										className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur transition hover:border-white/40"
									>
										<Icon className="size-6 text-white/70" />
										<div className="mt-4 text-2xl font-semibold">{item.value}</div>
										<p className="text-sm text-white/70">{item.title}</p>
										<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/10 opacity-0 transition group-hover:opacity-100" />
									</div>
								);
							})}
						</div>
					</div>

					<div className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
						<div>
							<span className="text-xs font-semibold uppercase tracking-wide text-white/60">
								Status de pagamentos
							</span>
							<div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
								<span className="size-2 rounded-full bg-emerald-400" />
								{statusConfig.badge}
							</div>
						</div>
						<div
							className={`inline-flex items-center gap-3 rounded-full bg-gradient-to-r ${statusConfig.accent} px-5 py-2 text-sm font-semibold text-white shadow-lg`}
						>
							<span>{statusConfig.title}</span>
						</div>
					</div>
				</div>
			</section>

			<nav className="flex flex-wrap gap-3">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = tab.id === activeTab;

					return (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
								isActive
									? 'bg-slate-900 text-white shadow-lg shadow-purple-500/20'
									: 'bg-white text-slate-600 hover:bg-slate-100'
							}`}
						>
							<Icon className="size-5" />
							{tab.label}
						</button>
					);
				})}
			</nav>

			<div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
				<section className="space-y-8">
					{activeTab === 'perfil' && (
						<form
							onSubmit={handleSaveProfile}
							className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
						>
							<header className="space-y-2">
								<h2 className="text-xl font-semibold text-slate-900">
									Sua identidade organizadora
								</h2>
								<p className="text-sm text-slate-500">
									Os participantes verão essas informações nos detalhes do evento e nos e-mails.
								</p>
							</header>

							<div className="grid gap-6 md:grid-cols-2">
								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Nome da marca</span>
									<div className="relative">
										<NotebookPen className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
										<input
											type="text"
											value={profileData.name}
											onChange={(event) =>
												setProfileData({ ...profileData, name: event.target.value })
											}
											placeholder="Ex: Experiências Imersivas LTDA"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
											required
										/>
									</div>
								</label>

								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Email de contato</span>
									<div className="relative">
										<Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
										<input
											type="email"
											value={profileData.email}
											onChange={(event) =>
												setProfileData({ ...profileData, email: event.target.value })
											}
											placeholder="contato@suamarca.com"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
											required
										/>
									</div>
								</label>

								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Telefone</span>
									<div className="relative">
										<Phone className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
										<input
											type="tel"
											value={profileData.phone}
											onChange={(event) =>
												setProfileData({ ...profileData, phone: event.target.value })
											}
											placeholder="(00) 00000-0000"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
										/>
									</div>
								</label>

								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Website ou rede social</span>
									<div className="relative">
										<Globe className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
										<input
											type="url"
											value={profileData.website}
											onChange={(event) =>
												setProfileData({ ...profileData, website: event.target.value })
											}
											placeholder="https://suamarca.com"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
										/>
									</div>
								</label>
							</div>

							<label className="space-y-2">
								<span className="text-sm font-semibold text-slate-700">Biografia</span>
								<textarea
									rows={4}
									value={profileData.description}
									onChange={(event) =>
										setProfileData({ ...profileData, description: event.target.value })
									}
									placeholder="Conte em poucas linhas a história da sua marca e o que torna seus eventos inesquecíveis."
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
								/>
							</label>

							<div className="flex flex-col-reverse gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm text-slate-500">
									Atualize com frequência — consistência gera confiança.
								</p>
								<button
									type="submit"
									disabled={savingProfile}
									className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{savingProfile ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Save className="size-4" />
									)}
									Salvar alterações
								</button>
							</div>
						</form>
					)}

					{activeTab === 'pagamentos' && (
						<div className="space-y-6">
							<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
								<div className={`flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r ${statusConfig.accent} px-8 py-6 text-white md:flex-row md:items-center md:justify-between`}>
									<div>
										<h2 className="text-xl font-semibold">{statusConfig.title}</h2>
										<p className="text-sm text-white/80">{statusConfig.description}</p>
									</div>
									<div className="flex items-center gap-3 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
										<BadgeCheck className="size-4" />
										{stripeStatus === 'complete' ? 'Pagamentos liberados' : 'Complete as etapas'}
									</div>
								</div>

								<div className="grid gap-8 p-8 lg:grid-cols-[2fr_1fr]">
									<div className="space-y-6">
										<div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
											<h3 className="text-sm font-semibold text-slate-700">Seu fluxo de pagamentos</h3>
											<ul className="mt-4 space-y-4">
												<li className="flex items-start gap-3">
													<div className="mt-1 flex size-9 items-center justify-center rounded-full bg-white shadow">
														<CreditCard className="size-4 text-purple-600" />
													</div>
													<div>
														<p className="text-sm font-semibold text-slate-800">1. Conecte sua conta Stripe</p>
														<p className="text-sm text-slate-500">
															Preencha os dados obrigatórios e valide a identidade.
														</p>
													</div>
												</li>
												<li className="flex items-start gap-3">
													<div className="mt-1 flex size-9 items-center justify-center rounded-full bg-white shadow">
														<ShieldCheck className="size-4 text-emerald-600" />
													</div>
													<div>
														<p className="text-sm font-semibold text-slate-800">2. Acompanhe a verificação</p>
														<p className="text-sm text-slate-500">
															Receba notificações automáticas sobre pendências e aprovações.
														</p>
													</div>
												</li>
												<li className="flex items-start gap-3">
													<div className="mt-1 flex size-9 items-center justify-center rounded-full bg-white shadow">
														<ArrowRightLeft className="size-4 text-indigo-600" />
													</div>
													<div>
														<p className="text-sm font-semibold text-slate-800">3. Receba automaticamente</p>
														<p className="text-sm text-slate-500">
															Seus repasses acontecem direto na conta Stripe configurada.
														</p>
													</div>
												</li>
											</ul>
										</div>

										<div className="rounded-2xl border border-dashed border-slate-200 p-6">
											<h3 className="text-sm font-semibold text-slate-700">Conexão Stripe</h3>
											<p className="mt-1 text-sm text-slate-500">
												Gerencie o onboarding sempre que precisar revisar informações.
											</p>
											{organizer.id && (
												<StripeOnboardingButton
													organizerId={organizer.id}
													isComplete={stripeStatus === 'complete'}
													className="mt-6 w-full"
												/>
											)}
										</div>
									</div>

									<div className="space-y-5">
										<div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
											<h3 className="text-sm font-semibold text-slate-700">Status da conta</h3>
											<ul className="mt-4 space-y-3 text-sm text-slate-600">
												<li className="flex items-center gap-3">
													<BadgeCheck className="size-4 text-emerald-600" />
													Conta Stripe {organizer.stripe_account_id ? 'criada' : 'não criada'}
												</li>
												<li className="flex items-center gap-3">
													<BadgeCheck className="size-4 text-emerald-600" />
													Pagamentos {organizer.stripe_charges_enabled ? 'habilitados' : 'pendentes'}
												</li>
												<li className="flex items-center gap-3">
													<BadgeCheck className="size-4 text-emerald-600" />
													Saques {organizer.stripe_payouts_enabled ? 'liberados' : 'em análise'}
												</li>
											</ul>
										</div>

										<div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/60 p-6 text-sm text-purple-800">
											<p className="font-semibold">Precisa de ajuda?</p>
											<p className="mt-2">
												Nosso time consegue acompanhar o status do Stripe. Envie um e-mail para suporte citando o ID <strong>{organizer.stripe_account_id || 'pendente'}</strong>.
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</section>

				<aside className="space-y-6">
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
								<Users className="size-6" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-slate-800">Experiência do participante</h3>
								<p className="text-sm text-slate-500">
									Como você se apresenta aqui impacta as conversões dos seus eventos.
								</p>
							</div>
						</div>
					</div>

					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<h3 className="text-sm font-semibold text-slate-800">Checklist rápido</h3>
						<ul className="mt-4 space-y-3 text-sm text-slate-600">
							<li className="flex items-center gap-3">
								<CheckCircle2 className="size-4 text-emerald-600" />
								Logo atualizado e sem fundo?
							</li>
							<li className="flex items-center gap-3">
								<CheckCircle2 className="size-4 text-emerald-600" />
								Biografia com tom profissional?
							</li>
							<li className="flex items-center gap-3">
								<CheckCircle2 className="size-4 text-emerald-600" />
								Links direcionam para canais ativos?
							</li>
						</ul>
					</div>

					<div className="rounded-3xl border border-purple-200 bg-purple-50/70 p-6 shadow-sm text-sm text-purple-900">
						<p className="font-semibold">Dica de especialista</p>
						<p className="mt-2">
							Suas imagens e textos são replicados no checkout e nos e-mails. Manter tudo alinhado ao branding fortalece a confiança do público.
						</p>
					</div>
				</aside>
			</div>
		</div>
	);
}
