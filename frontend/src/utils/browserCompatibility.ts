/**
 * Browser compatibility utilities
 * Provides feature detection and polyfills for cross-browser support
 */

// Browser feature detection
export const BrowserFeatures = {
  // CSS features
  cssGrid: () => CSS.supports('display', 'grid'),
  cssFlexbox: () => CSS.supports('display', 'flex'),
  cssCustomProperties: () => CSS.supports('color', 'var(--test)'),
  cssBackdropFilter: () => CSS.supports('backdrop-filter', 'blur(10px)') || CSS.supports('-webkit-backdrop-filter', 'blur(10px)'),

  // JavaScript features
  asyncAwait: () => (async () => {})() instanceof Promise,
  arrowFunctions: () => {
    try {
      // eslint-disable-next-line no-new-func
      new Function('return () => {}')();
      return true;
    } catch {
      return false;
    }
  },
  destructuring: () => {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('const {x} = {x: 1}; return x === 1;');
      return fn() === true;
    } catch {
      return false;
    }
  },
  spreadOperator: () => {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('const arr = [...[1,2,3]]; return arr.length === 3;');
      return fn() === true;
    } catch {
      return false;
    }
  },

  // Web APIs
  webSocket: () => typeof WebSocket !== 'undefined',
  fetch: () => typeof fetch !== 'undefined',
  localStorage: () => {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
  sessionStorage: () => {
    try {
      const test = '__test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
  intersectionObserver: () => 'IntersectionObserver' in window,
  mutationObserver: () => 'MutationObserver' in window,
  resizeObserver: () => 'ResizeObserver' in window,

  // Event features
  passiveEvents: () => {
    let supportsPassive = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: () => {
          supportsPassive = true;
          return true;
        },
      });
      // @ts-ignore
      window.addEventListener('testPassive', null, opts);
      // @ts-ignore
      window.removeEventListener('testPassive', null, opts);
    } catch (e) {
      // Ignore
    }
    return supportsPassive;
  },

  // Touch support
  touchEvents: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,

  // Clipboard API
  clipboard: () => navigator.clipboard && typeof navigator.clipboard.writeText === 'function',

  // Fullscreen API
  fullscreen: () => !!(
    document.fullscreenEnabled ||
    // @ts-ignore
    document.webkitFullscreenEnabled ||
    // @ts-ignore
    document.mozFullScreenEnabled ||
    // @ts-ignore
    document.msFullscreenEnabled
  ),
};

// Browser detection utility
export const BrowserInfo = {
  get userAgent(): string {
    return navigator.userAgent;
  },

  get name(): string {
    const ua = this.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    return 'Unknown';
  },

  get version(): string {
    const ua = this.userAgent;
    const match = ua.match(/(Chrome|Firefox|Safari|Edg)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  },

  get isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(this.userAgent);
  },

  get isDesktop(): boolean {
    return !this.isMobile;
  },

  get isChromium(): boolean {
    return this.userAgent.includes('Chrome') || this.userAgent.includes('Edg');
  },

  get isWebKit(): boolean {
    return this.userAgent.includes('AppleWebKit');
  },
};

// Feature usage warnings
export const CompatibilityWarnings = {
  logUnsupportedFeatures: (): void => {
    const unsupported: string[] = [];

    // Check critical features
    if (!BrowserFeatures.cssGrid()) {
      unsupported.push('CSS Grid');
    }
    if (!BrowserFeatures.cssFlexbox()) {
      unsupported.push('CSS Flexbox');
    }
    if (!BrowserFeatures.webSocket()) {
      unsupported.push('WebSocket');
    }
    if (!BrowserFeatures.fetch()) {
      unsupported.push('Fetch API');
    }

    if (unsupported.length > 0) {
      console.warn(`Browser compatibility warning: The following features are not supported: ${unsupported.join(', ')}`);
      console.warn('Some features may not work as expected. Consider upgrading your browser.');
    }
  },

  getCompatibilityReport: (): {
    browser: string;
    version: string;
    supportedFeatures: string[];
    unsupportedFeatures: string[];
    compatibilityScore: number;
  } => {
    const features = {
      'CSS Grid': BrowserFeatures.cssGrid(),
      'CSS Flexbox': BrowserFeatures.cssFlexbox(),
      'CSS Custom Properties': BrowserFeatures.cssCustomProperties(),
      'CSS Backdrop Filter': BrowserFeatures.cssBackdropFilter(),
      'Async/Await': BrowserFeatures.asyncAwait(),
      'Arrow Functions': BrowserFeatures.arrowFunctions(),
      'Destructuring': BrowserFeatures.destructuring(),
      'Spread Operator': BrowserFeatures.spreadOperator(),
      'WebSocket': BrowserFeatures.webSocket(),
      'Fetch API': BrowserFeatures.fetch(),
      'Local Storage': BrowserFeatures.localStorage(),
      'Session Storage': BrowserFeatures.sessionStorage(),
      'Intersection Observer': BrowserFeatures.intersectionObserver(),
      'Mutation Observer': BrowserFeatures.mutationObserver(),
      'Resize Observer': BrowserFeatures.resizeObserver(),
      'Passive Events': BrowserFeatures.passiveEvents(),
      'Touch Events': BrowserFeatures.touchEvents(),
      'Clipboard API': BrowserFeatures.clipboard(),
      'Fullscreen API': BrowserFeatures.fullscreen(),
    };

    const supportedFeatures = Object.entries(features)
      .filter(([, supported]) => supported)
      .map(([name]) => name);

    const unsupportedFeatures = Object.entries(features)
      .filter(([, supported]) => !supported)
      .map(([name]) => name);

    const compatibilityScore = Math.round((supportedFeatures.length / Object.keys(features).length) * 100);

    return {
      browser: BrowserInfo.name,
      version: BrowserInfo.version,
      supportedFeatures,
      unsupportedFeatures,
      compatibilityScore,
    };
  },
};

// Polyfills and fallbacks
export const Polyfills = {
  // Event listener options polyfill
  addEventListenerWithOptions: (
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void => {
    if (BrowserFeatures.passiveEvents()) {
      element.addEventListener(type, listener, options);
    } else {
      // Fallback for browsers that don't support passive events
      element.addEventListener(type, listener, typeof options === 'boolean' ? options : false);
    }
  },

  // Fetch polyfill check
  getFetch: (): typeof fetch => {
    if (BrowserFeatures.fetch()) {
      return fetch;
    }

    // Fallback to XMLHttpRequest if fetch is not available
    const fetchPolyfill = (url: string, options?: RequestInit): Promise<Response> => {
      const opts = options || {};
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(opts.method || 'GET', url);

        // Set headers
        if (opts.headers) {
          Object.entries(opts.headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value as string);
          });
        }

        xhr.onload = () => {
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(),
            url: xhr.responseURL,
            text: () => Promise.resolve(xhr.responseText),
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            blob: () => Promise.resolve(new Blob([xhr.responseText])),
            arrayBuffer: () => Promise.resolve(xhr.response as ArrayBuffer),
            clone: () => fetchPolyfill(url, opts),
            body: null,
            bodyUsed: false,
            formData: () => Promise.reject(new Error('Not implemented')),
            redirected: false,
            type: 'basic',
          } as unknown as Response);
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(opts.body as any);
      });
    };
    return fetchPolyfill;
  },

  // Fullscreen API polyfill
  getFullscreenAPI: (): {
    requestFullscreen: (element: Element) => Promise<void>;
    exitFullscreen: () => Promise<void>;
    fullscreenElement: Element | null;
    fullscreenEnabled: boolean;
    fullscreenchange: string;
    fullscreenerror: string;
  } => {
    const element = document.documentElement as any;
    const requestFn =
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen;

    const exitFn =
      document.exitFullscreen ||
      // @ts-ignore
      document.webkitExitFullscreen ||
      // @ts-ignore
      document.mozCancelFullScreen ||
      // @ts-ignore
      document.msExitFullscreen;

    const fullscreenElement =
      document.fullscreenElement ||
      // @ts-ignore
      document.webkitFullscreenElement ||
      // @ts-ignore
      document.mozFullScreenElement ||
      // @ts-ignore
      document.msFullscreenElement;

    const fullscreenEnabled =
      document.fullscreenEnabled ||
      // @ts-ignore
      document.webkitFullscreenEnabled ||
      // @ts-ignore
      document.mozFullScreenEnabled ||
      // @ts-ignore
      document.msFullscreenEnabled;

    const fullscreenchange =
      'fullscreenchange' in document
        ? 'fullscreenchange'
        : // @ts-ignore
        'webkitfullscreenchange' in document
        ? 'webkitfullscreenchange'
        : // @ts-ignore
        'mozfullscreenchange' in document
        ? 'mozfullscreenchange'
        : 'MSFullscreenChange';

    const fullscreenerror =
      'fullscreenerror' in document
        ? 'fullscreenerror'
        : // @ts-ignore
        'webkitfullscreenerror' in document
        ? 'webkitfullscreenerror'
        : // @ts-ignore
        'mozfullscreenerror' in document
        ? 'mozfullscreenerror'
        : 'MSFullscreenError';

    return {
      requestFullscreen: (element: Element) => requestFn?.call(element) || Promise.resolve(),
      exitFullscreen: () => exitFn?.call(document) || Promise.resolve(),
      fullscreenElement,
      fullscreenEnabled: !!fullscreenEnabled,
      fullscreenchange,
      fullscreenerror,
    };
  },
};

// Compatibility checker for specific components
export const ComponentCompatibility = {
  // Check if window management features are supported
  windowManagement: (): boolean => {
    return BrowserFeatures.cssGrid() &&
           BrowserFeatures.cssFlexbox() &&
           BrowserFeatures.cssCustomProperties() &&
           BrowserFeatures.mutationObserver();
  },

  // Check if terminal features are supported
  terminal: (): boolean => {
    return BrowserFeatures.webSocket() &&
           BrowserFeatures.asyncAwait() &&
           BrowserFeatures.fetch();
  },

  // Check if file management features are supported
  fileManager: (): boolean => {
    return BrowserFeatures.fetch() &&
           BrowserFeatures.clipboard() &&
           dragAndDrop();
  },

  // Check if media features are supported
  media: (): boolean => {
    return BrowserFeatures.fetch() &&
           BrowserFeatures.intersectionObserver() &&
           BrowserFeatures.resizeObserver();
  },
};

// Drag and drop support check
export const dragAndDrop = (): boolean => {
  const div = document.createElement('div');
  return 'draggable' in div &&
         ('ondragstart' in div && 'ondrop' in div) ||
         (BrowserFeatures.touchEvents() && 'ontouchstart' in div);
};

// Initialize compatibility checks
export const initializeCompatibility = (): void => {
  // Log warnings for unsupported features
  CompatibilityWarnings.logUnsupportedFeatures();

  // Add compatibility classes to body
  const body = document.body;

  // Add browser name class
  body.classList.add(`browser-${BrowserInfo.name.toLowerCase()}`);

  // Add mobile/desktop class
  body.classList.add(BrowserInfo.isMobile ? 'is-mobile' : 'is-desktop');

  // Add feature support classes
  if (!BrowserFeatures.cssGrid()) body.classList.add('no-css-grid');
  if (!BrowserFeatures.cssFlexbox()) body.classList.add('no-css-flexbox');
  if (!BrowserFeatures.cssCustomProperties()) body.classList.add('no-css-vars');
  if (!BrowserFeatures.cssBackdropFilter()) body.classList.add('no-backdrop-filter');
  if (!BrowserFeatures.webSocket()) body.classList.add('no-websocket');
  if (!BrowserFeatures.passiveEvents()) body.classList.add('no-passive-events');

  // Store compatibility report in development
  if (process.env.NODE_ENV === 'development') {
    const report = CompatibilityWarnings.getCompatibilityReport();
    console.group('Browser Compatibility Report');
    console.log('Browser:', `${report.browser} ${report.version}`);
    console.log('Compatibility Score:', `${report.compatibilityScore}%`);
    console.log('Supported Features:', report.supportedFeatures);
    console.log('Unsupported Features:', report.unsupportedFeatures);
    console.groupEnd();

    // Store in window for debugging
    (window as any).__BROWSER_COMPATIBILITY = report;
  }
};

export default {
  BrowserFeatures,
  BrowserInfo,
  CompatibilityWarnings,
  Polyfills,
  ComponentCompatibility,
  dragAndDrop,
  initializeCompatibility,
};
