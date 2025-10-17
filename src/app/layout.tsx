import '@/styles/globals.css';
import '@/styles/fonts.css';
import { ReactNode } from 'react';
import { Metadata } from 'next';

import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { ToastConfig } from '@/components/ToastConfig';
import { AuthProvider } from '@/contexts/AuthContext';
import { fetchSiteData } from '@/lib/directus/fetchers';
import { getDirectusAssetURL } from '@/lib/directus/directus-utils';

export async function generateMetadata(): Promise<Metadata> {
	const { globals } = await fetchSiteData();

	const siteTitle = globals?.title || 'Simple CMS';
	const siteDescription = globals?.description || 'A starter CMS template powered by Next.js and Directus.';
	const faviconURL = globals?.favicon ? getDirectusAssetURL(globals.favicon) : '/favicon.ico';

	return {
		title: {
			default: siteTitle,
			template: `%s | ${siteTitle}`,
		},
		description: siteDescription,
		icons: {
			icon: faviconURL,
		},
	};
}

export default async function RootLayout({ children }: { children: ReactNode }) {
	const { globals } = await fetchSiteData();
	const accentColor = globals?.accent_color || '#6644ff';

	return (
		<html lang="en" style={{ '--accent-color': accentColor } as React.CSSProperties} suppressHydrationWarning>
			<body className="antialiased font-sans flex flex-col min-h-screen">
				<ThemeProvider>
					<AuthProvider>
						<ToastConfig />
						{children}
						<Toaster />
					</AuthProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
