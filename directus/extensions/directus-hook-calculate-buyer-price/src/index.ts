import { defineHook } from '@directus/extensions-sdk';

interface FeeConfig {
	platformFeePercentage: number;
	stripePercentageFee: number;
	stripeFixedFee: number;
}

function calculateConvenienceFee(ticketPrice: number, config: FeeConfig): number {
	const { platformFeePercentage, stripePercentageFee, stripeFixedFee } = config;

	const platformFeeDecimal = platformFeePercentage / 100;
	const stripeFeeDecimal = stripePercentageFee / 100;

	const convenienceFee =
		(ticketPrice * (stripeFeeDecimal + platformFeeDecimal) + stripeFixedFee) /
		(1 - stripeFeeDecimal);

	return Math.round(convenienceFee * 100) / 100;
}

function calculateBuyerPrice(
	ticketPrice: number,
	serviceFeeType: 'passed_to_buyer' | 'absorbed',
	config: FeeConfig
): number {
	if (serviceFeeType === 'passed_to_buyer') {
		const convenienceFee = calculateConvenienceFee(ticketPrice, config);
		return Math.round((ticketPrice + convenienceFee) * 100) / 100;
	}
	return Math.round(ticketPrice * 100) / 100;
}

export default defineHook(({ filter, action }, { services, getSchema }) => {
	// Hook para calcular buyer_price antes de criar ou atualizar um ingresso
	filter('event_tickets.items.create', async (input, meta, context) => {
		const { ItemsService } = services;
		const schema = await getSchema();

		// Buscar configuração de taxas
		const configService = new ItemsService('event_configurations', {
			schema,
			accountability: context.accountability,
		});

		const configs = await configService.readByQuery({ limit: 1 });
		const config = configs[0];

		if (!config || !input.price || !input.service_fee_type) {
			return input;
		}

		const feeConfig: FeeConfig = {
			platformFeePercentage: Number(config.platform_fee_percentage || 5),
			stripePercentageFee: Number(config.stripe_percentage_fee || 4.35),
			stripeFixedFee: Number(config.stripe_fixed_fee || 0.5),
		};

		// Calcular buyer_price
		const buyerPrice = calculateBuyerPrice(
			Number(input.price),
			input.service_fee_type,
			feeConfig
		);

		return {
			...input,
			buyer_price: buyerPrice,
		};
	});

	filter('event_tickets.items.update', async (input, meta, context) => {
		const { ItemsService } = services;
		const schema = await getSchema();

		// Se o preço ou service_fee_type não foi alterado, não precisa recalcular
		if (!input.price && !input.service_fee_type) {
			return input;
		}

		// Buscar configuração de taxas
		const configService = new ItemsService('event_configurations', {
			schema,
			accountability: context.accountability,
		});

		const configs = await configService.readByQuery({ limit: 1 });
		const config = configs[0];

		if (!config) {
			return input;
		}

		const feeConfig: FeeConfig = {
			platformFeePercentage: Number(config.platform_fee_percentage || 5),
			stripePercentageFee: Number(config.stripe_percentage_fee || 4.35),
			stripeFixedFee: Number(config.stripe_fixed_fee || 0.5),
		};

		// Se apenas service_fee_type foi alterado, buscar o ticket para pegar o price
		let ticketPrice = input.price ? Number(input.price) : null;
		let serviceFeeType = input.service_fee_type || null;

		if (!ticketPrice || !serviceFeeType) {
			const ticketService = new ItemsService('event_tickets', {
				schema,
				accountability: context.accountability,
			});

			const tickets = meta.keys || [];
			if (tickets.length > 0) {
				const ticket = await ticketService.readOne(tickets[0]);
				ticketPrice = ticketPrice || Number(ticket.price);
				serviceFeeType = serviceFeeType || ticket.service_fee_type;
			}
		}

		if (!ticketPrice || !serviceFeeType) {
			return input;
		}

		// Calcular buyer_price
		const buyerPrice = calculateBuyerPrice(
			ticketPrice,
			serviceFeeType as 'passed_to_buyer' | 'absorbed',
			feeConfig
		);

		return {
			...input,
			buyer_price: buyerPrice,
		};
	});
});
