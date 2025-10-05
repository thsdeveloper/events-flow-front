'use client';

import { useState } from 'react';
import TicketSelection, { EventTicket, TicketSelectionItem } from './TicketSelection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/useCheckout';
import { AlertCircle } from 'lucide-react';
import {Alert, AlertDescription} from "@/components/ui/alert";

interface EventCheckoutProps {
  eventId: string;
  eventTitle: string;
  tickets: EventTicket[];
  userId?: string;
}

export default function EventCheckout({
  eventId,
  eventTitle,
  tickets,
  userId,
}: EventCheckoutProps) {
  const [selectedTickets, setSelectedTickets] = useState<TicketSelectionItem[]>([]);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
  });

  const { createCheckoutSession, isLoading, error } = useCheckout({ eventId, userId });

  const handleTicketSelection = (tickets: TicketSelectionItem[]) => {
    setSelectedTickets(tickets);
    setShowParticipantForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!participantInfo.name || !participantInfo.email) {
      return;
    }

    try {
      await createCheckoutSession(selectedTickets, participantInfo);
    } catch (err) {
      // Erro já é tratado no hook
      console.error('Erro no checkout:', err);
    }
  };

  const handleBackToTickets = () => {
    setShowParticipantForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{eventTitle}</h1>
        <p className="text-muted-foreground">Selecione seus ingressos</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!showParticipantForm ? (
        <TicketSelection
          eventId={eventId}
          tickets={tickets}
          onCheckout={handleTicketSelection}
          isLoading={isLoading}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Participante</CardTitle>
              <CardDescription>
                Preencha seus dados para finalizar a compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={participantInfo.name}
                    onChange={(e) =>
                      setParticipantInfo({ ...participantInfo, name: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={participantInfo.email}
                    onChange={(e) =>
                      setParticipantInfo({ ...participantInfo, email: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={participantInfo.phone}
                      onChange={(e) =>
                        setParticipantInfo({ ...participantInfo, phone: e.target.value })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">CPF</Label>
                    <Input
                      id="document"
                      type="text"
                      value={participantInfo.document}
                      onChange={(e) =>
                        setParticipantInfo({ ...participantInfo, document: e.target.value })
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToTickets}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Processando...' : 'Ir para Pagamento'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
