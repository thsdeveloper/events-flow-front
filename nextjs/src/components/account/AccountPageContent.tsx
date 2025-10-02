'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Building2, Loader2 } from 'lucide-react';
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
			<div className="max-w-7xl mx-auto sm:px-6 flex items-center justify-between p-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className="container mx-auto py-12 px-4 max-w-7xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">Minha Conta</h1>
				<p className="text-muted-foreground mt-2">
					Gerencie suas informações pessoais e de organizador
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-2 mb-8">
					<TabsTrigger value="profile" className="gap-2">
						<User className="h-4 w-4" />
						Perfil Pessoal
					</TabsTrigger>
					<TabsTrigger value="organizer" className="gap-2">
						<Building2 className="h-4 w-4" />
						Perfil Organizador
					</TabsTrigger>
				</TabsList>

				<TabsContent value="profile">
					<Card>
						<CardHeader>
							<CardTitle>Informações Pessoais</CardTitle>
							<CardDescription>
								Atualize suas informações de perfil e dados de contato
							</CardDescription>
						</CardHeader>
						<CardContent>
							<UserProfileForm user={user} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="organizer">
					<Card>
						<CardHeader>
							<CardTitle>Perfil de Organizador</CardTitle>
							<CardDescription>
								Gerencie as informações do seu perfil como organizador de eventos
							</CardDescription>
						</CardHeader>
						<CardContent>
							<OrganizerProfileForm userId={user.id} />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
