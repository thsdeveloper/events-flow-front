'use client';

import { Bell, Search, LogOut, User, ChevronDown } from 'lucide-react';
import type { AuthUser, OrganizerProfile } from '@/lib/auth/server-auth';
import ThemeToggle from '@/components/ui/ThemeToggle';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AdminHeaderProps {
	user: AuthUser;
	organizer: OrganizerProfile;
	title?: string;
}

export default function AdminHeader({ user, organizer, title }: AdminHeaderProps) {
	const router = useRouter();

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});
			router.push('/login');
		} catch (error) {
			console.error('Logout failed:', error);
		}
	};

	const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuário';
	const userInitials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';

	return (
		<header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 border-b border-gray-200 dark:border-gray-800 backdrop-blur-lg">
			<div className="flex items-center justify-between h-16 px-6">
				{/* Left: Page Title or Search */}
				<div className="flex items-center gap-4 flex-1">
					{title && (
						<h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
					)}

					{/* Search Bar */}
					<div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 w-96">
						<Search className="size-5 text-gray-400" />
						<input
							type="text"
							placeholder="Buscar eventos, participantes..."
							className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 w-full"
						/>
					</div>
				</div>

				{/* Right: Actions */}
				<div className="flex items-center gap-3">
					{/* Stripe Status Badge */}
					{organizer.stripe_charges_enabled && organizer.stripe_payouts_enabled ? (
						<div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
							<div className="size-2 rounded-full bg-green-500 animate-pulse" />
							<span className="text-xs font-semibold">Stripe Ativo</span>
						</div>
					) : (
						<div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800">
							<div className="size-2 rounded-full bg-amber-500" />
							<span className="text-xs font-semibold">Stripe Pendente</span>
						</div>
					)}

					{/* Theme Toggle */}
					<ThemeToggle />

					{/* Notifications */}
					<button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
						<Bell className="size-5 text-gray-600 dark:text-gray-400" />
						<span className="absolute top-1 right-1 size-2 bg-red-500 rounded-full" />
					</button>

					{/* User Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none">
							<div className="hidden md:block text-right">
								<p className="text-sm font-semibold text-gray-900 dark:text-white">
									{userName}
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{organizer.name}
								</p>
							</div>
							<div className="size-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
								{userInitials}
							</div>
							<ChevronDown className="size-4 text-gray-500 dark:text-gray-400" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64">
							<div className="p-3">
								<p className="text-sm font-semibold text-gray-900 dark:text-white">
									{userName}
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{user.email}
								</p>
							</div>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/perfil" className="cursor-pointer">
									<User className="mr-2 size-4" />
									<span>Meu Perfil</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/admin/configuracoes" className="cursor-pointer">
									<User className="mr-2 size-4" />
									<span>Configurações</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={handleLogout}
								className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
							>
								<LogOut className="mr-2 size-4" />
								<span>Sair</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
