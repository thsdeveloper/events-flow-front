'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const menuItems = [
	{
		name: 'Dashboard',
		href: '/dashboard',
		icon: LayoutDashboard,
	},
	{
		name: 'Eventos',
		href: '/admin-eventos',
		icon: Calendar,
	},
	{
		name: 'Perfil',
		href: '/perfil',
		icon: Users,
	},
];

export default function AdminSidebar() {
	const pathname = usePathname();
	const { logout } = useAuth();

	return (
		<aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
			<div className="flex flex-col h-full">
				{/* Logo */}
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<h1 className="text-xl font-bold text-gray-900 dark:text-white">
						Admin Eventos
					</h1>
				</div>

				{/* Menu */}
				<nav className="flex-1 p-4 space-y-1">
					{menuItems.map((item) => {
						const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
									isActive
										? 'bg-accent text-accent-foreground'
										: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
								)}
							>
								<Icon className="size-5" />
								<span className="font-medium">{item.name}</span>
							</Link>
						);
					})}
				</nav>

				{/* Logout */}
				<div className="p-4 border-t border-gray-200 dark:border-gray-700">
					<button
						onClick={() => logout()}
						className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					>
						<LogOut className="size-5" />
						<span className="font-medium">Sair</span>
					</button>
				</div>
			</div>
		</aside>
	);
}
