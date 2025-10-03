'use client';

import * as React from 'react';
import { useState } from 'react';
import { User, Heart, Calendar, CalendarCheck, HelpCircle, LogOut, LogIn } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/ui/auth-modal';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export function UserMenuDropdown() {
	const { user, logout, isLoading } = useAuth();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center size-10 rounded-full bg-gray-300 animate-pulse" />
		);
	}

	if (!user) {
		return (
			<>
				<Button
					variant="default"
					size="sm"
					onClick={() => setIsAuthModalOpen(true)}
					className="font-semibold gap-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
				>
					<LogIn className="size-4" />
					Entrar
				</Button>
				<AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
			</>
		);
	}

	const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuário';
	const userInitials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className="flex items-center justify-center size-10 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors">
					{userInitials}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<div className="flex items-center gap-3 px-2 py-3">
					<div className="flex items-center justify-center size-10 rounded-full bg-blue-500 text-white font-semibold">
						{userInitials}
					</div>
					<div className="flex flex-col">
						<span className="text-sm font-semibold">{userName}</span>
						<span className="text-xs text-muted-foreground">{user.email}</span>
					</div>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/account">
						<User className="mr-2 size-4" />
						<span>Minha conta</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Heart className="mr-2 size-4" />
					<span>Favoritos</span>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Calendar className="mr-2 size-4" />
					<span>Criar evento</span>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<CalendarCheck className="mr-2 size-4" />
					<span>Meus eventos</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<HelpCircle className="mr-2 size-4" />
					<span>Central de Ajuda</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={logout}>
					<LogOut className="mr-2 size-4" />
					<span>Sair</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
