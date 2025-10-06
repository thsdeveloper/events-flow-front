'use client';

import React, { forwardRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/ui/container';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';

interface SocialLink {
	service: string;
	url: string;
}

interface NavigationItem {
	id: string;
	title: string;
	url?: string | null;
	page?: { permalink?: string | null };
}

interface FooterProps {
	navigation: { items: NavigationItem[] };
	globals: {
		logo?: string | null;
		logo_dark_mode?: string | null;
		description?: string | null;
		social_links?: SocialLink[];
	};
}

const Footer = forwardRef<HTMLElement, FooterProps>(({ navigation, globals }, ref) => {
	const directusURL = process.env.NEXT_PUBLIC_DIRECTUS_URL;
	const lightLogoUrl = globals?.logo ? `${directusURL}/assets/${globals.logo}` : '/images/logo.svg';
	const darkLogoUrl = globals?.logo_dark_mode ? `${directusURL}/assets/${globals.logo_dark_mode}` : '';
	const currentYear = new Date().getFullYear();

	return (
		<footer ref={ref} className="relative bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white overflow-hidden">
			{/* Animated Background Elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
			</div>

			<Container className="relative z-10 py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
					{/* Logo & Description */}
					<div className="lg:col-span-2">
						<Link href="/" className="inline-block group mb-6">
							<Image
								src={lightLogoUrl}
								alt="Logo"
								width={160}
								height={120}
								className="w-[160px] h-auto transition-transform group-hover:scale-105 dark:hidden"
								priority
							/>
							{darkLogoUrl && (
								<Image
									src={darkLogoUrl}
									alt="Logo (Dark Mode)"
									width={160}
									height={120}
									className="w-[160px] h-auto hidden dark:block transition-transform group-hover:scale-105"
									priority
								/>
							)}
						</Link>
						{globals?.description && (
							<p className="text-gray-300 text-sm leading-relaxed max-w-md mb-6">{globals.description}</p>
						)}

						{/* Social Links */}
						{globals?.social_links && globals.social_links.length > 0 && (
							<div className="flex items-center gap-3">
								<span className="text-sm font-semibold text-gray-400">Siga-nos:</span>
								<div className="flex gap-2">
									{globals.social_links.map((social) => (
										<a
											key={social.service}
											href={social.url}
											target="_blank"
											rel="noopener noreferrer"
											className="w-10 h-10 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 hover:border-transparent transition-all duration-300 group"
											title={social.service}
										>
											<img
												src={`/icons/social/${social.service}.svg`}
												alt={`${social.service} icon`}
												className="size-5 invert transition-transform group-hover:scale-110"
											/>
										</a>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Navigation Links */}
					<div>
						<h3 className="text-lg font-bold mb-6 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
							Links Rápidos
						</h3>
						<nav>
							<ul className="space-y-3">
								{navigation?.items?.map((item) => (
									<li key={item.id}>
										{item.page?.permalink ? (
											<Link
												href={item.page.permalink}
												className="text-gray-300 hover:text-white text-sm transition-colors duration-300 flex items-center gap-2 group"
											>
												<span className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:w-3 transition-all duration-300" />
												{item.title}
											</Link>
										) : (
											<a
												href={item.url || '#'}
												className="text-gray-300 hover:text-white text-sm transition-colors duration-300 flex items-center gap-2 group"
											>
												<span className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:w-3 transition-all duration-300" />
												{item.title}
											</a>
										)}
									</li>
								))}
							</ul>
						</nav>
					</div>

					{/* Contact Info */}
					<div>
						<h3 className="text-lg font-bold mb-6 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
							Contato
						</h3>
						<ul className="space-y-4">
							<li className="flex items-start gap-3 text-gray-300 text-sm">
								<Mail className="size-5 text-purple-400 flex-shrink-0 mt-0.5" />
								<a href="mailto:contato@exemplo.com" className="hover:text-white transition-colors">
									contato@exemplo.com
								</a>
							</li>
							<li className="flex items-start gap-3 text-gray-300 text-sm">
								<Phone className="size-5 text-purple-400 flex-shrink-0 mt-0.5" />
								<a href="tel:+5511999999999" className="hover:text-white transition-colors">
									(11) 99999-9999
								</a>
							</li>
							<li className="flex items-start gap-3 text-gray-300 text-sm">
								<MapPin className="size-5 text-purple-400 flex-shrink-0 mt-0.5" />
								<span>São Paulo, SP - Brasil</span>
							</li>
						</ul>
					</div>
				</div>

				{/* Divider */}
				<div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8" />

				{/* Bottom Bar */}
				<div className="flex flex-col md:flex-row items-center justify-between gap-4">
					<p className="text-gray-400 text-sm flex items-center gap-1.5">
						© {currentYear} Todos os direitos reservados. Feito com
						<Heart className="size-4 text-red-500 fill-red-500 animate-pulse" />
					</p>

					<div className="flex items-center gap-6">
						<Link href="/politica-privacidade" className="text-gray-400 hover:text-white text-sm transition-colors">
							Política de Privacidade
						</Link>
						<Link href="/termos-uso" className="text-gray-400 hover:text-white text-sm transition-colors">
							Termos de Uso
						</Link>
						<ThemeToggle />
					</div>
				</div>
			</Container>
		</footer>
	);
});

Footer.displayName = 'Footer';
export default Footer;
