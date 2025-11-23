import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outlined' | 'elevated' | 'glass';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    interactive?: boolean;
    loading?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({
        className,
        variant = 'default',
        padding = 'md',
        interactive = false,
        loading = false,
        children,
        ...props
    }, ref) => {
        const baseClasses = [
            'rounded-lg border',
            'transition-all duration-200',
        ];

        const variantClasses = {
            default: [
                'bg-gray-800 border-gray-700',
                'hover:border-gray-600',
            ],
            outlined: [
                'bg-gray-900/50 border-gray-600',
                'hover:border-gray-500',
                'backdrop-blur-sm',
            ],
            elevated: [
                'bg-gray-800 border-gray-700 shadow-lg shadow-gray-900/20',
                'hover:shadow-xl hover:shadow-gray-900/30 hover:-translate-y-1',
            ],
            glass: [
                'bg-gray-800/30 border-gray-700/50',
                'hover:bg-gray-800/40 hover:border-gray-600/50',
                'backdrop-blur-lg',
                'shadow-lg shadow-gray-900/10',
            ],
        };

        const paddingClasses = {
            none: '',
            sm: 'p-3',
            md: 'p-4',
            lg: 'p-6',
        };

        const interactiveClasses = interactive ? [
            'cursor-pointer hover:border-blue-500/50',
            'hover:shadow-lg hover:shadow-blue-500/10',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
            'transform hover:-translate-y-0.5',
        ] : [];

        const loadingClasses = loading ? [
            'animate-pulse bg-gray-700/50',
            'pointer-events-none',
        ] : [];

        return (
            <div
                className={cn(
                    ...baseClasses,
                    ...variantClasses[variant],
                    paddingClasses[padding],
                    ...interactiveClasses,
                    ...loadingClasses,
                    className
                )}
                ref={ref}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? 'button' : undefined}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export { Card };