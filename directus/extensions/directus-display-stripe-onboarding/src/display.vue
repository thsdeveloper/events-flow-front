<template>
	<div class="stripe-onboarding-display">
		<div v-if="loading" class="loading">
			<v-spinner />
		</div>

		<div v-else-if="error" class="error">
			<v-notice type="danger">{{ error }}</v-notice>
		</div>

		<div v-else class="status-container">
			<!-- Status Badges -->
			<div class="status-badges">
				<v-badge
					:color="organizerData?.stripe_onboarding_complete ? 'success' : 'warning'"
					:icon="organizerData?.stripe_onboarding_complete ? 'check_circle' : 'pending'"
				>
					{{ organizerData?.stripe_onboarding_complete ? 'Cadastro Completo' : 'Cadastro Pendente' }}
				</v-badge>

				<v-badge
					v-if="organizerData?.stripe_charges_enabled"
					color="success"
					icon="payments"
				>
					Pagamentos Habilitados
				</v-badge>

				<v-badge
					v-if="organizerData?.stripe_payouts_enabled"
					color="success"
					icon="account_balance"
				>
					Transferências Habilitadas
				</v-badge>
			</div>

			<!-- Action Button -->
			<div class="action-button">
				<v-button
					v-if="!organizerData?.stripe_onboarding_complete"
					:loading="creating"
					@click="createOnboardingLink"
					icon="settings"
				>
					Configurar Pagamentos
				</v-button>

				<v-button
					v-else-if="organizerData?.stripe_account_id"
					:loading="creating"
					@click="createOnboardingLink"
					icon="refresh"
					secondary
				>
					Atualizar Cadastro
				</v-button>
			</div>

			<!-- Account ID -->
			<div v-if="organizerData?.stripe_account_id" class="account-id">
				<small>Stripe Account ID: {{ organizerData.stripe_account_id }}</small>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';

export default defineComponent({
	props: {
		value: {
			type: String,
			required: true,
		},
	},
	setup(props) {
		const api = useApi();
		const loading = ref(true);
		const creating = ref(false);
		const error = ref<string | null>(null);
		const organizerData = ref<any>(null);

		// Fetch organizer data
		const fetchOrganizerData = async () => {
			try {
				loading.value = true;
				error.value = null;

				const response = await api.get(`/items/organizers/${props.value}`, {
					params: {
						fields: [
							'id',
							'stripe_account_id',
							'stripe_onboarding_complete',
							'stripe_charges_enabled',
							'stripe_payouts_enabled',
						],
					},
				});

				organizerData.value = response.data.data;
			} catch (err: any) {
				error.value = err.message || 'Erro ao carregar dados do organizador';
				console.error('Error fetching organizer:', err);
			} finally {
				loading.value = false;
			}
		};

		// Create onboarding link
		const createOnboardingLink = async () => {
			try {
				creating.value = true;
				error.value = null;

				const response = await api.post('/stripe/connect-onboarding', {
					organizer_id: props.value,
				});

				if (response.data.url) {
					// Open Stripe onboarding in new window
					window.open(response.data.url, '_blank');

					// Show success message
					alert('Link de cadastro gerado! Uma nova janela foi aberta com o formulário do Stripe.');
				} else {
					throw new Error('URL não retornada pelo servidor');
				}
			} catch (err: any) {
				error.value = err.response?.data?.message || err.message || 'Erro ao criar link de onboarding';
				console.error('Error creating onboarding link:', err);
				alert(`Erro: ${error.value}`);
			} finally {
				creating.value = false;
			}
		};

		onMounted(() => {
			fetchOrganizerData();
		});

		return {
			loading,
			creating,
			error,
			organizerData,
			createOnboardingLink,
		};
	},
});
</script>

<style scoped>
.stripe-onboarding-display {
	padding: 12px;
	border: 1px solid var(--theme--border-color-subdued);
	border-radius: var(--theme--border-radius);
	background-color: var(--theme--background-subdued);
}

.loading {
	display: flex;
	justify-content: center;
	padding: 20px;
}

.status-container {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.status-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.action-button {
	display: flex;
	gap: 8px;
}

.account-id {
	color: var(--theme--foreground-subdued);
	font-size: 12px;
}

.error {
	padding: 8px 0;
}
</style>
