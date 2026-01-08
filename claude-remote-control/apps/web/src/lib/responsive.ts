/**
 * Responsive utilities and TypeScript interfaces for mobile support
 */

import { BREAKPOINTS, type Breakpoint } from '@/hooks/useMediaQuery';

/**
 * Mobile sidebar state management
 */
export interface MobileSidebarState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

/**
 * Mobile layout configuration
 */
export interface MobileLayoutConfig {
  /** Whether to use drawer pattern for sidebar on mobile */
  useSidebarDrawer: boolean;
  /** Whether to hide header on scroll (for mobile) */
  hideHeaderOnScroll: boolean;
  /** Minimum touch target size in pixels (WCAG 2.5.5: 44px) */
  minTouchTargetSize: number;
  /** Whether to use bottom navigation on mobile */
  useBottomNav: boolean;
}

export const DEFAULT_MOBILE_CONFIG: MobileLayoutConfig = {
  useSidebarDrawer: true,
  hideHeaderOnScroll: false,
  minTouchTargetSize: 44,
  useBottomNav: true,
};

/**
 * Get responsive class names based on visibility at breakpoints
 */
export function getResponsiveClasses(config: {
  hidden?: Breakpoint[];
  visible?: Breakpoint[];
}): string {
  const classes: string[] = [];

  if (config.hidden) {
    config.hidden.forEach((bp) => {
      if (bp === 'sm') classes.push('sm:hidden');
      else if (bp === 'md') classes.push('md:hidden');
      else if (bp === 'lg') classes.push('lg:hidden');
      else if (bp === 'xl') classes.push('xl:hidden');
    });
  }

  if (config.visible) {
    config.visible.forEach((bp) => {
      if (bp === 'sm') classes.push('hidden sm:block');
      else if (bp === 'md') classes.push('hidden md:block');
      else if (bp === 'lg') classes.push('hidden lg:block');
      else if (bp === 'xl') classes.push('hidden xl:block');
    });
  }

  return classes.join(' ');
}

/**
 * Get touch-friendly button classes
 */
export function getTouchFriendlyClasses(options?: {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
}): string {
  const { size = 'md', variant = 'button' } = options || {};

  const baseClasses = 'touch-manipulation active:scale-[0.98]';

  const sizeClasses = {
    sm: variant === 'icon' ? 'min-w-[36px] min-h-[36px]' : 'min-h-[36px] px-3 py-2',
    md: variant === 'icon' ? 'min-w-[44px] min-h-[44px]' : 'min-h-[44px] px-4 py-2.5',
    lg: variant === 'icon' ? 'min-w-[52px] min-h-[52px]' : 'min-h-[52px] px-6 py-3',
  };

  return `${baseClasses} ${sizeClasses[size]}`;
}

/**
 * Check if a given width is considered mobile
 */
export function isMobileWidth(width: number): boolean {
  return width < BREAKPOINTS.md;
}

/**
 * Check if a given width is considered tablet
 */
export function isTabletWidth(width: number): boolean {
  return width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
}

/**
 * Check if a given width is considered desktop
 */
export function isDesktopWidth(width: number): boolean {
  return width >= BREAKPOINTS.lg;
}

/**
 * Get the current breakpoint name from a width
 */
export function getCurrentBreakpoint(width: number): Breakpoint | 'xs' {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Container width utilities for different breakpoints
 */
export const CONTAINER_MAX_WIDTHS = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Safe area inset CSS variable references for iOS notch/home indicator
 */
export const SAFE_AREA_INSETS = {
  top: 'env(safe-area-inset-top, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)',
} as const;

/**
 * Mobile viewport height utility (accounts for mobile browser chrome)
 */
export function getMobileViewportHeight(): string {
  return 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))';
}
