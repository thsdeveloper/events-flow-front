'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventWizardStepMeta } from './types';

interface WizardProgressBarProps {
	steps: EventWizardStepMeta[];
	currentStep: number;
	visitedSteps: Set<number>;
	onStepSelect?: (index: number) => void;
}

export function WizardProgressBar({ steps, currentStep, visitedSteps, onStepSelect }: WizardProgressBarProps) {
	const progress = Math.max(0, (currentStep / (steps.length - 1)) * 100);

	return (
		<div>
			<div className="flex items-center justify-between">
				<div className="flex-1">
					<div className="relative h-2 rounded-full bg-muted/80 shadow-inner">
						<div
							className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-all"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			</div>

			<ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
				{steps.map((step, index) => {
					const isActive = index === currentStep;
					const isVisited = visitedSteps.has(index);
					const isCompleted = index < currentStep;
					const isClickable = !!onStepSelect && isVisited;

					return (
							<li key={step.id}>
								<button
									type="button"
									onClick={() => isClickable && onStepSelect?.(index)}
									className={cn(
										'w-full rounded-lg border px-3 py-3 text-left transition-colors',
										isActive && 'border-primary bg-primary/25 text-primary-foreground shadow-sm',
										!isActive && isVisited && 'border-border bg-muted/70 text-foreground',
										!isVisited && 'border-dashed border-border/60 text-muted-foreground',
										isClickable ? 'hover:border-primary/40 hover:bg-primary/10' : 'cursor-default opacity-60',
									)}
									aria-current={isActive ? 'step' : undefined}
								>
									<div className="flex items-center gap-2">
										<span
											className={cn(
												'grid size-5 place-content-center rounded-full border text-[10px] font-semibold',
												isCompleted
													? 'border-primary bg-primary text-primary-foreground'
													: isVisited
														? 'border-border bg-background text-foreground'
														: 'border-border',
											)}
										>
											{isCompleted ? <Check className="size-3" /> : index + 1}
										</span>
										<span className="font-medium">{step.title}</span>
									</div>
									<p
										className={cn(
											'mt-1 line-clamp-2 text-[11px]',
											isActive ? 'text-primary-foreground/80' : 'text-muted-foreground',
										)}
									>
										{step.description}
									</p>
								</button>
							</li>
					);
				})}
			</ul>
		</div>
	);
}
