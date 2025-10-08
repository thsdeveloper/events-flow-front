import { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

type SemanticElement = 'div' | 'section' | 'main' | 'article' | 'aside' | 'nav' | 'header' | 'footer' | 'form';

interface ContainerProps extends PropsWithChildren {
	className?: string;
	as?: SemanticElement;
	role?: string;
}

const Container = ({ children = null, className = '', as: Component = 'div', role }: ContainerProps) => {
	if (!children) return null;

	return (
		<Component className={cn('container mx-auto px-4 sm:px-6', className)} role={role}>
			{children}
		</Component>
	);
};

export default Container;
