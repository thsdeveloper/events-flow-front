export default ({ filter, action }: any, { services, getSchema, logger }: any) => {
	const { ItemsService } = services;

	// Hook para validar eventos pagos antes de criar/atualizar
	filter('events.items.create', async (input: any, meta: any, context: any) => {
		// Se o evento não requer pagamento, permite criar
		if (!input.requires_payment) {
			return input;
		}

		// Se requer pagamento, precisa validar o organizador
		const schema = await getSchema();
		const organizersService = new ItemsService('organizers', {
			schema,
			accountability: context.accountability,
		});

		try {
			// Busca o organizador
			const organizer = await organizersService.readOne(input.organizer_id);

			// Valida se o onboarding do Stripe está completo
			if (!organizer.stripe_onboarding_complete) {
				logger.warn('Attempted to create paid event with incomplete Stripe onboarding', {
					organizer_id: input.organizer_id,
					event_title: input.title,
				});

				throw new Error(
					'Este organizador ainda não completou o cadastro de pagamentos no Stripe. ' +
					'Acesse o painel do organizador e clique em "Configurar Pagamentos" para completar o cadastro.'
				);
			}

			// Valida se pode receber pagamentos
			if (!organizer.stripe_charges_enabled) {
				logger.warn('Attempted to create paid event with charges disabled', {
					organizer_id: input.organizer_id,
					event_title: input.title,
				});

				throw new Error(
					'Este organizador não está habilitado para receber pagamentos. ' +
					'Verifique o status da conta Stripe no painel do organizador.'
				);
			}

			logger.info('Paid event validation passed', {
				organizer_id: input.organizer_id,
				event_title: input.title,
			});

			return input;
		} catch (error: any) {
			// Se é erro de validação que lançamos, propaga
			if (error.message.includes('Stripe') || error.message.includes('pagamentos')) {
				throw error;
			}

			// Outros erros (ex: organizador não encontrado)
			logger.error('Error validating paid event', error);
			throw new Error('Erro ao validar organizador para evento pago. Verifique se o organizador existe.');
		}
	});

	// Hook para validar ao atualizar evento para pago
	filter('events.items.update', async (input: any, meta: any, context: any) => {
		// Se não está mudando para requires_payment, permite
		if (input.requires_payment !== true) {
			return input;
		}

		// Se está mudando para requires_payment=true, precisa validar
		const schema = await getSchema();
		const eventsService = new ItemsService('events', {
			schema,
			accountability: context.accountability,
		});

		try {
			// Busca o evento atual para pegar o organizer_id
			const event = await eventsService.readOne(meta.keys[0]);
			const organizerId = input.organizer_id || event.organizer_id;

			const organizersService = new ItemsService('organizers', {
				schema,
				accountability: context.accountability,
			});

			const organizer = await organizersService.readOne(organizerId);

			// Mesmas validações
			if (!organizer.stripe_onboarding_complete) {
				throw new Error(
					'Este organizador ainda não completou o cadastro de pagamentos no Stripe. ' +
					'Acesse o painel do organizador e clique em "Configurar Pagamentos" para completar o cadastro.'
				);
			}

			if (!organizer.stripe_charges_enabled) {
				throw new Error(
					'Este organizador não está habilitado para receber pagamentos. ' +
					'Verifique o status da conta Stripe no painel do organizador.'
				);
			}

			logger.info('Paid event update validation passed', {
				organizer_id: organizerId,
				event_id: meta.keys[0],
			});

			return input;
		} catch (error: any) {
			if (error.message.includes('Stripe') || error.message.includes('pagamentos')) {
				throw error;
			}

			logger.error('Error validating paid event update', error);
			throw new Error('Erro ao validar organizador para evento pago.');
		}
	});
};
