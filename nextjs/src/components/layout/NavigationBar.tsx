'use client';

import { useState, forwardRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuTrigger,
	NavigationMenuContent,
	NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Menu, X } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import SearchModal from '@/components/ui/SearchModal';
import Container from '@/components/ui/container';
import { UserMenuDropdown } from '@/components/ui/user-menu-dropdown';
import { setAttr } from '@directus/visual-editing';

interface NavigationBarProps {
	navigation: any;
	globals: any;
}

const NavigationBar = forwardRef<HTMLElement, NavigationBarProps>(({ navigation, globals }, ref) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	const directusURL = process.env.NEXT_PUBLIC_DIRECTUS_URL;
	const lightLogoUrl = globals?.logo ? `${directusURL}/assets/${globals.logo}` : '/images/logo.svg';
	const darkLogoUrl = globals?.logo_dark_mode ? `${directusURL}/assets/${globals.logo_dark_mode}` : '';

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const handleLinkClick = () => {
		setMenuOpen(false);
	};

	return (
		<header
			ref={ref}
			className={`sticky top-0 z-50 w-full transition-all duration-300 ${
				scrolled
					? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg border-b border-gray-200 dark:border-gray-800'
					: 'bg-transparent'
			}`}
		>
			<Container className="flex items-center justify-between py-4 px-4">
				<Link href="/" className="flex-shrink-0 group">
					<div className="relative">
						<Image
							src={lightLogoUrl}
							alt="Logo"
							width={150}
							height={100}
							className="w-[140px] h-auto dark:hidden transition-transform group-hover:scale-105"
							priority
						/>
						{darkLogoUrl && (
							<Image
								src={darkLogoUrl}
								alt="Logo (Dark Mode)"
								width={150}
								height={100}
								className="w-[140px] h-auto hidden dark:block transition-transform group-hover:scale-105"
								priority
							/>
						)}
					</div>
				</Link>

				<nav className="flex items-center gap-3">
					<NavigationMenu
						className="hidden lg:flex"
						data-directus={
							navigation
								? setAttr({
										collection: 'navigation',
										item: navigation.id,
										fields: ['items'],
										mode: 'modal',
									})
								: undefined
						}
					>
						<NavigationMenuList className="flex gap-1">
							{navigation?.items?.map((section: any) => (
								<NavigationMenuItem key={section.id}>
									{section.children && section.children.length > 0 ? (
										<>
											<NavigationMenuTrigger className="px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 focus:outline-none group">
												<span className="font-semibold text-sm tracking-wide">{section.title}</span>
											</NavigationMenuTrigger>
											<NavigationMenuContent className="mt-2 min-w-[200px] rounded-xl bg-white dark:bg-slate-900 p-3 shadow-2xl border border-gray-100 dark:border-gray-800">
												<ul className="flex flex-col gap-1">
													{section.children.map((child: any) => (
														<li key={child.id}>
															<NavigationMenuLink
																href={child.page?.permalink || child.url || '#'}
																className="block px-4 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 font-medium text-sm"
															>
																{child.title}
															</NavigationMenuLink>
														</li>
													))}
												</ul>
											</NavigationMenuContent>
										</>
									) : (
										<NavigationMenuLink
											href={section.page?.permalink || section.url || '#'}
											className="px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 font-semibold text-sm tracking-wide"
										>
											{section.title}
										</NavigationMenuLink>
									)}
								</NavigationMenuItem>
							))}
						</NavigationMenuList>
					</NavigationMenu>

					<div className="hidden lg:flex items-center gap-2 border-l border-gray-300 dark:border-gray-700 pl-3 ml-2">
						<SearchModal />
						<ThemeToggle />
						<UserMenuDropdown />
					</div>

					<div className="flex lg:hidden items-center gap-2">
						<SearchModal />
						<ThemeToggle />
						<UserMenuDropdown />
						<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
									className="relative w-10 h-10 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300"
								>
									{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="w-screen max-w-sm mt-2 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-2xl border border-gray-100 dark:border-gray-800"
							>
								<div className="flex flex-col gap-2">
									{navigation?.items?.map((section: any) => (
										<div key={section.id}>
											{section.children && section.children.length > 0 ? (
												<Collapsible>
													<CollapsibleTrigger className="w-full px-4 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 text-left flex items-center justify-between focus:outline-none font-semibold text-sm">
														<span>{section.title}</span>
														<ChevronDown className="size-4 transition-transform duration-200" />
													</CollapsibleTrigger>
													<CollapsibleContent className="ml-4 mt-2 flex flex-col gap-1">
														{section.children.map((child: any) => (
															<Link
																key={child.id}
																href={child.page?.permalink || child.url || '#'}
																className="px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 font-medium text-sm"
																onClick={handleLinkClick}
															>
																{child.title}
															</Link>
														))}
													</CollapsibleContent>
												</Collapsible>
											) : (
												<Link
													href={section.page?.permalink || section.url || '#'}
													className="block px-4 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 font-semibold text-sm"
													onClick={handleLinkClick}
												>
													{section.title}
												</Link>
											)}
										</div>
									))}
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</nav>
			</Container>
		</header>
	);
});
NavigationBar.displayName = 'NavigationBar';
export default NavigationBar;
