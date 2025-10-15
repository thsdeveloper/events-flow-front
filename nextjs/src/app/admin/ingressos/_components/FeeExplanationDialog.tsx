'use client';

import { HelpCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, type FeeConfig } from '@/lib/fees';

interface FeeExplanationDialogProps {
  price: number;
  serviceFeeType: 'passed_to_buyer' | 'absorbed';
  feeConfig: FeeConfig;
}

export function FeeExplanationDialog({ price, serviceFeeType, feeConfig }: FeeExplanationDialogProps) {
  // Exemplo com R$ 100,00 para facilitar entendimento
  const examplePrice = 100;
  const convenienceFeePercentage =
    (feeConfig.stripePercentageFee + feeConfig.platformFeePercentage) /
    (1 - feeConfig.stripePercentageFee / 100);
  const convenienceFee = (examplePrice * convenienceFeePercentage / 100) + feeConfig.stripeFixedFee;
  const buyerTotal = examplePrice + convenienceFee;
  const stripeFee = (buyerTotal * feeConfig.stripePercentageFee / 100) + feeConfig.stripeFixedFee;
  const platformFee = examplePrice * feeConfig.platformFeePercentage / 100;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Como as taxas são calculadas?"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Como as taxas são calculadas?</AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4 text-base">
            {serviceFeeType === 'passed_to_buyer' ? (
              <>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Cenário: Comprador Paga a Taxa</h3>
                  <p className="text-sm text-muted-foreground">
                    Neste modelo, o comprador paga uma taxa de conveniência adicional ao preço do ingresso.
                    O organizador recebe praticamente o valor total do ingresso.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="font-medium text-foreground">Exemplo com ingresso de R$ 100,00:</div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>1. Preço do ingresso:</span>
                      <span className="font-medium">{formatCurrency(examplePrice)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>2. Taxa de conveniência (~{convenienceFeePercentage.toFixed(2)}%):</span>
                      <span className="font-medium text-primary">+{formatCurrency(convenienceFee)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold">
                      <span>3. Total pago pelo comprador:</span>
                      <span>{formatCurrency(buyerTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="font-medium text-foreground">Descontos aplicados:</div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Taxa Stripe:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(stripeFee)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-4">
                        • {feeConfig.stripePercentageFee}% de {formatCurrency(buyerTotal)} = {formatCurrency(buyerTotal * feeConfig.stripePercentageFee / 100)}<br/>
                        • + Taxa fixa = {formatCurrency(feeConfig.stripeFixedFee)}<br/>
                        • <strong>Total: {formatCurrency(stripeFee)}</strong>
                      </div>
                      <div className="text-xs text-muted-foreground italic mt-1 pl-4">
                        * A taxa percentual do Stripe é calculada sobre o <strong>valor total da transação</strong>
                        ({formatCurrency(buyerTotal)}), pois é esse o valor que passa pelo sistema de pagamento.
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Taxa da Plataforma:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(platformFee)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-4">
                        • {feeConfig.platformFeePercentage}% de {formatCurrency(examplePrice)} = {formatCurrency(platformFee)}
                      </div>
                      <div className="text-xs text-muted-foreground italic mt-1 pl-4">
                        * A taxa da plataforma é calculada sobre o <strong>preço base do ingresso</strong>
                        ({formatCurrency(examplePrice)}).
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold text-green-600">
                      <span>Organizador recebe:</span>
                      <span>{formatCurrency(buyerTotal - stripeFee - platformFee)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm">
                  <p className="text-blue-900 dark:text-blue-100">
                    <strong>💡 Resumo:</strong> A taxa de conveniência é calculada para que, mesmo com todos os descontos,
                    você receba aproximadamente o valor do ingresso. O comprador paga um pouco mais, mas você garante sua receita.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Cenário: Organizador Absorve as Taxas</h3>
                  <p className="text-sm text-muted-foreground">
                    Neste modelo, o comprador paga apenas o preço do ingresso.
                    Você (organizador) absorve todas as taxas do seu ganho.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="font-medium text-foreground">Exemplo com ingresso de R$ 100,00:</div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between font-semibold">
                      <span>Comprador paga:</span>
                      <span>{formatCurrency(examplePrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="font-medium text-foreground">Descontos aplicados (absorvidos por você):</div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Taxa Stripe:</span>
                        <span className="font-medium text-red-600">-{formatCurrency((examplePrice * feeConfig.stripePercentageFee / 100) + feeConfig.stripeFixedFee)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-4">
                        • {feeConfig.stripePercentageFee}% de {formatCurrency(examplePrice)} = {formatCurrency(examplePrice * feeConfig.stripePercentageFee / 100)}<br/>
                        • + Taxa fixa = {formatCurrency(feeConfig.stripeFixedFee)}<br/>
                        • <strong>Total: {formatCurrency((examplePrice * feeConfig.stripePercentageFee / 100) + feeConfig.stripeFixedFee)}</strong>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Taxa da Plataforma:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(platformFee)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-4">
                        • {feeConfig.platformFeePercentage}% de {formatCurrency(examplePrice)} = {formatCurrency(platformFee)}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold text-yellow-600">
                      <span>Você recebe:</span>
                      <span>{formatCurrency(examplePrice - ((examplePrice * feeConfig.stripePercentageFee / 100) + feeConfig.stripeFixedFee) - platformFee)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg text-sm">
                  <p className="text-yellow-900 dark:text-yellow-100">
                    <strong>⚠️ Atenção:</strong> Neste modelo, você absorve todas as taxas.
                    Para um ingresso de R$ 100,00, você receberá cerca de R$ {formatCurrency(examplePrice - ((examplePrice * feeConfig.stripePercentageFee / 100) + feeConfig.stripeFixedFee) - platformFee)}.
                  </p>
                </div>
              </>
            )}

            <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground">
              <p className="mb-2"><strong>Configurações atuais da plataforma:</strong></p>
              <ul className="space-y-1 pl-4">
                <li>• Taxa Plataforma: {feeConfig.platformFeePercentage}%</li>
                <li>• Taxa Stripe (percentual): {feeConfig.stripePercentageFee}%</li>
                <li>• Taxa Stripe (fixa): {formatCurrency(feeConfig.stripeFixedFee)}</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
