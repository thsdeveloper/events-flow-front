'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	Bell,
	Calendar,
	Clock,
	Heart,
	Loader2,
	Lock,
	Mail,
	Palette,
	Phone,
	Save,
	ShieldCheck,
	Ticket,
	User,
} from 'lucide-react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useToast } from '@/hooks/use-toast';

type Tab = 'perfil' | 'preferencias';

interface PersonalData {
	first_name: string;
	last_name: string;
	email: string;
}

interface PasswordData {
	current: string;
	new: string;
	confirm: string;
}

const quickHighlights = [
	{
		title: 'Ingressos ativos',
		value: '0',
		caption: 'Veja seus próximos eventos',
		icon: Ticket,
	},
	{
		title: 'Eventos favoritados',
		value: '—',
		caption: 'Salve eventos para lembrar depois',
		icon: Heart,
	},
	{
		title: 'Comunidade',
		value: 'Em breve',
		caption: 'Experiências recomendadas para você',
		icon: Bell,
	},
];

const notificationPreferences = [
	{
		label: 'Novas compras e recibos',
		description: 'Receba confirmações instantâneas por e-mail e push.',
	},
	{
		label: 'Lembretes de evento',
		description: 'Alertas alguns dias antes do evento começar.',
	},
	{
		label: 'Recomendações personalizadas',
		description: 'Sugestões com base nos eventos que você curtiu.',
	},
	{
		label: 'Ofertas e novidades',
		description: 'Primeiro acesso a promoções e experiências exclusivas.',
	},
];

const timezones = [
	'America/Sao_Paulo (GMT-3)',
	'America/New_York (GMT-5)',
	'Europe/London (GMT+0)',
	'Europe/Lisbon (GMT+0)',
	'Asia/Tokyo (GMT+9)',
];

export default function PerfilPage() {
	const { user } = useServerAuth();
	const { toast } = useToast();
	const [activeTab, setActiveTab] = useState<Tab>('perfil');
	const [profileSaving, setProfileSaving] = useState(false);
	const [passwordSaving, setPasswordSaving] = useState(false);
	const [personalData, setPersonalData] = useState<PersonalData>({
		first_name: '',
		last_name: '',
		email: '',
	});
	const [passwordData, setPasswordData] = useState<PasswordData>({
		current: '',
		new: '',
		confirm: '',
	});

	useEffect(() => {
		if (!user) {

			return;
		}

		setPersonalData({
			first_name: user.first_name || '',
			last_name: user.last_name || '',
			email: user.email || '',
		});
	}, [user]);

	const memberSinceLabel = useMemo(() => {
		// DirectusUser doesn't track date_created, so show generic message
		return 'Membro ativo';
	}, []);

	const handleSavePersonalData = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!user?.id) {

			return;
		}

		setProfileSaving(true);
		try {
			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user.id,
					...personalData,
				}),
			});

			if (!response.ok) {

				throw new Error('Failed to update profile');
			}

			toast({
				title: 'Perfil atualizado',
				description: 'Suas informações foram salvas com sucesso.',
			});
		} catch (error) {
			console.error('Error saving personal data:', error);
			toast({
				title: 'Não foi possível salvar',
				description: 'Tente novamente em instantes.',
				variant: 'destructive',
			});
		} finally {
			setProfileSaving(false);
		}
	};

	const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!user?.id) {

			return;
		}

		if (passwordData.new !== passwordData.confirm) {
			toast({
				title: 'As senhas não conferem',
				description: 'Digite a mesma senha nos dois campos de confirmação.',
				variant: 'destructive',
			});

			return;
		}

		if (passwordData.new.length < 8) {
			toast({
				title: 'Senha muito curta',
				description: 'Use pelo menos 8 caracteres para garantir sua segurança.',
				variant: 'destructive',
			});

			return;
		}

		setPasswordSaving(true);
		try {
			const response = await fetch('/api/user/password', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user.id,
					password: passwordData.new,
				}),
			});

			if (!response.ok) {

				throw new Error('Failed to update password');
			}

			setPasswordData({ current: '', new: '', confirm: '' });
			toast({
				title: 'Senha alterada',
				description: 'Use a nova senha no próximo acesso.',
			});
		} catch (error) {
			console.error('Error changing password:', error);
			toast({
				title: 'Não foi possível atualizar',
				description: 'Verifique a senha atual e tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setPasswordSaving(false);
		}
	};

	return (
		<div className="max-w-7xl mx-auto space-y-8">
			<section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-1 shadow-xl">
				<div className="absolute inset-0 bg-white/10" />
				<div className="relative rounded-[22px] bg-slate-950/80 p-8 lg:p-10">
					<div className="grid gap-8 lg:grid-cols-[auto,1fr] lg:items-center">
						<div className="flex items-center gap-6">
							<div className="relative">
								<div className="size-24 rounded-2xl border border-white/30 bg-white/10 backdrop-blur flex items-center justify-center text-white">
									<User className="size-12" strokeWidth={1.5} />
								</div>
								<div className="absolute -bottom-2 -right-2 rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm">
									Conta ativa
								</div>
							</div>
							<div className="space-y-2">
								<h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
									{personalData.first_name || 'Cliente'} {personalData.last_name}
								</h1>
								<p className="text-sm text-white/80">
									{personalData.email || 'complete seu e-mail para começar'}
								</p>
								<p className="text-sm text-white/70">{memberSinceLabel}</p>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-3">
					{quickHighlights.map((item) => {
						const Icon = item.icon;

						return (
									<div
										key={item.title}
										className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur"
									>
										<Icon className="size-5 text-white/80" />
										<div className="mt-4 text-2xl font-semibold">{item.value}</div>
										<p className="text-sm text-white/80">{item.title}</p>
										<p className="mt-1 text-xs text-white/60">{item.caption}</p>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</section>

			<nav className="flex flex-wrap gap-3">
			{[
				{ id: 'perfil' as const, label: 'Informações Pessoais', icon: User },
				{ id: 'preferencias' as const, label: 'Segurança & Preferências', icon: ShieldCheck },
			].map((tab) => {
				const Icon = tab.icon;
				const isActive = activeTab === tab.id;

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
							onSubmit={handleSavePersonalData}
							className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
						>
							<header className="space-y-2">
								<h2 className="text-xl font-semibold text-slate-900">Dados pessoais</h2>
								<p className="text-sm text-slate-500">
									Essas informações são usadas em seus ingressos, recibos e comunicações.
								</p>
							</header>

							<div className="grid gap-6 md:grid-cols-2">
								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Nome</span>
									<input
										type="text"
										value={personalData.first_name}
										onChange={(event) =>
											setPersonalData({ ...personalData, first_name: event.target.value })
										}
										placeholder="Seu primeiro nome"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
										required
									/>
								</label>

								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Sobrenome</span>
									<input
										type="text"
										value={personalData.last_name}
										onChange={(event) =>
											setPersonalData({ ...personalData, last_name: event.target.value })
										}
										placeholder="Sobrenome para recibos"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
										required
									/>
								</label>

								<label className="space-y-2 md:col-span-2">
									<span className="text-sm font-semibold text-slate-700">E-mail</span>
									<div className="relative">
										<Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
										<input
											type="email"
											value={personalData.email}
											onChange={(event) =>
												setPersonalData({ ...personalData, email: event.target.value })
											}
											placeholder="nome@email.com"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
											required
										/>
									</div>
								</label>
							</div>

							<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-600">
								<p className="font-medium text-slate-700">Dica</p>
								<p className="mt-1">
									Use um e-mail que você acessa diariamente — é por lá que enviamos seus ingressos e atualizações.
								</p>
							</div>

							<div className="flex flex-col-reverse gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm text-slate-500">
									Seus dados ficam seguros e não são compartilhados sem sua autorização.
								</p>
								<button
									type="submit"
									disabled={profileSaving}
									className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{profileSaving ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Save className="size-4" />
									)}
									Salvar alterações
								</button>
							</div>
						</form>
					)}

					{activeTab === 'preferencias' && (
						<div className="space-y-6">
							<form
								onSubmit={handleChangePassword}
								className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
							>
								<header className="space-y-2">
									<h2 className="text-xl font-semibold text-slate-900">Segurança da conta</h2>
									<p className="text-sm text-slate-500">
										Mantenha sua senha forte e exclusiva para esta plataforma.
								</p>
								</header>

								<div className="grid gap-6 md:grid-cols-2">
									<label className="space-y-2 md:col-span-2">
										<span className="text-sm font-semibold text-slate-700">Senha atual</span>
										<div className="relative">
											<Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
											<input
												type="password"
												value={passwordData.current}
												onChange={(event) =>
												setPasswordData({ ...passwordData, current: event.target.value })
											}
												placeholder="••••••••"
												className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
												required
											/>
										</div>
									</label>

									<label className="space-y-2">
										<span className="text-sm font-semibold text-slate-700">Nova senha</span>
										<input
											type="password"
											value={passwordData.new}
											onChange={(event) =>
											setPasswordData({ ...passwordData, new: event.target.value })
											}
											placeholder="Escolha uma senha forte"
											className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
											required
										/>
								</label>

								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Confirmar senha</span>
									<input
										type="password"
										value={passwordData.confirm}
										onChange={(event) =>
											setPasswordData({ ...passwordData, confirm: event.target.value })
										}
										placeholder="Repita a nova senha"
										className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
										required
									/>
								</label>
							</div>

							<div className="flex flex-col-reverse gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm text-slate-500">
									Por segurança, faça logout em dispositivos compartilhados após alterar sua senha.
								</p>
								<button
									type="submit"
									disabled={passwordSaving}
									className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-slate-600/30 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{passwordSaving ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Lock className="size-4" />
									)}
									Atualizar senha
								</button>
							</div>
						</form>

							<div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
								<header className="space-y-2">
									<h2 className="text-xl font-semibold text-slate-900">Preferências</h2>
									<p className="text-sm text-slate-500">
										Personalize como quer receber novidades e selecionar sua zona de horário.
								</p>
							</header>

							<div className="space-y-4">
								{notificationPreferences.map((item) => (
									<div
										key={item.label}
										className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 p-4"
									>
										<div>
											<p className="text-sm font-semibold text-slate-800">{item.label}</p>
											<p className="text-sm text-slate-500">{item.description}</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input type="checkbox" defaultChecked className="peer sr-only" />
											<div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-purple-600">
												<span className="absolute top-[4px] left-[4px] size-4 rounded-full bg-white transition peer-checked:translate-x-5" />
											</div>
										</label>
									</div>
								))}
							</div>

							<div className="grid gap-6 md:grid-cols-2">
								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Tema do aplicativo</span>
									<div className="flex gap-3">
										<button className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-purple-500 hover:text-purple-600">
											<Palette className="mr-2 inline size-4 text-purple-500" />
											Automático
										</button>
										<button className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-purple-500 hover:text-purple-600">
											Sol
										</button>
										<button className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-purple-500 hover:text-purple-600">
											Lua
										</button>
									</div>
								</label>

								<label className="space-y-2">
									<span className="text-sm font-semibold text-slate-700">Fuso horário</span>
									<div className="relative">
										<Clock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
										<select className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200">
											{timezones.map((timezone) => (
												<option key={timezone}>{timezone}</option>
											))}
										</select>
									</div>
								</label>
							</div>
						</div>
						</div>
					)}
				</section>

				<aside className="space-y-6">
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<h3 className="text-sm font-semibold text-slate-800">Ajuda rápida</h3>
						<p className="mt-3 text-sm text-slate-500">
							Precisa ver seus ingressos? Procure o e-mail com assunto <strong>"Seu ingresso chegou"</strong> ou fale com nosso suporte.
						</p>
						<button className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-purple-500 hover:text-purple-600">
							<ShieldCheck className="size-4" />
							Central de suporte
						</button>
					</div>

					<div className="rounded-3xl border border-purple-200 bg-purple-50 p-6 shadow-sm text-sm text-purple-900">
						<h3 className="text-sm font-semibold">Melhore suas recomendações</h3>
						<p className="mt-2">
							Comece a favoritar eventos que você curtir — nós notificamos quando novas experiências parecidas abrirem vendas.
						</p>
					</div>

					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<h3 className="text-sm font-semibold text-slate-800">Resumo rápido</h3>
						<ul className="mt-4 space-y-3 text-sm text-slate-600">
							<li className="flex items-center gap-3">
								<Calendar className="size-4 text-purple-500" />
								Programe-se com lembretes personalizados
							</li>
							<li className="flex items-center gap-3">
								<Phone className="size-4 text-purple-500" />
								Atualize seu contato para receber notificações por SMS
							</li>
							<li className="flex items-center gap-3">
								<Bell className="size-4 text-purple-500" />
								Gerencie todas as preferências em um só lugar
							</li>
						</ul>
					</div>
				</aside>
			</div>
		</div>
	);
}
