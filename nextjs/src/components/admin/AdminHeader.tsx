'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Bell, User } from 'lucide-react';

export default function AdminHeader() {
	const { user } = useAuth();

	return (
		<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
			<div className="flex items-center justify-between px-6 py-4">
				<div className="flex-1">
					{/* Breadcrumb ou título da página pode ir aqui */}
				</div>

				<div className="flex items-center gap-4">
					{/* Notificações */}
					<button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
						<Bell className="size-5 text-gray-600 dark:text-gray-400" />
					</button>

					{/* User info */}
					<div className="flex items-center gap-3">
						<div className="text-right">
							<p className="text-sm font-medium text-gray-900 dark:text-white">
								{user?.first_name} {user?.last_name}
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{user?.email}
							</p>
						</div>
						<div className="size-10 rounded-full bg-accent flex items-center justify-center">
							<User className="size-5 text-accent-foreground" />
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
