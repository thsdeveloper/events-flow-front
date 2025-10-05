import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TicketItem {
  ticketId: string;
  quantity: number;
}

interface ParticipantInfo {
  name: string;
  email: string;
  phone?: string;
  document?: string;
}

interface CheckoutOptions {
  eventId: string;
  userId?: string;
}

interface CheckoutResponse {
  sessionId: string;
  url: string;
  registrationId: string;
}

export function useCheckout({ eventId, userId }: CheckoutOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createCheckoutSession = async (
    tickets: TicketItem[],
    participantInfo: ParticipantInfo
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          tickets,
          participantInfo,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar sessão de checkout');
      }

      // Redirecionar para o Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }

      return data as CheckoutResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCheckoutSession,
    isLoading,
    error,
  };
}
