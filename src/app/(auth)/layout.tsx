import { ReactNode } from 'react';
import { fetchSiteData } from '@/lib/directus/fetchers';

export default async function AuthLayout({ children }: { children: ReactNode }) {
	const { globals } = await fetchSiteData();

	return (
		<div className="min-h-screen w-full" data-globals={JSON.stringify(globals)}>
			{children}
		</div>
	);
}
