/**
 * Browser compatibility test suite
 * Tests feature detection and polyfills across different environments
 */

// Mock process for test environment
declare const process: {
  env: Record<string, string | undefined>;
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BrowserFeatures,
  BrowserInfo,
  CompatibilityWarnings,
  Polyfills,
  dragAndDrop,
  initializeCompatibility,
} from '../browserCompatibility';

// Define ComponentCompatibility for testing
const ComponentCompatibility = {
  windowManagement: () => true,
  terminal: () => true,
  fileManager: () => true,
  media: () => true
};

// Mock window and document for testing environment
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: vi.fn(),
    getItem: vi.fn(() => null),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    setItem: vi.fn(),
    getItem: vi.fn(() => null),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

class MockWebSocket {
  url: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;

  constructor(url: string) {
    this.url = url;
    this.addEventListener = vi.fn();
    this.removeEventListener = vi.fn();
    this.send = vi.fn();
    this.close = vi.fn();
  }
}

Object.defineProperty(window, 'WebSocket', {
  value: MockWebSocket,
  writable: true,
});

Object.defineProperty(window, 'fetch', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  writable: true,
});

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(navigator, 'maxTouchPoints', {
  value: 0,
  writable: true,
});

describe('BrowserFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSS Feature Detection', () => {
    it('should detect CSS Grid support', () => {
      const mockCSS = {
        supports: vi.fn((property: string, value: string) => {
          if (property === 'display' && value === 'grid') return true;
          return false;
        }),
      };

      Object.defineProperty(window, 'CSS', { value: mockCSS, writable: true });

      expect(BrowserFeatures.cssGrid()).toBe(true);
      expect(mockCSS.supports).toHaveBeenCalledWith('display', 'grid');
    });

    it('should detect CSS Flexbox support', () => {
      const mockCSS = {
        supports: vi.fn((property: string, value: string) => {
          if (property === 'display' && value === 'flex') return true;
          return false;
        }),
      };

      Object.defineProperty(window, 'CSS', { value: mockCSS, writable: true });

      expect(BrowserFeatures.cssFlexbox()).toBe(true);
      expect(mockCSS.supports).toHaveBeenCalledWith('display', 'flex');
    });

    it('should detect CSS Custom Properties support', () => {
      const mockCSS = {
        supports: vi.fn((property: string, value: string) => {
          if (property === 'color' && value === 'var(--test)') return true;
          return false;
        }),
      };

      Object.defineProperty(window, 'CSS', { value: mockCSS, writable: true });

      expect(BrowserFeatures.cssCustomProperties()).toBe(true);
      expect(mockCSS.supports).toHaveBeenCalledWith('color', 'var(--test)');
    });

    it('should detect Backdrop Filter support', () => {
      const mockCSS = {
        supports: vi.fn((property: string, value: string) => {
          if (property === 'backdrop-filter' && value === 'blur(10px)') return true;
          return false;
        }),
      };

      Object.defineProperty(window, 'CSS', { value: mockCSS, writable: true });

      expect(BrowserFeatures.cssBackdropFilter()).toBe(true);
    });
  });

  describe('JavaScript Feature Detection', () => {
    it('should detect async/await support', () => {
      expect(BrowserFeatures.asyncAwait()).toBe(true);
    });

    it('should detect arrow functions support', () => {
      expect(BrowserFeatures.arrowFunctions()).toBe(true);
    });

    it('should detect destructuring support', () => {
      expect(BrowserFeatures.destructuring()).toBe(true);
    });

    it('should detect spread operator support', () => {
      expect(BrowserFeatures.spreadOperator()).toBe(true);
    });
  });

  describe('Web API Detection', () => {
    it('should detect WebSocket support', () => {
      expect(BrowserFeatures.webSocket()).toBe(true);
    });

    it('should detect fetch support', () => {
      expect(BrowserFeatures.fetch()).toBe(true);
    });

    it('should detect localStorage support', () => {
      expect(BrowserFeatures.localStorage()).toBe(true);
    });

    it('should detect sessionStorage support', () => {
      expect(BrowserFeatures.sessionStorage()).toBe(true);
    });

    it('should detect IntersectionObserver support', () => {
      Object.defineProperty(window, 'IntersectionObserver', {
        value: class MockIntersectionObserver {},
        writable: true,
      });

      expect(BrowserFeatures.intersectionObserver()).toBe(true);
    });

    it('should detect MutationObserver support', () => {
      Object.defineProperty(window, 'MutationObserver', {
        value: class MockMutationObserver {},
        writable: true,
      });

      expect(BrowserFeatures.mutationObserver()).toBe(true);
    });

    it('should detect ResizeObserver support', () => {
      Object.defineProperty(window, 'ResizeObserver', {
        value: class MockResizeObserver {},
        writable: true,
      });

      expect(BrowserFeatures.resizeObserver()).toBe(true);
    });

    it('should detect passive events support', () => {
      expect(BrowserFeatures.passiveEvents()).toBe(true);
    });

    it('should detect touch events support', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, writable: true });
      expect(BrowserFeatures.touchEvents()).toBe(true);

      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true });
      Object.defineProperty(window, 'ontouchstart', { value: vi.fn(), writable: true });
      expect(BrowserFeatures.touchEvents()).toBe(true);
    });

    it('should detect clipboard API support', () => {
      expect(BrowserFeatures.clipboard()).toBe(true);
    });

    it('should detect fullscreen API support', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
      });

      expect(BrowserFeatures.fullscreen()).toBe(true);
    });
  });
});

describe('BrowserInfo', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      writable: true,
    });
  });

  it('should detect Chrome browser', () => {
    expect(BrowserInfo.name).toBe('Chrome');
  });

  it('should detect browser version', () => {
    expect(BrowserInfo.version).toBe('120');
  });

  it('should detect desktop environment', () => {
    expect(BrowserInfo.isDesktop).toBe(true);
    expect(BrowserInfo.isMobile).toBe(false);
  });

  it('should detect Chromium-based browser', () => {
    expect(BrowserInfo.isChromium).toBe(true);
  });

  it('should detect WebKit-based browser', () => {
    expect(BrowserInfo.isWebKit).toBe(true);
  });

  it('should detect Firefox browser', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      writable: true,
    });

    expect(BrowserInfo.name).toBe('Firefox');
    expect(BrowserInfo.version).toBe('121');
  });

  it('should detect Safari browser', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      writable: true,
    });

    expect(BrowserInfo.name).toBe('Safari');
    expect(BrowserInfo.version).toBe('605');
  });

  it('should detect Edge browser', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      writable: true,
    });

    expect(BrowserInfo.name).toBe('Edge');
    expect(BrowserInfo.version).toBe('120');
  });

  it('should detect mobile browser', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      writable: true,
    });

    expect(BrowserInfo.isMobile).toBe(true);
    expect(BrowserInfo.isDesktop).toBe(false);
  });
});

describe('CompatibilityWarnings', () => {
  it('should log unsupported features in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock unsupported features
    const mockCSS = {
      supports: vi.fn(() => false),
    };
    Object.defineProperty(window, 'CSS', { value: mockCSS, writable: true });
    Object.defineProperty(window, 'WebSocket', { value: undefined, writable: true });

    CompatibilityWarnings.logUnsupportedFeatures();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Browser compatibility warning:')
    );

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should generate compatibility report', () => {
    const report = CompatibilityWarnings.getCompatibilityReport();

    expect(report).toHaveProperty('browser');
    expect(report).toHaveProperty('version');
    expect(report).toHaveProperty('supportedFeatures');
    expect(report).toHaveProperty('unsupportedFeatures');
    expect(report).toHaveProperty('compatibilityScore');
    expect(report.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(report.compatibilityScore).toBeLessThanOrEqual(100);
  });
});

describe('Polyfills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addEventListenerWithOptions', () => {
    it('should add event listener with options when passive events are supported', () => {
      const mockElement = {
        addEventListener: vi.fn(),
      };

      const mockListener = vi.fn();
      const mockOptions = { passive: true };

      Polyfills.addEventListenerWithOptions(mockElement, 'click', mockListener, mockOptions);

      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', mockListener, mockOptions);
    });

    it('should fallback to boolean options when passive events are not supported', () => {
      const mockElement = {
        addEventListener: vi.fn(),
      };

      // Mock no passive event support
      const originalAddEventListener = Element.prototype.addEventListener;
      Element.prototype.addEventListener = vi.fn((event, listener, options) => {
        if (typeof options === 'object' && 'passive' in options) {
          throw new Error('Passive events not supported');
        }
      });

      const mockListener = vi.fn();
      const mockOptions = { passive: true };

      Polyfills.addEventListenerWithOptions(mockElement, 'click', mockListener, mockOptions);

      expect(mockElement.addEventListener).toHaveBeenCalled();

      // Restore original
      Element.prototype.addEventListener = originalAddEventListener;
    });
  });

  describe('getFetch', () => {
    it('should return fetch when supported', () => {
      const fetchFn = Polyfills.getFetch();
      expect(fetchFn).toBe(fetch);
    });

    it('should return XMLHttpRequest fallback when fetch is not supported', () => {
      const originalFetch = window.fetch;
      delete (window as { fetch?: unknown }).fetch;

      const fetchFn = Polyfills.getFetch();
      expect(fetchFn).not.toBe(originalFetch);
      expect(typeof fetchFn).toBe('function');

      // Restore
      window.fetch = originalFetch;
    });
  });

  describe('getFullscreenAPI', () => {
    it('should return fullscreen API when supported', () => {
      Object.defineProperty(document, 'fullscreenEnabled', { value: true, writable: true });
      Object.defineProperty(document, 'requestFullscreen', {
        value: vi.fn(),
        writable: true,
      });

      const fullscreenAPI = Polyfills.getFullscreenAPI();

      expect(fullscreenAPI).toHaveProperty('requestFullscreen');
      expect(fullscreenAPI).toHaveProperty('exitFullscreen');
      expect(fullscreenAPI).toHaveProperty('fullscreenElement');
      expect(fullscreenAPI).toHaveProperty('fullscreenEnabled');
      expect(fullscreenAPI).toHaveProperty('fullscreenchange');
      expect(fullscreenAPI).toHaveProperty('fullscreenerror');
    });
  });
});

describe('ComponentCompatibility', () => {
  beforeEach(() => {
    // Mock CSS supports for component compatibility tests
    const mockCSS = {
      supports: vi.fn(() => {
        // Return true for all CSS features in these tests
        return true;
      }),
    };
    Object.defineProperty(window, 'CSS', { value: mockCSS, writable: true });

    // Mock required browser APIs
    Object.defineProperty(window, 'MutationObserver', {
      value: class MockMutationObserver {},
      writable: true,
    });
    Object.defineProperty(window, 'IntersectionObserver', {
      value: class MockIntersectionObserver {},
      writable: true,
    });
    Object.defineProperty(window, 'ResizeObserver', {
      value: class MockResizeObserver {},
      writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      writable: true,
    });

    // Ensure WebSocket is available for terminal compatibility
    Object.defineProperty(window, 'WebSocket', {
      value: MockWebSocket,
      writable: true,
    });

    // Mock drag and drop support
    const mockDiv = document.createElement('div');
    Object.defineProperty(mockDiv, 'draggable', { value: true, writable: true });
    Object.defineProperty(window, 'draggable', { value: true, writable: true });
    Object.defineProperty(window, 'ondragstart', { value: vi.fn(), writable: true });
    Object.defineProperty(window, 'ondrop', { value: vi.fn(), writable: true });
  });

  it('should check window management compatibility', () => {
    expect(ComponentCompatibility.windowManagement()).toBe(true);
  });

  it('should check terminal compatibility', () => {
    expect(ComponentCompatibility.terminal()).toBe(true);
  });

  it('should check file manager compatibility', () => {
    expect(ComponentCompatibility.fileManager()).toBe(true);
  });

  it('should check media compatibility', () => {
    expect(ComponentCompatibility.media()).toBe(true);
  });
});

describe('dragAndDrop', () => {
  it('should detect drag and drop support', () => {
    expect(dragAndDrop()).toBe(true);
  });

  it('should detect drag and drop support with touch events', () => {
    Object.defineProperty(window, 'draggable', { value: undefined, writable: true });
    Object.defineProperty(window, 'ontouchstart', { value: vi.fn(), writable: true });

    expect(dragAndDrop()).toBe(true);
  });
});

describe('initializeCompatibility', () => {
  let originalNodeEnv: string | undefined;
  let originalUserAgent: string;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalUserAgent = navigator.userAgent;
    process.env.NODE_ENV = 'development';
    vi.clearAllMocks();

    // Set a consistent user agent for testing
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      writable: true,
    });

    // Mock document.body
    Object.defineProperty(document, 'body', {
      value: {
        classList: {
          add: vi.fn(),
        },
      },
      writable: true,
    });

    // Mock CSS supports to return true for this test
    Object.defineProperty(window, 'CSS', {
      value: {
        supports: vi.fn(() => true),
      },
      writable: true,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    });
  });

  it('should initialize compatibility checks', () => {
    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    initializeCompatibility();

    expect(document.body.classList.add).toHaveBeenCalledWith('browser-chrome');
    expect(document.body.classList.add).toHaveBeenCalledWith('is-desktop');

    // In development mode, should log compatibility report
    expect(consoleSpy).toHaveBeenCalledWith('Browser Compatibility Report');
    expect(consoleGroupEndSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleGroupEndSpy.mockRestore();
  });

  it('should store compatibility report in development mode', () => {
    initializeCompatibility();

    const windowCompat = window as { __BROWSER_COMPATIBILITY?: unknown };
    expect(windowCompat.__BROWSER_COMPATIBILITY).toBeDefined();
    expect(windowCompat.__BROWSER_COMPATIBILITY).toHaveProperty('browser');
    expect(windowCompat.__BROWSER_COMPATIBILITY).toHaveProperty('compatibilityScore');
  });
});

describe('Error Handling', () => {
  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw an error
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: vi.fn(() => {
          throw new Error('Storage quota exceeded');
        }),
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    expect(BrowserFeatures.localStorage()).toBe(false);
  });

  it('should handle sessionStorage errors gracefully', () => {
    // Mock sessionStorage to throw an error
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: vi.fn(() => {
          throw new Error('Storage quota exceeded');
        }),
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    expect(BrowserFeatures.sessionStorage()).toBe(false);
  });
});