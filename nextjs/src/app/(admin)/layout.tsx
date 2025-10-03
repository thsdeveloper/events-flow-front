'use client';

import { ReactNode } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<ProtectedRoute>
			<div className="flex h-screen bg-gray-50 dark:bg-gray-900">
				<AdminSidebar />
				<div className="flex flex-col flex-1 overflow-hidden">
					<AdminHeader />
					<main className="flex-1 overflow-y-auto p-6">
						{children}
					</main>
				</div>
			</div>
		</ProtectedRoute>
	);
}
