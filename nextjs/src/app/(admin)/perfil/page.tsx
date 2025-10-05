'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizer } from '@/hooks/useOrganizer';
import {
	User,
	Mail,
	Save,
	Lock,
	Shield,
	Camera,
	Building2,
	Phone,
	Globe,
	Award,
	TrendingUp,
	Calendar,
	CreditCard,
	Bell,
	Palette,
	Settings,
	Edit3,
	CheckCircle2,
	AlertCircle,
	Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { StripeOnboardingButton } from '@/components/organizer/StripeOnboardingButton';

type TabType = 'pessoal' | 'organizador' | 'configuracoes';

interface OrganizerStats {
	totalEvents: number;
	totalRegistrations: number;
	totalRevenue: number;
}

export default function PerfilPage() {
	const { user, getAccessToken } = useAuth();
	const { organizer, loading: organizerLoading, refetch: refetchOrganizer } = useOrganizer();
	const { toast } = useToast();
	const [activeTab, setActiveTab] = useState<TabType>('pessoal');
	const [saving, setSaving] = useState(false);
	const [stats, setStats] = useState<OrganizerStats>({
		totalEvents: 0,
		totalRegistrations: 0,
		totalRevenue: 0,
	});
	const [loadingStats, setLoadingStats] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Form states
	const [personalData, setPersonalData] = useState({
		first_name: '',
		last_name: '',
		email: '',
	});

	const [organizerData, setOrganizerData] = useState({
		name: '',
		email: '',
		phone: '',
		website: '',
		description: '',
	});

	const [passwordData, setPasswordData] = useState({
		current: '',
		new: '',
		confirm: '',
	});

	// Load user data
	useEffect(() => {
		if (user) {
			setPersonalData({
				first_name: user.first_name || '',
				last_name: user.last_name || '',
				email: user.email || '',
			});
		}
	}, [user]);

	// Load organizer data
	useEffect(() => {
		if (organizer) {
			setOrganizerData({
				name: organizer.name || '',
				email: organizer.email || '',
				phone: organizer.phone || '',
				website: organizer.website || '',
				description: organizer.description || '',
			});
		}
	}, [organizer]);

	// Load stats when organizer is loaded
	useEffect(() => {
		async function fetchStats() {
			if (!organizer?.id) return;

			setLoadingStats(true);
			try {
				const token = getAccessToken();
				const response = await fetch(
					`/api/organizer/stats?organizerId=${organizer.id}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}
				);

				if (response.ok) {
					const data = await response.json();
					setStats(data.stats);
				}
			} catch (error) {
				console.error('Error fetching stats:', error);
			} finally {
				setLoadingStats(false);
			}
		}

		fetchStats();
	}, [organizer?.id, getAccessToken]);

	// Handle Stripe onboarding return
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const setup = params.get('setup');

		if (setup === 'success') {
			// Switch to organizer tab
			setActiveTab('organizador');

			// Show success message
			toast({
				title: 'Configuração concluída!',
				description: 'Sua conta Stripe foi configurada com sucesso. Os webhooks irão atualizar o status em breve.',
			});

			// Refetch organizer data
			refetchOrganizer();

			// Clean up URL
			window.history.replaceState({}, '', '/perfil');
		} else if (setup === 'refresh') {
			// Switch to organizer tab
			setActiveTab('organizador');

			toast({
				title: 'Sessão expirada',
				description: 'Por favor, tente configurar os pagamentos novamente.',
				variant: 'destructive',
			});

			// Clean up URL
			window.history.replaceState({}, '', '/perfil');
		}
	}, [toast, refetchOrganizer]);

	const tabs = [
		{ id: 'pessoal' as const, label: 'Perfil Pessoal', icon: User },
		{ id: 'organizador' as const, label: 'Organizador', icon: Building2 },
		{ id: 'configuracoes' as const, label: 'Configurações', icon: Settings },
	];

	// Handle personal data save
	const handleSavePersonalData = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user?.id) return;

		setSaving(true);
		try {
			const token = getAccessToken();
			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					userId: user.id,
					...personalData,
				}),
			});

			if (response.ok) {
				toast({
					title: 'Sucesso!',
					description: 'Dados pessoais atualizados com sucesso.',
				});
			} else {
				throw new Error('Failed to update profile');
			}
		} catch (error) {
			console.error('Error saving personal data:', error);
			toast({
				title: 'Erro',
				description: 'Erro ao atualizar dados pessoais.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	// Handle organizer data save
	const handleSaveOrganizerData = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user?.id) return;

		setSaving(true);
		try {
			const token = getAccessToken();
			const url = organizer?.id
				? '/api/organizer/profile'
				: '/api/organizer/profile';
			const method = organizer?.id ? 'PATCH' : 'POST';

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(
					organizer?.id
						? { organizerId: organizer.id, ...organizerData }
						: { userId: user.id, ...organizerData }
				),
			});

			if (response.ok) {
				toast({
					title: 'Sucesso!',
					description: 'Perfil de organizador atualizado com sucesso.',
				});
				refetchOrganizer();
			} else {
				throw new Error('Failed to update organizer profile');
			}
		} catch (error) {
			console.error('Error saving organizer data:', error);
			toast({
				title: 'Erro',
				description: 'Erro ao atualizar perfil de organizador.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	// Handle password change
	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user?.id) return;

		if (passwordData.new !== passwordData.confirm) {
			toast({
				title: 'Erro',
				description: 'As senhas não coincidem.',
				variant: 'destructive',
			});
			return;
		}

		if (passwordData.new.length < 8) {
			toast({
				title: 'Erro',
				description: 'A senha deve ter no mínimo 8 caracteres.',
				variant: 'destructive',
			});
			return;
		}

		setSaving(true);
		try {
			const token = getAccessToken();
			const response = await fetch('/api/user/password', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					userId: user.id,
					password: passwordData.new,
				}),
			});

			if (response.ok) {
				toast({
					title: 'Sucesso!',
					description: 'Senha atualizada com sucesso.',
				});
				setPasswordData({ current: '', new: '', confirm: '' });
			} else {
				throw new Error('Failed to update password');
			}
		} catch (error) {
			console.error('Error changing password:', error);
			toast({
				title: 'Erro',
				description: 'Erro ao atualizar senha.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	// Handle logo upload
	const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !organizer?.id) return;

		// Validate file size (5MB)
		if (file.size > 5 * 1024 * 1024) {
			toast({
				title: 'Erro',
				description: 'O arquivo deve ter no máximo 5MB.',
				variant: 'destructive',
			});
			return;
		}

		setSaving(true);
		try {
			const token = getAccessToken();
			const formData = new FormData();
			formData.append('file', file);
			formData.append('organizerId', organizer.id);

			const response = await fetch('/api/organizer/logo', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			if (response.ok) {
				toast({
					title: 'Sucesso!',
					description: 'Logo atualizado com sucesso.',
				});
				refetchOrganizer();
			} else {
				throw new Error('Failed to upload logo');
			}
		} catch (error) {
			console.error('Error uploading logo:', error);
			toast({
				title: 'Erro',
				description: 'Erro ao fazer upload do logo.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	const getLogoUrl = () => {
		if (!organizer?.logo) return null;
		const logoId = typeof organizer.logo === 'string' ? organizer.logo : organizer.logo.id;
		return `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${logoId}`;
	};

	const getStripeStatus = () => {
		if (!organizer) return { status: 'incomplete', color: 'yellow' };

		if (organizer.stripe_charges_enabled && organizer.stripe_payouts_enabled) {
			return { status: 'complete', color: 'green' };
		} else if (organizer.stripe_account_id) {
			return { status: 'pending', color: 'blue' };
		}
		return { status: 'incomplete', color: 'yellow' };
	};

	const stripeStatus = getStripeStatus();

	if (organizerLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<Loader2 className="size-8 animate-spin text-purple-600" />
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Hero Header com Gradiente */}
			<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-1">
				<div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse" />
				<div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-xl p-8">
					<div className="flex flex-col md:flex-row items-start md:items-center gap-6">
						{/* Avatar com Upload */}
						<div className="relative group">
							<div className="size-28 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border-4 border-white/20 shadow-2xl transform transition-transform group-hover:scale-105">
								<User className="size-14 text-white" strokeWidth={1.5} />
							</div>
							<button className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
								<div className="text-center">
									<Camera className="size-6 text-white mx-auto mb-1" />
									<span className="text-xs text-white font-medium">Alterar</span>
								</div>
							</button>
							<div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-green-500 border-4 border-white dark:border-gray-900 shadow-lg" />
						</div>

						{/* Info do Usuário */}
						<div className="flex-1">
							<div className="flex items-start justify-between gap-4">
								<div>
									<h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
										{user?.first_name} {user?.last_name}
									</h1>
									<div className="flex flex-wrap items-center gap-4 text-white/90">
										<div className="flex items-center gap-2">
											<Mail className="size-4" />
											<span className="text-sm">{user?.email}</span>
										</div>
										<div className="flex items-center gap-2">
											<Calendar className="size-4" />
											<span className="text-sm">Membro desde 2025</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Quick Stats */}
						<div className="flex gap-3">
							<div className="bg-white/10 backdrop-blur-xl rounded-xl px-6 py-4 text-center border border-white/20">
								<div className="text-3xl font-bold text-white mb-1">
									{loadingStats ? '...' : stats.totalEvents}
								</div>
								<div className="text-xs text-white/80 font-medium">Eventos</div>
							</div>
							<div className="bg-white/10 backdrop-blur-xl rounded-xl px-6 py-4 text-center border border-white/20">
								<div className="text-3xl font-bold text-white mb-1">
									{loadingStats ? '...' : stats.totalRegistrations}
								</div>
								<div className="text-xs text-white/80 font-medium">Inscritos</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Tabs Navigation */}
			<div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 p-2">
				<div className="flex gap-2">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
								activeTab === tab.id
									? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/30'
									: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
							}`}
						>
							<tab.icon className="size-5" />
							<span className="hidden sm:inline">{tab.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<div className="grid lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{activeTab === 'pessoal' && (
						<>
							{/* Informações Pessoais */}
							<div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
								<div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
										<User className="size-5 text-purple-600" />
										Informações Pessoais
									</h2>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										Mantenha seus dados atualizados
									</p>
								</div>

								<form onSubmit={handleSavePersonalData} className="p-6 space-y-5">
									<div className="grid sm:grid-cols-2 gap-5">
										<div className="space-y-2">
											<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
												Primeiro Nome
											</label>
											<input
												type="text"
												value={personalData.first_name}
												onChange={(e) =>
													setPersonalData({ ...personalData, first_name: e.target.value })
												}
												className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
												placeholder="Seu nome"
											/>
										</div>

										<div className="space-y-2">
											<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
												Sobrenome
											</label>
											<input
												type="text"
												value={personalData.last_name}
												onChange={(e) =>
													setPersonalData({ ...personalData, last_name: e.target.value })
												}
												className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
												placeholder="Seu sobrenome"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
											Email
										</label>
										<div className="relative">
											<Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
											<input
												type="email"
												value={personalData.email}
												onChange={(e) =>
													setPersonalData({ ...personalData, email: e.target.value })
												}
												className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
											/>
										</div>
									</div>

									<div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
										<button
											type="button"
											className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
										>
											Cancelar
										</button>
										<button
											type="submit"
											disabled={saving}
											className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all font-medium disabled:opacity-50"
										>
											{saving ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<Save className="size-4" />
											)}
											Salvar Alterações
										</button>
									</div>
								</form>
							</div>

							{/* Segurança */}
							<div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
								<div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
										<Lock className="size-5 text-red-600" />
										Segurança
									</h2>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										Mantenha sua conta protegida
									</p>
								</div>

								<form onSubmit={handleChangePassword} className="p-6 space-y-5">
									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
											Senha Atual
										</label>
										<div className="relative">
											<Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
											<input
												type="password"
												value={passwordData.current}
												onChange={(e) =>
													setPasswordData({ ...passwordData, current: e.target.value })
												}
												placeholder="Digite sua senha atual"
												className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
											/>
										</div>
									</div>

									<div className="grid sm:grid-cols-2 gap-5">
										<div className="space-y-2">
											<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
												Nova Senha
											</label>
											<input
												type="password"
												value={passwordData.new}
												onChange={(e) =>
													setPasswordData({ ...passwordData, new: e.target.value })
												}
												placeholder="Mínimo 8 caracteres"
												className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
											/>
										</div>

										<div className="space-y-2">
											<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
												Confirmar Senha
											</label>
											<input
												type="password"
												value={passwordData.confirm}
												onChange={(e) =>
													setPasswordData({ ...passwordData, confirm: e.target.value })
												}
												placeholder="Repita a senha"
												className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
											/>
										</div>
									</div>

									<div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
										<button
											type="submit"
											disabled={saving}
											className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all font-medium disabled:opacity-50"
										>
											{saving ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<Shield className="size-4" />
											)}
											Atualizar Senha
										</button>
									</div>
								</form>
							</div>
						</>
					)}

					{activeTab === 'organizador' && (
						<>
							{/* Perfil de Organizador */}
							<div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
								<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
										<Building2 className="size-5 text-blue-600" />
										Perfil de Organizador
									</h2>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										Informações exibidas nos seus eventos
									</p>
								</div>

								<form onSubmit={handleSaveOrganizerData} className="p-6 space-y-5">
									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
											Logo do Organizador
										</label>
										<div className="flex items-center gap-4">
											<div className="size-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
												{getLogoUrl() ? (
													<Image
														src={getLogoUrl()!}
														alt="Logo"
														width={80}
														height={80}
														className="object-cover"
													/>
												) : (
													<Building2 className="size-8 text-gray-400" />
												)}
											</div>
											<div className="flex-1">
												<input
													ref={fileInputRef}
													type="file"
													accept="image/jpeg,image/png"
													onChange={handleLogoUpload}
													className="hidden"
												/>
												<button
													type="button"
													onClick={() => fileInputRef.current?.click()}
													disabled={saving || !organizer?.id}
													className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm font-medium disabled:opacity-50"
												>
													{saving ? (
														<Loader2 className="size-4 animate-spin" />
													) : (
														<Camera className="size-4" />
													)}
													Fazer Upload
												</button>
												<p className="text-xs text-gray-500 mt-2">
													JPG, PNG. Tamanho máximo: 5MB
												</p>
											</div>
										</div>
									</div>

									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
											Nome da Organização
										</label>
										<input
											type="text"
											value={organizerData.name}
											onChange={(e) =>
												setOrganizerData({ ...organizerData, name: e.target.value })
											}
											placeholder="Nome da sua empresa/organização"
											className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
										/>
									</div>

									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
											Email de Contato
										</label>
										<div className="relative">
											<Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
											<input
												type="email"
												value={organizerData.email}
												onChange={(e) =>
													setOrganizerData({ ...organizerData, email: e.target.value })
												}
												placeholder="contato@empresa.com"
												className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
											/>
										</div>
									</div>

									<div className="grid sm:grid-cols-2 gap-5">
										<div className="space-y-2">
											<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
												Telefone
											</label>
											<div className="relative">
												<Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
												<input
													type="tel"
													value={organizerData.phone}
													onChange={(e) =>
														setOrganizerData({ ...organizerData, phone: e.target.value })
													}
													placeholder="(00) 0000-0000"
													className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
												/>
											</div>
										</div>

										<div className="space-y-2">
											<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
												Website
											</label>
											<div className="relative">
												<Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
												<input
													type="url"
													value={organizerData.website}
													onChange={(e) =>
														setOrganizerData({ ...organizerData, website: e.target.value })
													}
													placeholder="www.seusite.com"
													className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
												/>
											</div>
										</div>
									</div>

									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
											Descrição
										</label>
										<textarea
											rows={4}
											value={organizerData.description}
											onChange={(e) =>
												setOrganizerData({ ...organizerData, description: e.target.value })
											}
											placeholder="Conte sobre sua organização e o que você faz..."
											className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none placeholder:text-gray-400"
										/>
									</div>

									<div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
										<button
											type="button"
											className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
										>
											Cancelar
										</button>
										<button
											type="submit"
											disabled={saving}
											className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium disabled:opacity-50"
										>
											{saving ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<Save className="size-4" />
											)}
											Salvar Perfil
										</button>
									</div>
								</form>
							</div>

							{/* Status Stripe */}
							<div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
								<div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
										<CreditCard className="size-5 text-emerald-600" />
										Pagamentos
									</h2>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										Configure sua conta para receber pagamentos
									</p>
								</div>

								<div className="p-6">
									{stripeStatus.status === 'incomplete' && (
										<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4">
											<div className="flex gap-3">
												<AlertCircle className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
												<div>
													<h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
														Cadastro Incompleto
													</h3>
													<p className="text-sm text-yellow-800 dark:text-yellow-300">
														Complete o cadastro no Stripe para começar a receber pagamentos por
														eventos.
													</p>
												</div>
											</div>
										</div>
									)}

									{stripeStatus.status === 'complete' && (
										<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
											<div className="flex gap-3">
												<CheckCircle2 className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
												<div>
													<h3 className="font-semibold text-green-900 dark:text-green-200 mb-1">
														Conta Configurada
													</h3>
													<p className="text-sm text-green-800 dark:text-green-300">
														Sua conta Stripe está pronta para receber pagamentos!
													</p>
												</div>
											</div>
										</div>
									)}

									{organizer?.id && (
										<StripeOnboardingButton
											organizerId={organizer.id}
											isComplete={stripeStatus.status === 'complete'}
											className="w-full"
										/>
									)}
								</div>
							</div>
						</>
					)}

					{activeTab === 'configuracoes' && (
						<>
							{/* Notificações */}
							<div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
								<div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
										<Bell className="size-5 text-violet-600" />
										Notificações
									</h2>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										Gerencie como você recebe notificações
									</p>
								</div>

								<div className="p-6 space-y-4">
									{[
										{
											label: 'Novas inscrições em eventos',
											description: 'Receba alertas quando alguém se inscrever',
										},
										{
											label: 'Atualizações de eventos',
											description: 'Notificações sobre mudanças nos seus eventos',
										},
										{
											label: 'Lembretes de eventos',
											description: 'Lembrete antes do início dos eventos',
										},
										{
											label: 'Mensagens e comentários',
											description: 'Quando alguém comentar ou enviar mensagem',
										},
									].map((item, idx) => (
										<div
											key={idx}
											className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
										>
											<div>
												<div className="font-medium text-gray-900 dark:text-white">
													{item.label}
												</div>
												<div className="text-sm text-gray-600 dark:text-gray-400">
													{item.description}
												</div>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
												<input type="checkbox" className="sr-only peer" defaultChecked />
												<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
											</label>
										</div>
									))}
								</div>
							</div>

							{/* Preferências */}
							<div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
								<div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
										<Palette className="size-5 text-pink-600" />
										Preferências
									</h2>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										Personalize sua experiência
									</p>
								</div>

								<div className="p-6 space-y-5">
									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
											Idioma
										</label>
										<select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
											<option>Português (Brasil)</option>
											<option>English</option>
											<option>Español</option>
										</select>
									</div>

									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
											Fuso Horário
										</label>
										<select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
											<option>America/Sao_Paulo (GMT-3)</option>
											<option>America/New_York (GMT-5)</option>
											<option>Europe/London (GMT+0)</option>
										</select>
									</div>

									<div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
										<button
											type="submit"
											className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/30 transition-all font-medium"
										>
											<Save className="size-4" />
											Salvar Preferências
										</button>
									</div>
								</div>
							</div>
						</>
					)}
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Status Badge */}
					<div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
						<div className="flex items-center gap-3 mb-3">
							<div className="size-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
								<CheckCircle2 className="size-6" />
							</div>
							<div>
								<div className="text-sm font-medium opacity-90">Status</div>
								<div className="text-xl font-bold">Ativo</div>
							</div>
						</div>
						<p className="text-sm text-white/80">
							Sua conta está ativa e pronta para criar eventos incríveis!
						</p>
					</div>

					{/* Estatísticas */}
					<div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<TrendingUp className="size-4 text-purple-600" />
							Suas Estatísticas
						</h3>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
										{loadingStats ? '...' : stats.totalEvents}
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-400">Eventos Criados</div>
								</div>
								<Award className="size-8 text-purple-200 dark:text-purple-900" />
							</div>

							<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
											{loadingStats ? '...' : stats.totalRegistrations}
										</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">Participantes</div>
									</div>
									<User className="size-8 text-blue-200 dark:text-blue-900" />
								</div>
							</div>

							<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
											{loadingStats
												? '...'
												: new Intl.NumberFormat('pt-BR', {
														style: 'currency',
														currency: 'BRL',
												  }).format(stats.totalRevenue / 100)}
										</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">Receita Total</div>
									</div>
									<TrendingUp className="size-8 text-emerald-200 dark:text-emerald-900" />
								</div>
							</div>
						</div>
					</div>

					{/* Quick Actions */}
					<div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
							Ações Rápidas
						</h3>
						<div className="space-y-3">
							<button className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all text-left border border-gray-200 dark:border-gray-700">
								<Edit3 className="size-5 text-purple-600" />
								<span className="text-sm font-medium text-gray-900 dark:text-white">
									Editar Perfil Público
								</span>
							</button>
							<button className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all text-left border border-gray-200 dark:border-gray-700">
								<CreditCard className="size-5 text-blue-600" />
								<span className="text-sm font-medium text-gray-900 dark:text-white">
									Ver Pagamentos
								</span>
							</button>
							<button className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all text-left border border-gray-200 dark:border-gray-700">
								<Award className="size-5 text-amber-600" />
								<span className="text-sm font-medium text-gray-900 dark:text-white">Conquistas</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
