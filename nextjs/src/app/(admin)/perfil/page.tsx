'use client';

import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Save, Lock, Shield, Camera } from 'lucide-react';

export default function PerfilPage() {
	const { user } = useAuth();

	return (
		<div className="max-w-5xl mx-auto space-y-8">
			{/* Header */}
			<div className="bg-gradient-to-r from-accent to-accent/80 rounded-xl p-8 text-white">
				<div className="flex items-center gap-6">
					<div className="relative group">
						<div className="size-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
							<User className="size-12" />
						</div>
						<button className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<Camera className="size-6" />
						</button>
					</div>
					<div>
						<h1 className="text-3xl font-bold mb-1">
							{user?.first_name} {user?.last_name}
						</h1>
						<p className="text-white/90 flex items-center gap-2">
							<Mail className="size-4" />
							{user?.email}
						</p>
					</div>
				</div>
			</div>

			<div className="grid md:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="md:col-span-2 space-y-6">
					{/* Personal Information */}
					<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
						<div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
								<User className="size-5" />
								Informações Pessoais
							</h2>
						</div>

						<form className="p-6 space-y-5">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Primeiro Nome
									</label>
									<input
										type="text"
										defaultValue={user?.first_name || ''}
										className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Sobrenome
									</label>
									<input
										type="text"
										defaultValue={user?.last_name || ''}
										className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Email
								</label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
									<input
										type="email"
										defaultValue={user?.email || ''}
										className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
									/>
								</div>
							</div>

							<div className="flex justify-end pt-4">
								<button
									type="submit"
									className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all hover:shadow-lg"
								>
									<Save className="size-4" />
									Salvar Alterações
								</button>
							</div>
						</form>
					</div>

					{/* Security - Change Password */}
					<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
						<div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
								<Lock className="size-5" />
								Segurança
							</h2>
						</div>

						<form className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Senha Atual
								</label>
								<input
									type="password"
									placeholder="Digite sua senha atual"
									className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Nova Senha
									</label>
									<input
										type="password"
										placeholder="Mínimo 8 caracteres"
										className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Confirmar Senha
									</label>
									<input
										type="password"
										placeholder="Repita a senha"
										className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
									/>
								</div>
							</div>

							<div className="flex justify-end pt-4">
								<button
									type="submit"
									className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all hover:shadow-lg"
								>
									<Shield className="size-4" />
									Atualizar Senha
								</button>
							</div>
						</form>
					</div>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Account Stats */}
					<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
							Estatísticas da Conta
						</h3>
						<div className="space-y-4">
							<div>
								<div className="text-2xl font-bold text-accent mb-1">0</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">Eventos Criados</div>
							</div>
							<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
								<div className="text-2xl font-bold text-accent mb-1">0</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">Participantes</div>
							</div>
						</div>
					</div>

					{/* Account Info */}
					<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
							Informações da Conta
						</h3>
						<div className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-400">Status</span>
								<span className="font-medium text-green-600 dark:text-green-400">Ativo</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-400">Tipo</span>
								<span className="font-medium text-gray-900 dark:text-white">Organizador</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-400">Membro desde</span>
								<span className="font-medium text-gray-900 dark:text-white">2025</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
