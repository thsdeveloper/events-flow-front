import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { requireOrganizer } from '@/lib/auth/server-auth';
import React from "react";

/**
 * Admin Area Layout (Server Component)
 *
 * Protected area exclusively for organizers to manage events
 * Regular users are automatically redirected to their profile
 */
export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// ⭐ SSR Authentication - validates organizer role
	const { user, organizer } = await requireOrganizer();

	return (
		<ReactQueryProvider>
			<div className="min-h-screen bg-gray-50 dark:bg-slate-950">
				{/* Sidebar */}
				<AdminSidebar organizer={organizer} />

				{/* Main Content Area */}
				<div className="lg:pl-64 transition-all duration-300">
					{/* Header */}
					<AdminHeader user={user} organizer={organizer} />

					{/* Page Content */}
					<main className="p-6">
						<div className="mx-auto">
							{children}
						</div>
					</main>
				</div>
			</div>
		</ReactQueryProvider>
	);
}
