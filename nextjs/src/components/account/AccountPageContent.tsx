'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Building2, Loader2, Mail, Camera, Shield, BarChart3, CheckCircle2, AlertTriangle } from 'lucide-react';
import { UserProfileForm } from './UserProfileForm';
import { OrganizerProfileForm } from './OrganizerProfileForm';
import { OrganizerRequestCard } from './OrganizerRequestCard';
import { useRouter, useSearchParams } from 'next/navigation';

export function AccountPageContent() {
	const {
		user,
		isLoading,
		isOrganizer,
		hasPendingOrganizerRequest,
		organizerStatus,
		refresh,
	} = useServerAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [activeTab, setActiveTab] = useState('profile');

	const setupStatus = searchParams.get('setup');
	const isSetupSuccess = setupStatus === 'success';
	const isSetupRefresh = setupStatus === 'refresh';

	useEffect(() => {
		if (!isLoading && !user) {
			router.push('/');
		}
	}, [user, isLoading, router]);

	// Auto-switch to organizer tab when returning from Stripe
	useEffect(() => {
		if (setupStatus && activeTab !== 'organizer') {
			setActiveTab('organizer');
		}
	}, [setupStatus]);

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

	const accountTypeLabel = isOrganizer ? 'Organizador' : 'Comprador';
	const accountTypeDescription = isOrganizer
		? 'Gerencia eventos e compras'
		: hasPendingOrganizerRequest
			? 'Solicitação de organizador em análise'
			: 'Compra ingressos e acessa eventos';
	const organizerStatusLabel = organizerStatus
		? organizerStatus === 'active'
			? 'Organizador ativo'
			: organizerStatus === 'pending'
				? 'Solicitação pendente'
				: `Status: ${organizerStatus}`
		: 'Sem cadastro de organizador';
	const organizerStatusColor = organizerStatus === 'pending'
		? 'text-amber-600'
		: organizerStatus === 'active'
			? 'text-green-600'
			: 'text-muted-foreground';

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				{/* Stripe Setup Messages */}
				{isSetupSuccess && (
					<div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 mb-6 shadow-sm">
						<div className="flex gap-4">
							<CheckCircle2 className="size-6 text-green-600 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-green-900 mb-1">
									Cadastro Stripe Concluído!
								</h3>
								<p className="text-green-700">
									Sua conta foi configurada com sucesso. Os dados serão atualizados em alguns
									instantes e você já pode criar eventos pagos.
								</p>
							</div>
						</div>
					</div>
				)}

				{isSetupRefresh && (
					<div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6 mb-6 shadow-sm">
						<div className="flex gap-4">
							<AlertTriangle className="size-6 text-amber-600 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-amber-900 mb-1">
									Cadastro Não Concluído
								</h3>
								<p className="text-amber-700">
									Você saiu antes de completar o cadastro no Stripe. Clique novamente no botão
									"Configurar Pagamentos" para continuar de onde parou.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Header Section */}
				<div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 mb-8 text-white shadow-lg">
					<div className="flex flex-col md:flex-row md:items-center gap-6">
						<div className="relative group">
							<div className="size-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 shadow-xl">
								<User className="size-12" />
							</div>
							<button
								className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
								aria-label="Alterar foto"
							>
								<Camera className="size-6" />
							</button>
						</div>
						<div className="flex-1">
							<h1 className="text-3xl font-bold mb-2">
								{user.first_name} {user.last_name}
							</h1>
							<p className="text-white/90 flex items-center gap-2 text-lg">
								<Mail className="size-4" />
								{user.email}
							</p>
						</div>
					<div className="flex gap-4">
						<div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
							<div className="text-3xl font-bold">0</div>
							<div className="text-sm text-white/80">Eventos</div>
						</div>
						<div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
							<div className="text-3xl font-bold">0</div>
							<div className="text-sm text-white/80">Inscritos</div>
						</div>
					</div>
					</div>
				</div>

				{/* Quick Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<Card className="hover:shadow-lg transition-shadow">
						<CardContent className="pt-6">
							<div className="flex items-center gap-4">
								<div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
									<Shield className="size-6 text-primary" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Status da Conta</p>
									<p className={`text-lg font-semibold ${organizerStatusColor}`}>
										{organizerStatusLabel}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="hover:shadow-lg transition-shadow">
						<CardContent className="pt-6">
							<div className="flex items-center gap-4">
								<div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
									<Building2 className="size-6 text-primary" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Tipo de Conta</p>
									<p className="text-lg font-semibold">{accountTypeLabel}</p>
									<p className="text-xs text-muted-foreground mt-1">{accountTypeDescription}</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="hover:shadow-lg transition-shadow">
						<CardContent className="pt-6">
							<div className="flex items-center gap-4">
								<div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
									<BarChart3 className="size-6 text-primary" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Membro desde</p>
									<p className="text-lg font-semibold">2025</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Tabs Section */}
				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full max-w-xl mx-auto grid-cols-2 mb-8 h-14 bg-white dark:bg-gray-800 shadow-md border">
						<TabsTrigger
							value="profile"
							className="gap-2 text-base data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
						>
							<User className="size-5" />
							Perfil Pessoal
						</TabsTrigger>
						<TabsTrigger
							value="organizer"
							className="gap-2 text-base data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
						>
							<Building2 className="size-5" />
							Organizador
						</TabsTrigger>
					</TabsList>

					<TabsContent value="profile" className="space-y-6 animate-in fade-in-50 duration-300">
						<Card className="border-t-4 border-t-primary shadow-xl hover:shadow-2xl transition-shadow">
							<CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
								<CardTitle className="flex items-center gap-3 text-2xl">
									<div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
										<User className="size-5 text-primary" />
									</div>
									Informações Pessoais
								</CardTitle>
								<CardDescription className="text-base">
									Atualize suas informações de perfil e dados de contato
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-8">
								<UserProfileForm user={user} />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="organizer" className="space-y-6 animate-in fade-in-50 duration-300">
						{isOrganizer ? (
							<Card className="border-t-4 border-t-primary shadow-xl hover:shadow-2xl transition-shadow">
								<CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
									<CardTitle className="flex items-center gap-3 text-2xl">
										<div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
											<Building2 className="size-5 text-primary" />
										</div>
										Área do Organizador
									</CardTitle>
									<CardDescription className="text-base">
										Gerencie as informações do seu perfil como organizador e configure pagamentos
									</CardDescription>
								</CardHeader>
								<CardContent className="pt-8">
									<OrganizerProfileForm userId={user.id} />
								</CardContent>
							</Card>
						) : (
								<OrganizerRequestCard
									user={user}
									hasPendingRequest={hasPendingOrganizerRequest}
									organizerStatus={organizerStatus}
									onSubmitted={refresh}
								/>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
