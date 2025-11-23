import React from 'react';
import { cn } from '../../utils/cn';

export interface LoadingProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
    text?: string;
    className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
    size = 'md',
    variant = 'spinner',
    text,
    className
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const textSizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    const renderSpinner = () => (
        <svg
            className={cn('animate-spin', sizeClasses[size], 'text-blue-400')}
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

    const renderDots = () => (
        <div className={cn('flex space-x-1', sizeClasses[size])}>
            {[0, 1, 2].map((index) => (
                <div
                    key={index}
                    className={cn(
                        'bg-blue-400 rounded-full',
                        size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3',
                        'animate-bounce'
                    )}
                    style={{
                        animationDelay: `${index * 0.1}s`,
                        animationDuration: '1.4s'
                    }}
                    aria-hidden="true"
                />
            ))}
        </div>
    );

    const renderPulse = () => (
        <div
            className={cn(
                'bg-blue-400 rounded-full animate-pulse',
                sizeClasses[size]
            )}
            aria-hidden="true"
        />
    );

    const renderSkeleton = () => (
        <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-700 rounded w-3/4 skeleton"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 skeleton"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6 skeleton"></div>
        </div>
    );

    const renderVariant = () => {
        switch (variant) {
            case 'dots':
                return renderDots();
            case 'pulse':
                return renderPulse();
            case 'skeleton':
                return renderSkeleton();
            default:
                return renderSpinner();
        }
    };

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center',
                text && 'gap-3',
                className
            )}
            role="status"
            aria-label={text || 'Loading'}
        >
            {renderVariant()}
            {text && (
                <p className={cn('text-gray-400', textSizeClasses[size])}>
                    {text}
                </p>
            )}
        </div>
    );
};

export interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className,
    variant = 'rectangular',
    width,
    height,
    lines = 1
}) => {
    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-none',
        rounded: 'rounded-md',
    };

    const style = {
        width: width || (variant === 'text' ? '100%' : undefined),
        height: height || (variant === 'text' ? '1rem' : undefined),
    };

    if (variant === 'text' && lines > 1) {
        return (
            <div className="space-y-2">
                {Array.from({ length: lines }, (_, index) => (
                    <div
                        key={index}
                        className={cn(
                            'bg-gray-700 skeleton',
                            variantClasses[variant],
                            index === lines - 1 ? 'w-3/4' : 'w-full',
                            className
                        )}
                        style={style}
                        aria-hidden="true"
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'bg-gray-700 skeleton',
                variantClasses[variant],
                className
            )}
            style={style}
            aria-hidden="true"
        />
    );
};

export interface ProgressProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'error';
    showLabel?: boolean;
    className?: string;
    label?: string;
}

export const Progress: React.FC<ProgressProps> = ({
    value,
    max = 100,
    size = 'md',
    variant = 'default',
    showLabel = false,
    className,
    label
}) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const sizeClasses = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
    };

    const variantClasses = {
        default: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500',
    };

    return (
        <div className={cn('w-full', className)}>
            {(label || showLabel) && (
                <div className="flex justify-between mb-2">
                    {label && (
                        <span className="text-sm font-medium text-gray-100">
                            {label}
                        </span>
                    )}
                    {showLabel && (
                        <span className="text-sm text-gray-400">
                            {Math.round(percentage)}%
                        </span>
                    )}
                </div>
            )}
            <div
                className={cn(
                    'w-full bg-gray-700 rounded-full overflow-hidden',
                    sizeClasses[size]
                )}
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={label || `Progress: ${Math.round(percentage)}%`}
            >
                <div
                    className={cn(
                        'h-full transition-all duration-300 ease-out progress-enhanced',
                        variantClasses[variant]
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default Loading;