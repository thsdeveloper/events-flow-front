import { useState, useEffect, useMemo, useCallback } from 'react';
import type { EventConfiguration } from '@/app/api/admin/event-configurations/route';
import type { FeeConfig } from '@/lib/fees';

interface UseEventConfigReturn {
  config: EventConfiguration | null;
  feeConfig: FeeConfig;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para buscar e gerenciar configurações de evento do Directus
 * Converte automaticamente as configurações para o formato esperado pelos cálculos de taxas
 */
export function useEventConfig(): UseEventConfigReturn {
  const [config, setConfig] = useState<EventConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/event-configurations');

      if (!response.ok) {
        throw new Error('Falha ao buscar configurações de evento');
      }

      const data: EventConfiguration = await response.json();
      setConfig(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar configurações';
      setError(errorMessage);
      console.error('Erro ao buscar configurações de evento:', err);

      // Definir configuração padrão em caso de erro
      setConfig({
        id: 0,
        allow_free_events: true,
        max_tickets_per_event: null,
        ticket_code_prefix: 'TKT',
        registration_confirmation_email: true,
        platform_fee_percentage: 5,
        stripe_percentage_fee: 4.35,
        stripe_fixed_fee: 0.5,
        convenience_fee_calculation_method: 'buyer_pays',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  // Converter configuração para o formato FeeConfig usado pelos cálculos
  const feeConfig: FeeConfig = useMemo(
    () => ({
      platformFeePercentage: config?.platform_fee_percentage ?? 5,
      stripePercentageFee: config?.stripe_percentage_fee ?? 4.35,
      stripeFixedFee: config?.stripe_fixed_fee ?? 0.5,
    }),
    [config?.platform_fee_percentage, config?.stripe_percentage_fee, config?.stripe_fixed_fee],
  );

  return {
    config,
    feeConfig,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}
