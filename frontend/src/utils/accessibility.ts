/**
 * Accessibility utilities for enhanced user experience
 * Provides ARIA labels, keyboard navigation, and screen reader support
 */

export const accessibilityUtils = {
  /**
   * Generate ARIA labels for buttons with icons
   */
  getButtonLabel: (text: string, iconDescription?: string): string => {
    return iconDescription ? `${text}: ${iconDescription}` : text;
  },

  /**
   * Generate ARIA labels for interactive elements
   */
  getInteractiveLabel: (action: string, target: string): string => {
    return `${action} ${target}`;
  },

  /**
   * Generate status announcements for screen readers
   */
  announceStatus: (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    announcement.textContent = message;

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  /**
   * Handle keyboard navigation patterns
   */
  handleKeyNavigation: (
    event: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onSelect: (index: number) => void,
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ): void => {
    const { key } = event;

    switch (key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        if (orientation === 'vertical' && key === 'ArrowUp') {
          event.preventDefault();
          onSelect(Math.max(0, currentIndex - 1));
        } else if (orientation === 'horizontal' && key === 'ArrowLeft') {
          event.preventDefault();
          onSelect(Math.max(0, currentIndex - 1));
        }
        break;

      case 'ArrowDown':
      case 'ArrowRight':
        if (orientation === 'vertical' && key === 'ArrowDown') {
          event.preventDefault();
          onSelect(Math.min(totalItems - 1, currentIndex + 1));
        } else if (orientation === 'horizontal' && key === 'ArrowRight') {
          event.preventDefault();
          onSelect(Math.min(totalItems - 1, currentIndex + 1));
        }
        break;

      case 'Home':
        event.preventDefault();
        onSelect(0);
        break;

      case 'End':
        event.preventDefault();
        onSelect(totalItems - 1);
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        // Trigger the action for the current item
        break;
    }
  },

  /**
   * Generate progress bar ARIA attributes
   */
  getProgressAriaProps: (value: number, max: number = 100, label?: string) => ({
    role: 'progressbar' as const,
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label || `${value}% complete`,
  }),

  /**
   * Generate dialog/modal ARIA attributes
   */
  getModalAriaProps: (title: string, labelledBy?: string) => ({
    role: 'dialog' as const,
    'aria-modal': true as const,
    'aria-labelledby': labelledBy || 'modal-title',
    'aria-describedby': 'modal-description',
  }),

  /**
   * Generate navigation menu ARIA attributes
   */
  getMenuAriaProps: (label: string, expanded?: boolean) => ({
    role: 'menu' as const,
    'aria-label': label,
    'aria-expanded': expanded || false,
  }),

  /**
   * Generate tab list ARIA attributes
   */
  getTabListProps: (label: string) => ({
    role: 'tablist' as const,
    'aria-label': label,
  }),

  /**
   * Generate tab ARIA attributes
   */
  getTabProps: (id: string, panelId: string, selected: boolean) => ({
    role: 'tab' as const,
    id: `tab-${id}`,
    'aria-controls': `panel-${panelId}`,
    'aria-selected': selected,
    tabIndex: selected ? 0 : -1,
  }),

  /**
   * Generate tab panel ARIA attributes
   */
  getTabPanelProps: (id: string, tabId: string, hidden: boolean) => ({
    role: 'tabpanel' as const,
    id: `panel-${id}`,
    'aria-labelledby': `tab-${tabId}`,
    hidden,
  }),

  /**
   * Focus management utilities
   */
  focusManagement: {
    /**
     * Trap focus within a container element
     */
    trapFocus: (container: HTMLElement): (() => void) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement[];

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;

        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable?.focus();
          }
        }
      };

      container.addEventListener('keydown', handleKeyDown);
      firstFocusable?.focus();

      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    },

    /**
     * Restore focus to previous element
     */
    restoreFocus: (previousElement?: HTMLElement): void => {
      if (previousElement && typeof previousElement.focus === 'function') {
        previousElement.focus();
      }
    },
  },

  /**
   * Color contrast checker (basic implementation)
   */
  checkContrast: (foreground: string, background: string): boolean => {
    // Simple contrast ratio calculation
    const getLuminance = (color: string): number => {
      const rgb = parseInt(color.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;

      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return contrast >= 4.5; // WCAG AA standard
  },

  /**
   * Generate skip link for keyboard navigation
   */
  createSkipLink: (targetId: string, label: string): HTMLAnchorElement => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50';
    skipLink.setAttribute('aria-label', label);

    return skipLink;
  },

  /**
   * High contrast mode detection
   */
  isHighContrastMode: (): boolean => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },

  /**
   * Reduced motion detection
   */
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Screen reader detection (heuristic)
   */
  isScreenReaderActive: (): boolean => {
    // Basic detection - not foolproof
    if (window.speechSynthesis) {
      return true;
    }

    // Check for common screen reader software
    const userAgent = navigator.userAgent.toLowerCase();
    const screenReaders = ['nvda', 'jaws', 'window-eyes', 'zoomtext'];
    return screenReaders.some(reader => userAgent.includes(reader));
  },

  /**
   * Generate responsive ARIA labels based on screen size
   */
  getResponsiveLabel: (shortLabel: string, longLabel: string): string => {
    return window.innerWidth < 768 ? shortLabel : longLabel;
  },

  /**
   * Add live region for dynamic content updates
   */
  createLiveRegion: (priority: 'polite' | 'assertive' = 'polite'): HTMLElement => {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = `live-region-${Date.now()}`;

    document.body.appendChild(liveRegion);
    return liveRegion;
  },
};

/**
 * Custom hook for using accessibility features in React components
 */
export const useAccessibility = () => {
  const announceStatus = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    accessibilityUtils.announceStatus(message, priority);
  };

  const getProgressProps = (value: number, max: number = 100, label?: string) => {
    return accessibilityUtils.getProgressAriaProps(value, max, label);
  };

  const getModalProps = (title: string, labelledBy?: string) => {
    return accessibilityUtils.getModalAriaProps(title, labelledBy);
  };

  const handleKeyboardNav = (
    event: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onSelect: (index: number) => void,
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ) => {
    accessibilityUtils.handleKeyNavigation(event, currentIndex, totalItems, onSelect, orientation);
  };

  return {
    announceStatus,
    getProgressProps,
    getModalProps,
    handleKeyboardNav,
    checkContrast: accessibilityUtils.checkContrast,
    isHighContrastMode: accessibilityUtils.isHighContrastMode,
    prefersReducedMotion: accessibilityUtils.prefersReducedMotion,
    focusManagement: accessibilityUtils.focusManagement,
  };
};