'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Building2, Loader2, Mail, Camera, Shield, BarChart3 } from 'lucide-react';
import { UserProfileForm } from './UserProfileForm';
import { OrganizerProfileForm } from './OrganizerProfileForm';
import { useRouter } from 'next/navigation';

export function AccountPageContent() {
	const { user, isLoading } = useAuth();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState('profile');

	useEffect(() => {
		if (!isLoading && !user) {
			router.push('/');
		}
	}, [user, isLoading, router]);

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

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
									<p className="text-lg font-semibold text-green-600">Ativo</p>
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
									<p className="text-lg font-semibold">Organizador</p>
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
					<TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 h-12">
						<TabsTrigger value="profile" className="gap-2 text-base">
							<User className="size-4" />
							Perfil Pessoal
						</TabsTrigger>
						<TabsTrigger value="organizer" className="gap-2 text-base">
							<Building2 className="size-4" />
							Organizador
						</TabsTrigger>
					</TabsList>

					<TabsContent value="profile" className="space-y-6">
						<Card className="border-t-4 border-t-primary shadow-lg">
							<CardHeader className="bg-gray-50 dark:bg-gray-800">
								<CardTitle className="flex items-center gap-2">
									<User className="size-5" />
									Informações Pessoais
								</CardTitle>
								<CardDescription>
									Atualize suas informações de perfil e dados de contato
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<UserProfileForm user={user} />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="organizer" className="space-y-6">
						<Card className="border-t-4 border-t-primary shadow-lg">
							<CardHeader className="bg-gray-50 dark:bg-gray-800">
								<CardTitle className="flex items-center gap-2">
									<Building2 className="size-5" />
									Perfil de Organizador
								</CardTitle>
								<CardDescription>
									Gerencie as informações do seu perfil como organizador de eventos
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<OrganizerProfileForm userId={user.id} />
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
