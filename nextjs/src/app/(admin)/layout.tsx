import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default async function AdminLayout({ children }: { children: ReactNode }) {
	const cookieStore = await cookies();
	const token = cookieStore.get('directus_token');

	if (!token) {
		redirect('/login');
	}

	return (
		<div className="flex h-screen bg-gray-50 dark:bg-gray-900">
			<AdminSidebar />
			<div className="flex flex-col flex-1 overflow-hidden">
				<AdminHeader />
				<main className="flex-1 overflow-y-auto p-6">
					{children}
				</main>
			</div>
		</div>
	);
}
