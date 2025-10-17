import { ReactNode } from 'react';
import VisualEditingLayout from '@/components/layout/VisualEditingLayout';
import { fetchSiteData } from '@/lib/directus/fetchers';

export default async function PublicLayout({ children }: { children: ReactNode }) {
	const { globals, headerNavigation, footerNavigation } = await fetchSiteData();

	return (
		<VisualEditingLayout
			headerNavigation={headerNavigation}
			footerNavigation={footerNavigation}
			globals={globals}
		>
			<main className="flex-grow">{children}</main>
		</VisualEditingLayout>
	);
}
