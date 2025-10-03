import { Calendar, Users, TrendingUp, DollarSign } from 'lucide-react';

export default function DashboardPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					Dashboard
				</h1>
				<p className="text-gray-600 dark:text-gray-400 mt-1">
					Bem-vindo ao painel de gerenciamento de eventos
				</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatsCard
					title="Total de Eventos"
					value="12"
					icon={Calendar}
					trend="+2 este mês"
					trendUp
				/>
				<StatsCard
					title="Participantes"
					value="1,234"
					icon={Users}
					trend="+180 esta semana"
					trendUp
				/>
				<StatsCard
					title="Taxa de Conversão"
					value="68%"
					icon={TrendingUp}
					trend="+5% vs. mês anterior"
					trendUp
				/>
				<StatsCard
					title="Receita Total"
					value="R$ 45.2k"
					icon={DollarSign}
					trend="+12% vs. mês anterior"
					trendUp
				/>
			</div>

			{/* Recent Events */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					Eventos Recentes
				</h2>
				<div className="text-gray-600 dark:text-gray-400">
					Nenhum evento encontrado. Crie seu primeiro evento!
				</div>
			</div>
		</div>
	);
}

interface StatsCardProps {
	title: string;
	value: string;
	icon: React.ElementType;
	trend: string;
	trendUp: boolean;
}

function StatsCard({ title, value, icon: Icon, trend, trendUp }: StatsCardProps) {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
					<p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
						{value}
					</p>
				</div>
				<div className="size-12 bg-accent/10 rounded-lg flex items-center justify-center">
					<Icon className="size-6 text-accent" />
				</div>
			</div>
			<div className="mt-4">
				<span className={`text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
					{trend}
				</span>
			</div>
		</div>
	);
}
