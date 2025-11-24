/**
 * Performance optimization utilities for enhanced UI smoothness
 */

// Type definitions
interface FrameRequestCallback {
  (timestamp: number): void;
}

interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  mode?: RequestMode;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  integrity?: string;
  keepalive?: boolean;
  signal?: AbortSignal | null;
  window?: null;
}

/**
 * Throttle function to limit the rate of function execution
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastExecTime = 0;

    return (...args: Parameters<T>) => {
        const currentTime = Date.now();

        if (currentTime - lastExecTime > delay) {
            func(...args);
            lastExecTime = currentTime;
        } else {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func(...args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
};

/**
 * Debounce function to delay function execution until after a pause
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

/**
 * Memoization utility for expensive computations
 */
export const memoize = <T extends (...args: unknown[]) => unknown>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
): T => {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = func(...args) as ReturnType<T>;
        cache.set(key, result);
        return result;
    }) as T;
};

/**
 * Lazy loading utility for components and images
 */
export class LazyLoader {
    private static observers = new Map<Element, IntersectionObserver>();

    /**
     * Set up lazy loading for an element
     */
    static observe(
        element: Element,
        callback: (entry: IntersectionObserverEntry) => void,
        rootMargin: string = '50px'
    ): void {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        callback(entry);
                        this.unobserve(element);
                    }
                });
            },
            { rootMargin }
        );

        this.observers.set(element, observer);
        observer.observe(element);
    }

    /**
     * Stop observing an element
     */
    static unobserve(element: Element): void {
        const observer = this.observers.get(element);
        if (observer) {
            observer.unobserve(element);
            observer.disconnect();
            this.observers.delete(element);
        }
    }

    /**
     * Clean up all observers
     */
    static cleanup(): void {
        this.observers.forEach((observer) => {
            observer.disconnect();
        });
        this.observers.clear();
    }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    private static metrics = new Map<string, number>();

    /**
     * Start timing a performance metric
     */
    static start(name: string): void {
        this.metrics.set(name, performance.now());
    }

    /**
     * End timing a performance metric
     */
    static end(name: string): number {
        const startTime = this.metrics.get(name);
        if (startTime === undefined) {
            console.warn(`Performance metric "${name}" was not started`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.metrics.delete(name);

        // Log performance warnings
        if (duration > 100) {
            console.warn(`Slow operation detected: "${name}" took ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    /**
     * Measure a function's execution time
     */
    static measure<T>(name: string, fn: () => T): T {
        this.start(name);
        const result = fn();
        this.end(name);
        return result;
    }

    /**
     * Measure an async function's execution time
     */
    static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        this.start(name);
        const result = await fn();
        this.end(name);
        return result;
    }
}

/**
 * Virtual scrolling utility for large lists
 */
export class VirtualScroller {
    private itemHeight: number;
    private containerHeight: number;
    private totalItems: number;
    private scrollTop: number = 0;

    constructor(itemHeight: number, containerHeight: number, totalItems: number) {
        this.itemHeight = itemHeight;
        this.containerHeight = containerHeight;
        this.totalItems = totalItems;
    }

    /**
     * Get the range of visible items
     */
    getVisibleRange(scrollTop: number): { start: number; end: number; offsetY: number } {
        this.scrollTop = scrollTop;

        const start = Math.floor(scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        const end = Math.min(start + visibleCount + 1, this.totalItems); // +1 for buffering
        const offsetY = start * this.itemHeight;

        return { start, end, offsetY };
    }

    /**
     * Get the total height of the virtualized content
     */
    getTotalHeight(): number {
        return this.totalItems * this.itemHeight;
    }

    /**
     * Update the total number of items
     */
    updateTotalItems(totalItems: number): void {
        this.totalItems = totalItems;
    }
}

/**
 * Image optimization utilities
 */
export const imageOptimization = {
    /**
     * Create a responsive image set
     */
    createResponsiveSet: (baseUrl: string, sizes: number[]): string => {
        return sizes
            .map(size => `${baseUrl}?w=${size} ${size}w`)
            .join(', ');
    },

    /**
     * Generate a low-quality placeholder (LQIP)
     */
    generateLQIP: (imageUrl: string, quality: number = 10): string => {
        return `${imageUrl}?quality=${quality}&blur=10`;
    },

    /**
     * Preload critical images
     */
    preloadImages: (urls: string[]): void => {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = url;
            document.head.appendChild(link);
        });
    },
};

/**
 * Animation frame utilities for smooth animations
 */
export class AnimationFrame {
    private static rafId: number | null = null;
    private static callbacks = new Map<string, FrameRequestCallback>();

    /**
     * Register a callback to run on the next animation frame
     */
    static register(id: string, callback: FrameRequestCallback): void {
        this.callbacks.set(id, callback);

        if (!this.rafId) {
            this.rafId = requestAnimationFrame((timestamp) => {
                this.callbacks.forEach((cb) => cb(timestamp));
                this.callbacks.clear();
                this.rafId = null;
            });
        }
    }

    /**
     * Unregister a callback
     */
    static unregister(id: string): void {
        this.callbacks.delete(id);
    }

    /**
     * Throttle an animation callback
     */
    static throttle(callback: FrameRequestCallback): FrameRequestCallback {
        let rafId: number | null = null;

        return (_timestamp: number) => {
            if (!rafId) {
                rafId = requestAnimationFrame((frameTimestamp) => {
                    callback(frameTimestamp);
                    rafId = null;
                });
            }
        };
    }
}

/**
 * Resource loading optimization
 */
export const resourceOptimization = {
    /**
     * Load a script asynchronously
     */
    loadScript: (url: string, async: boolean = true): Promise<void> => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = async;

            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));

            document.head.appendChild(script);
        });
    },

    /**
     * Load a stylesheet asynchronously
     */
    loadStylesheet: (url: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;

            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));

            document.head.appendChild(link);
        });
    },

    /**
     * Prefetch a resource
     */
    prefetch: (url: string, as: string): void => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = as;
        document.head.appendChild(link);
    },
};

/**
 * Memory management utilities
 */
export const memoryManagement = {
    /**
     * Clear all event listeners from an element
     */
    clearEventListeners: (element: Element): void => {
        const clone = element.cloneNode(true);
        element.parentNode?.replaceChild(clone, element);
    },

    /**
     * Dispose of a component and clean up resources
     */
    dispose: (element: Element): void => {
        LazyLoader.unobserve(element);
        memoryManagement.clearEventListeners(element);
    },

    /**
     * Check memory usage (if available)
     */
    getMemoryUsage: (): {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
    } | null => {
        if ('memory' in performance) {
            return (performance as Performance & {
                memory: {
                    usedJSHeapSize: number;
                    totalJSHeapSize: number;
                    jsHeapSizeLimit: number;
                };
            }).memory;
        }
        return null;
    },
};

/**
 * Bundle size optimization utilities
 */
export const bundleOptimization = {
    /**
     * Dynamic import with error handling
     */
    dynamicImport: async <T>(modulePath: string): Promise<T> => {
        try {
            PerformanceMonitor.start(`dynamic-import-${modulePath}`);
            const module = await import(modulePath);
            PerformanceMonitor.end(`dynamic-import-${modulePath}`);
            return module as T;
        } catch (error) {
            console.error(`Failed to dynamically import ${modulePath}:`, error);
            throw error;
        }
    },

    /**
     * Load a component on demand
     */
    lazyLoadComponent: async <T>(
        componentLoader: () => Promise<{ default: T }>,
        fallback?: T
    ): Promise<T> => {
        try {
            const module = await componentLoader();
            return module.default;
        } catch (error) {
            console.error('Failed to load component:', error);
            if (fallback) {
                return fallback;
            }
            throw error;
        }
    },
};

/**
 * Network optimization utilities
 */
export const networkOptimization = {
    /**
     * Make an HTTP request with timeout and retry logic
     */
    fetchWithRetry: async (
        url: string,
        options: RequestInit = {},
        maxRetries: number = 3,
        timeout: number = 5000
    ): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchWithTimeout = async (attempt: number = 1): Promise<Response> => {
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);

                if (attempt < maxRetries && error instanceof Error && error.name !== 'AbortError') {
                    console.warn(`Fetch attempt ${attempt} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    return fetchWithTimeout(attempt + 1);
                }

                throw error;
            }
        };

        return fetchWithTimeout();
    },

    /**
     * Cache API responses
     */
    createCache: (ttl: number = 5 * 60 * 1000) => {
        const cache = new Map<string, { data: unknown; timestamp: number }>();

        return {
            get: (key: string) => {
                const entry = cache.get(key);
                if (!entry) return null;

                if (Date.now() - entry.timestamp > ttl) {
                    cache.delete(key);
                    return null;
                }

                return entry.data;
            },

            set: (key: string, data: unknown) => {
                cache.set(key, { data, timestamp: Date.now() });
            },

            clear: (): void => {
                cache.clear();
            },

            delete: (key: string): boolean => {
                return cache.delete(key);
            },
        };
    },
};
