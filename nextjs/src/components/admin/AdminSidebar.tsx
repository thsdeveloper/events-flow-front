'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	LayoutDashboard,
	Calendar,
	Users,
	BarChart3,
	Settings,
	ChevronLeft,
	ChevronRight,
	Building2,
	Ticket,
	UserCog,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { OrganizerProfile } from '@/lib/auth/server-auth';

interface AdminSidebarProps {
	organizer: OrganizerProfile;
}

const navigationItems = [
	{
		name: 'Dashboard',
		href: '/admin/dashboard',
		icon: LayoutDashboard,
	},
	{
		name: 'Eventos',
		href: '/admin/eventos',
		icon: Calendar,
	},
	{
		name: 'Ingressos',
		href: '/admin/ingressos',
		icon: Ticket,
	},
	{
		name: 'Participantes',
		href: '/admin/participantes',
		icon: Users,
	},
	{
		name: 'Análises',
		href: '/admin/analises',
		icon: BarChart3,
	},
	{
		name: 'Configurações',
		href: '/admin/configuracoes',
		icon: Settings,
	},
	{
		name: 'Minha Conta',
		href: '/admin/minha-conta',
		icon: UserCog,
	},
];

export default function AdminSidebar({ organizer }: AdminSidebarProps) {
	const pathname = usePathname();
	const [isCollapsed, setIsCollapsed] = useState(false);

	const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

	return (
		<aside
			className={cn(
				'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800',
				isCollapsed ? 'w-20' : 'w-64',
			)}
		>
			{/* Sidebar Header */}
			<div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
				<Link href="/admin/dashboard" className="flex items-center gap-3 min-w-0">
					<div className="flex-shrink-0 size-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
						<Building2 className="size-6 text-white" />
					</div>
					{!isCollapsed && (
						<div className="flex flex-col min-w-0 flex-1">
							<span className="text-sm font-bold text-gray-900 dark:text-white truncate">
								{organizer.name}
							</span>
							<span className="text-xs text-gray-500 dark:text-gray-400">Organizador</span>
						</div>
					)}
				</Link>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
				{navigationItems.map((item) => {
					const Icon = item.icon;
					const active = isActive(item.href);

					return (
						<Link
							key={item.name}
							href={item.href}
							className={cn(
								'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
								active
									? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
									: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
								isCollapsed && 'justify-center',
							)}
							title={isCollapsed ? item.name : undefined}
						>
							<Icon
								className={cn(
									'size-5 flex-shrink-0',
									active ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400',
								)}
							/>
							{!isCollapsed && (
								<span className="text-sm font-medium truncate">{item.name}</span>
							)}
						</Link>
					);
				})}
			</nav>

			{/* Collapse Toggle */}
			<div className="p-3 border-t border-gray-200 dark:border-gray-800">
				<button
					onClick={() => setIsCollapsed(!isCollapsed)}
					className={cn(
						'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
						'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
						isCollapsed && 'justify-center',
					)}
					title={isCollapsed ? 'Expandir' : 'Colapsar'}
				>
					{isCollapsed ? (
						<ChevronRight className="size-5 text-gray-500 dark:text-gray-400" />
					) : (
						<>
							<ChevronLeft className="size-5 text-gray-500 dark:text-gray-400" />
							<span className="text-sm font-medium">Colapsar</span>
						</>
					)}
				</button>
			</div>
		</aside>
	);
}
