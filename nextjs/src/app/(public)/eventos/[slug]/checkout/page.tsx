import { notFound } from 'next/navigation';
import { fetchEventBySlug } from '@/lib/directus/fetchers';
import EventCheckout from '@/components/events/EventCheckout';

interface CheckoutPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;

  let event;
  try {
    event = await fetchEventBySlug(slug);
  } catch (error) {
    notFound();
  }

  // Verificar se evento tem ingressos
  if (event.is_free || !event.tickets || event.tickets.length === 0) {
    notFound();
  }

  // Filtrar apenas ingressos ativos
  const activeTickets = event.tickets.filter((ticket: any) => {
    return ticket.status === 'active' &&
           (ticket.quantity - (ticket.quantity_sold || 0)) > 0;
  });

  if (activeTickets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Ingressos Esgotados</h1>
          <p className="text-muted-foreground mb-6">
            Infelizmente todos os ingressos para este evento já foram vendidos.
          </p>
          <a
            href={`/eventos/${slug}`}
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Voltar ao Evento
          </a>
        </div>
      </div>
    );
  }

  return (
    <EventCheckout
      eventId={event.id}
      eventTitle={event.title}
      tickets={activeTickets}
      // userId pode ser obtido da sessão aqui se necessário
    />
  );
}
