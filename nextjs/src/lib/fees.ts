/**
 * Funções utilitárias para cálculo de taxas de ingressos
 *
 * Modelo de Negócio - Cenário 2 (Comprador Paga):
 * - Ingresso: R$ 100,00
 * - Taxa de Conveniência: R$ 9,38 (cobrada do comprador)
 * - Total pago pelo comprador: R$ 109,38
 * - Taxa Stripe: R$ 4,76 (4.35% + R$ 0.50 sobre R$ 109,38)
 * - Taxa Plataforma: R$ 5,00 (5% sobre R$ 100,00)
 * - Organizador recebe: R$ 99,62
 */

export interface FeeConfig {
  platformFeePercentage: number; // Taxa da plataforma (ex: 5 = 5%)
  stripePercentageFee: number;   // Taxa percentual do Stripe (ex: 4.35 = 4.35%)
  stripeFixedFee: number;         // Taxa fixa do Stripe (ex: 0.50)
}

export interface FeeCalculation {
  ticketPrice: number;           // Preço base do ingresso
  convenienceFee: number;        // Taxa de conveniência
  buyerPrice: number;            // Total pago pelo comprador
  stripeFee: number;             // Taxa do Stripe
  platformFee: number;           // Taxa da plataforma
  organizerReceives: number;     // Valor que o organizador recebe
}

/**
 * Calcula a taxa de conveniência que deve ser cobrada do comprador
 * para que o organizador receba quase o valor total do ingresso.
 *
 * A taxa de conveniência cobre:
 * - Taxa do Stripe (percentual + fixa)
 * - Taxa da plataforma
 */
export function calculateConvenienceFee(
  ticketPrice: number,
  config: FeeConfig
): number {
  const { platformFeePercentage, stripePercentageFee, stripeFixedFee } = config;

  // Converter percentuais para decimais
  const platformFeeDecimal = platformFeePercentage / 100;
  const stripeFeeDecimal = stripePercentageFee / 100;

  // Fórmula:
  // convenienceFee = (ticketPrice × (stripeFeeDecimal + platformFeeDecimal) + stripeFixedFee) / (1 - stripeFeeDecimal)
  const convenienceFee =
    (ticketPrice * (stripeFeeDecimal + platformFeeDecimal) + stripeFixedFee) /
    (1 - stripeFeeDecimal);

  return Math.round(convenienceFee * 100) / 100; // Arredondar para 2 casas decimais
}

/**
 * Calcula todas as taxas e valores envolvidos na transação
 */
export function calculateFees(
  ticketPrice: number,
  serviceFeeType: 'passed_to_buyer' | 'absorbed',
  config: FeeConfig
): FeeCalculation {
  const { platformFeePercentage, stripePercentageFee, stripeFixedFee } = config;

  let convenienceFee = 0;
  let buyerPrice = ticketPrice;
  let stripeFee = 0;
  let platformFee = 0;
  let organizerReceives = 0;

  if (serviceFeeType === 'passed_to_buyer') {
    // Comprador paga a taxa de conveniência
    convenienceFee = calculateConvenienceFee(ticketPrice, config);
    buyerPrice = ticketPrice + convenienceFee;

    // Taxa do Stripe sobre o total pago
    stripeFee = (buyerPrice * stripePercentageFee / 100) + stripeFixedFee;

    // Taxa da plataforma sobre o preço base
    platformFee = ticketPrice * platformFeePercentage / 100;

    // Organizador recebe o total menos as taxas
    organizerReceives = buyerPrice - stripeFee - platformFee;
  } else {
    // Organizador absorve todas as taxas
    buyerPrice = ticketPrice;

    // Taxa do Stripe sobre o total
    stripeFee = (buyerPrice * stripePercentageFee / 100) + stripeFixedFee;

    // Taxa da plataforma sobre o preço base
    platformFee = ticketPrice * platformFeePercentage / 100;

    // Organizador recebe o valor menos todas as taxas
    organizerReceives = buyerPrice - stripeFee - platformFee;
  }

  return {
    ticketPrice: Math.round(ticketPrice * 100) / 100,
    convenienceFee: Math.round(convenienceFee * 100) / 100,
    buyerPrice: Math.round(buyerPrice * 100) / 100,
    stripeFee: Math.round(stripeFee * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    organizerReceives: Math.round(organizerReceives * 100) / 100,
  };
}

/**
 * Calcula o buyer_price (preço final para o comprador)
 */
export function calculateBuyerPrice(
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

/**
 * Formata valores monetários para exibição
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calcula a porcentagem que a taxa de conveniência representa sobre o preço base
 */
export function calculateConvenienceFeePercentage(
  ticketPrice: number,
  config: FeeConfig
): number {
  const convenienceFee = calculateConvenienceFee(ticketPrice, config);
  
return Math.round((convenienceFee / ticketPrice) * 10000) / 100; // Arredondar para 2 casas decimais
}
