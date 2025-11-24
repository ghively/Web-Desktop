/**
 * Browser Compatibility Component
 * Initializes and manages browser compatibility features
 */

import React, { useEffect, useState } from 'react';
import { initializeCompatibility, BrowserInfo, ComponentCompatibility } from '../utils/browserCompatibility';

interface BrowserCompatibilityState {
  isCompatible: boolean;
  compatibilityScore: number;
  unsupportedFeatures: string[];
  showWarning: boolean;
  browserInfo: {
    name: string;
    version: string;
    isMobile: boolean;
  };
}

export const BrowserCompatibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BrowserCompatibilityState>({
    isCompatible: true,
    compatibilityScore: 100,
    unsupportedFeatures: [],
    showWarning: false,
    browserInfo: {
      name: 'Unknown',
      version: 'Unknown',
      isMobile: false,
    },
  });

  useEffect(() => {
    // Initialize compatibility checks
    initializeCompatibility();

    // Check component compatibility
    const checkCompatibility = () => {
      const browserInfo = {
        name: BrowserInfo.name,
        version: BrowserInfo.version,
        isMobile: BrowserInfo.isMobile,
      };

      // Check critical component compatibility
      const windowManagementCompatible = ComponentCompatibility.windowManagement();
      const terminalCompatible = ComponentCompatibility.terminal();
      const fileManagerCompatible = ComponentCompatibility.fileManager();
      const mediaCompatible = ComponentCompatibility.media();

      const unsupportedFeatures: string[] = [];
      if (!windowManagementCompatible) unsupportedFeatures.push('Window Management');
      if (!terminalCompatible) unsupportedFeatures.push('Terminal');
      if (!fileManagerCompatible) unsupportedFeatures.push('File Manager');
      if (!mediaCompatible) unsupportedFeatures.push('Media Features');

      const isCompatible = windowManagementCompatible && terminalCompatible && fileManagerCompatible;
      const compatibilityScore = Math.round(
        (([windowManagementCompatible, terminalCompatible, fileManagerCompatible, mediaCompatible].filter(Boolean).length) / 4) * 100
      );

      setState({
        isCompatible,
        compatibilityScore,
        unsupportedFeatures,
        showWarning: compatibilityScore < 75,
        browserInfo,
      });

      // Add compatibility classes to body
      const body = document.body;
      body.classList.toggle('incompatible', !isCompatible);
      body.classList.toggle('partial-compatibility', compatibilityScore < 100 && compatibilityScore >= 75);
      body.classList.toggle('low-compatibility', compatibilityScore < 75);

      // Log compatibility info in development
      if (process.env.NODE_ENV === 'development') {
        console.group('Component Compatibility Check');
        console.log('Browser:', `${browserInfo.name} ${browserInfo.version}`);
        console.log('Platform:', browserInfo.isMobile ? 'Mobile' : 'Desktop');
        console.log('Window Management:', windowManagementCompatible ? '✓' : '✗');
        console.log('Terminal:', terminalCompatible ? '✓' : '✗');
        console.log('File Manager:', fileManagerCompatible ? '✓' : '✗');
        console.log('Media Features:', mediaCompatible ? '✓' : '✗');
        console.log('Overall Compatibility:', `${compatibilityScore}%`);
        console.groupEnd();
      }
    };

    checkCompatibility();

    // Recheck on window resize (might affect mobile/desktop detection)
    const handleResize = () => {
      // Debounce the check
      const timeoutId = setTimeout(checkCompatibility, 250);
      return () => clearTimeout(timeoutId);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  if (!state.isCompatible) {
    return <IncompatibleBrowserWarning state={state} />;
  }

  if (state.showWarning) {
    return (
      <>
        <CompatibilityWarning state={state} />
        {children}
      </>
    );
  }

  return <>{children}</>;
};

const CompatibilityWarning: React.FC<{ state: BrowserCompatibilityState }> = ({ state }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed top-16 right-4 z-50 max-w-md p-4 bg-yellow-900/90 border border-yellow-700 rounded-lg text-yellow-400 shadow-lg animate-slide-in-right">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-medium text-yellow-300">Limited Browser Support</div>
          <div className="text-sm mt-1">
            Your browser ({state.browserInfo.name} {state.browserInfo.version}) has limited support for some features.
            {state.unsupportedFeatures.length > 0 && (
              <div className="mt-1">
                <strong>Affected features:</strong> {state.unsupportedFeatures.join(', ')}
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-yellow-300">Compatibility Score: {state.compatibilityScore}%</span>
            <span className="text-yellow-500">•</span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setDismissed(true);
              }}
              className="text-yellow-300 hover:text-yellow-200 underline"
            >
              Dismiss
            </a>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 text-yellow-400 hover:text-yellow-200 transition-colors"
          aria-label="Dismiss warning"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const IncompatibleBrowserWarning: React.FC<{ state: BrowserCompatibilityState }> = ({ state }) => {
  const recommendedBrowsers = [
    { name: 'Chrome', version: '108+', url: 'https://www.google.com/chrome/' },
    { name: 'Firefox', version: '107+', url: 'https://www.mozilla.org/firefox/' },
    { name: 'Safari', version: '16+', url: 'https://www.apple.com/safari/' },
    { name: 'Edge', version: '108+', url: 'https://www.microsoft.com/edge/' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-xl p-6 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Browser Not Supported</h1>
          <p className="text-gray-400">
            Your browser ({state.browserInfo.name} {state.browserInfo.version}) doesn't support essential features required for this application.
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
            <div className="text-sm text-red-300">
              <strong>Missing features:</strong>
            </div>
            <ul className="text-sm text-red-400 mt-1 space-y-1">
              {state.unsupportedFeatures.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
            <div className="text-sm text-red-300 mt-2">
              <strong>Compatibility Score:</strong> {state.compatibilityScore}%
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Recommended Browsers</h2>
          <div className="grid grid-cols-2 gap-3">
            {recommendedBrowsers.map((browser) => (
              <a
                key={browser.name}
                href={browser.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                <div className="text-left">
                  <div className="font-medium">{browser.name}</div>
                  <div className="text-xs text-gray-400">{browser.version}</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>If you're unable to update your browser, you can try our simplified version instead.</p>
          <button className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Try Simple Version
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrowserCompatibilityProvider;