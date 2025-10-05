import Link from 'next/link';

export default function OrganizerLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-8">
							<Link href="/organizer/dashboard" className="text-xl font-bold text-gray-900">
								Painel do Organizador
							</Link>
							<nav className="hidden md:flex gap-6">
								<Link
									href="/organizer/dashboard"
									className="text-sm font-medium text-gray-700 hover:text-gray-900"
								>
									Dashboard
								</Link>
								<Link
									href="/organizer/events"
									className="text-sm font-medium text-gray-700 hover:text-gray-900"
								>
									Eventos
								</Link>
								<Link
									href="/organizer/settings"
									className="text-sm font-medium text-gray-700 hover:text-gray-900"
								>
									Configurações
								</Link>
							</nav>
						</div>
						<div>
							<Link
								href="/"
								className="text-sm font-medium text-gray-700 hover:text-gray-900"
							>
								Sair
							</Link>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{children}
			</main>
		</div>
	);
}
