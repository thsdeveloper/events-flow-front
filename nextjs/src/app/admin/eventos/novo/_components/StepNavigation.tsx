'use client';

import { Button } from '@/components/ui/button';

interface StepNavigationProps {
	isFirstStep: boolean;
	isLastStep: boolean;
	isSubmitting: boolean;
	isLoadingOrganizer?: boolean;
	onBack: () => void;
	onNext: () => void;
	disableNext?: boolean;
}

export function StepNavigation({
	isFirstStep,
	isLastStep,
	isSubmitting,
	isLoadingOrganizer,
	onBack,
	onNext,
	disableNext,
}: StepNavigationProps) {
	const isProcessing = isSubmitting || !!isLoadingOrganizer;
	const nextButtonType = isLastStep ? 'submit' : 'button';
	const nextDisabled = disableNext || isProcessing;

	return (
		<div className="sticky inset-x-0 bottom-0 z-30 mt-10 border-t border-border/60 bg-card/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/85">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-5">
				<Button
					type="button"
					variant="outline"
					size="lg"
					onClick={onBack}
					disabled={isFirstStep || isProcessing}
					className="border-secondary/60 bg-gradient-to-r from-secondary via-secondary/90 to-secondary text-white shadow-md hover:from-secondary/90 hover:to-secondary disabled:opacity-70"
				>
					Voltar
				</Button>
				<Button
					type={nextButtonType}
					size="lg"
					onClick={isLastStep ? undefined : onNext}
					disabled={nextDisabled}
					className="border-secondary/60 bg-gradient-to-r from-secondary via-secondary/90 to-secondary text-white shadow-md hover:from-secondary/90 hover:to-secondary disabled:opacity-70"
				>
					{isSubmitting ? 'Salvando...' : isLastStep ? 'Publicar evento' : 'Continuar'}
				</Button>
			</div>
		</div>
	);
}
