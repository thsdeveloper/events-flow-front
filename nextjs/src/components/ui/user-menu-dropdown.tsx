'use client';

import * as React from 'react';
import { User, Heart, HelpCircle, LogOut, LogIn, Ticket, Moon, Sun } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export function UserMenuDropdown() {
	const { user, logout, isLoading } = useServerAuth();
	const { theme, setTheme, resolvedTheme } = useTheme();
	const isDark = theme === 'dark' || resolvedTheme === 'dark';

	if (isLoading) {
		return (
			<div className="flex items-center justify-center size-10 rounded-full bg-gray-300 animate-pulse" />
		);
	}

	if (!user) {
		return (
			<Button
				variant="default"
				size="sm"
				asChild
				className="font-semibold gap-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
			>
				<Link href="/login">
					<LogIn className="size-4" />
					Entrar
				</Link>
			</Button>
		);
	}

	const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuário';
	const userInitials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className="flex items-center justify-center size-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl">
					{userInitials}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<div className="flex items-center gap-3 px-2 py-3">
					<div className="flex items-center justify-center size-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-md">
						{userInitials}
					</div>
					<div className="flex flex-col">
						<span className="text-sm font-semibold">{userName}</span>
						<span className="text-xs text-muted-foreground">{user.email}</span>
					</div>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/perfil" className="cursor-pointer">
						<User className="mr-2 size-4" />
						<span>Minha conta</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/meus-ingressos" className="cursor-pointer">
						<Ticket className="mr-2 size-4" />
						<span>Meus ingressos</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/favoritos" className="cursor-pointer">
						<Heart className="mr-2 size-4" />
						<span>Favoritos</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="cursor-pointer flex items-center justify-between"
					onSelect={(e) => {
						e.preventDefault();
						setTheme(isDark ? 'light' : 'dark');
					}}
				>
					<div className="flex items-center">
						{isDark ? <Moon className="mr-2 size-4" /> : <Sun className="mr-2 size-4" />}
						<span>Modo escuro</span>
					</div>
					<Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/ajuda" className="cursor-pointer">
						<HelpCircle className="mr-2 size-4" />
						<span>Central de Ajuda</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
					<LogOut className="mr-2 size-4" />
					<span>Sair</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
