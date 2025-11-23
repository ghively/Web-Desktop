import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        className,
        variant = 'primary',
        size = 'md',
        loading = false,
        icon,
        iconPosition = 'left',
        fullWidth = false,
        children,
        disabled,
        ...props
    }, ref) => {
        const baseClasses = [
            'inline-flex items-center justify-center font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'interactive-element',
        ];

        const variantClasses = {
            primary: [
                'bg-blue-600 hover:bg-blue-700 text-white',
                'focus:ring-blue-500',
                'hover:shadow-lg hover:shadow-blue-600/20',
            ],
            secondary: [
                'bg-gray-700 hover:bg-gray-600 text-gray-100',
                'focus:ring-gray-500',
                'hover:shadow-lg hover:shadow-gray-600/20',
            ],
            destructive: [
                'bg-red-600 hover:bg-red-700 text-white',
                'focus:ring-red-500',
                'hover:shadow-lg hover:shadow-red-600/20',
            ],
            outline: [
                'border border-gray-600 bg-gray-800/50 hover:bg-gray-700/50 text-gray-100',
                'focus:ring-gray-500',
                'backdrop-blur-sm',
            ],
            ghost: [
                'hover:bg-gray-700/50 text-gray-100',
                'focus:ring-gray-500',
                'transparent',
            ],
            link: [
                'text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline',
                'focus:ring-blue-500',
                'transparent',
                'h-auto p-0',
            ],
        };

        const sizeClasses = {
            sm: 'h-8 px-3 text-sm rounded-md',
            md: 'h-10 px-4 py-2 text-sm rounded-lg',
            lg: 'h-12 px-6 text-base rounded-lg',
        };

        const loadingSpinner = (
            <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
        );

        const iconElement = icon && !loading && (
            <span className={cn('flex-shrink-0', iconPosition === 'left' ? 'mr-2' : 'ml-2')}>
                {icon}
            </span>
        );

        const content = (
            <>
                {iconPosition === 'left' && iconElement}
                {loading && loadingSpinner}
                {children}
                {iconPosition === 'right' && iconElement}
            </>
        );

        return (
            <button
                className={cn(
                    ...baseClasses,
                    ...variantClasses[variant],
                    sizeClasses[size],
                    fullWidth && 'w-full',
                    variant !== 'link' && (loading || disabled) && 'cursor-wait',
                    className
                )}
                ref={ref}
                disabled={disabled || loading}
                aria-disabled={disabled || loading}
                aria-busy={loading}
                {...props}
            >
                {content}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };