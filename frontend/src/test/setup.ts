import '@testing-library/jest-dom';
import { vi, expect, afterEach } from 'vitest';

// Type definitions for mock globals
/* eslint-disable @typescript-eslint/no-unused-vars */
interface _IntersectionObserverCallback {
  (entries: unknown[], observer: unknown): void;
}

interface _IntersectionObserverInit {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

interface _ResizeObserverCallback {
  (entries: unknown[], observer: unknown): void;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

declare global {
  const IntersectionObserver: unknown;
  const ResizeObserver: unknown;
  const WebSocket: unknown;
  const fetch: unknown;
  var global: unknown;
}

// Mock IntersectionObserver
/* eslint-disable no-undef */
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
global.fetch = vi.fn();
/* eslint-enable no-undef */

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Custom matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = received && document.body.contains(received);
    return {
      message: () =>
        pass
          ? `expected element not to be in the document`
          : `expected element to be in the document`,
      pass,
    };
  },
});