import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MOBILE_CONFIG,
  getResponsiveClasses,
  getTouchFriendlyClasses,
  isMobileWidth,
  isTabletWidth,
  isDesktopWidth,
  getCurrentBreakpoint,
  CONTAINER_MAX_WIDTHS,
  SAFE_AREA_INSETS,
  getMobileViewportHeight,
} from '@/lib/responsive';

describe('responsive utilities', () => {
  describe('DEFAULT_MOBILE_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_MOBILE_CONFIG).toEqual({
        useSidebarDrawer: true,
        hideHeaderOnScroll: false,
        minTouchTargetSize: 44,
        useBottomNav: true,
      });
    });

    it('should have minTouchTargetSize that meets WCAG 2.5.5 requirements', () => {
      // WCAG 2.5.5 requires minimum 44x44 CSS pixels for touch targets
      expect(DEFAULT_MOBILE_CONFIG.minTouchTargetSize).toBeGreaterThanOrEqual(44);
    });
  });

  describe('getResponsiveClasses', () => {
    it('should return empty string when no config provided', () => {
      expect(getResponsiveClasses({})).toBe('');
    });

    it('should generate hidden classes for sm breakpoint', () => {
      const classes = getResponsiveClasses({ hidden: ['sm'] });
      expect(classes).toBe('sm:hidden');
    });

    it('should generate hidden classes for md breakpoint', () => {
      const classes = getResponsiveClasses({ hidden: ['md'] });
      expect(classes).toBe('md:hidden');
    });

    it('should generate hidden classes for lg breakpoint', () => {
      const classes = getResponsiveClasses({ hidden: ['lg'] });
      expect(classes).toBe('lg:hidden');
    });

    it('should generate hidden classes for xl breakpoint', () => {
      const classes = getResponsiveClasses({ hidden: ['xl'] });
      expect(classes).toBe('xl:hidden');
    });

    it('should generate multiple hidden classes', () => {
      const classes = getResponsiveClasses({ hidden: ['sm', 'md'] });
      expect(classes).toBe('sm:hidden md:hidden');
    });

    it('should generate visible classes for sm breakpoint', () => {
      const classes = getResponsiveClasses({ visible: ['sm'] });
      expect(classes).toBe('hidden sm:block');
    });

    it('should generate visible classes for md breakpoint', () => {
      const classes = getResponsiveClasses({ visible: ['md'] });
      expect(classes).toBe('hidden md:block');
    });

    it('should generate visible classes for lg breakpoint', () => {
      const classes = getResponsiveClasses({ visible: ['lg'] });
      expect(classes).toBe('hidden lg:block');
    });

    it('should generate visible classes for xl breakpoint', () => {
      const classes = getResponsiveClasses({ visible: ['xl'] });
      expect(classes).toBe('hidden xl:block');
    });

    it('should combine hidden and visible classes', () => {
      const classes = getResponsiveClasses({
        hidden: ['sm'],
        visible: ['lg'],
      });
      expect(classes).toBe('sm:hidden hidden lg:block');
    });
  });

  describe('getTouchFriendlyClasses', () => {
    it('should return default classes with no options', () => {
      const classes = getTouchFriendlyClasses();
      expect(classes).toContain('touch-manipulation');
      expect(classes).toContain('active:scale-[0.98]');
      expect(classes).toContain('min-h-[44px]');
      expect(classes).toContain('px-4');
    });

    it('should return small button classes', () => {
      const classes = getTouchFriendlyClasses({ size: 'sm', variant: 'button' });
      expect(classes).toContain('min-h-[36px]');
      expect(classes).toContain('px-3');
    });

    it('should return medium button classes', () => {
      const classes = getTouchFriendlyClasses({ size: 'md', variant: 'button' });
      expect(classes).toContain('min-h-[44px]');
      expect(classes).toContain('px-4');
    });

    it('should return large button classes', () => {
      const classes = getTouchFriendlyClasses({ size: 'lg', variant: 'button' });
      expect(classes).toContain('min-h-[52px]');
      expect(classes).toContain('px-6');
    });

    it('should return small icon classes', () => {
      const classes = getTouchFriendlyClasses({ size: 'sm', variant: 'icon' });
      expect(classes).toContain('min-w-[36px]');
      expect(classes).toContain('min-h-[36px]');
    });

    it('should return medium icon classes', () => {
      const classes = getTouchFriendlyClasses({ size: 'md', variant: 'icon' });
      expect(classes).toContain('min-w-[44px]');
      expect(classes).toContain('min-h-[44px]');
    });

    it('should return large icon classes', () => {
      const classes = getTouchFriendlyClasses({ size: 'lg', variant: 'icon' });
      expect(classes).toContain('min-w-[52px]');
      expect(classes).toContain('min-h-[52px]');
    });
  });

  describe('isMobileWidth', () => {
    it('should return true for widths less than 768', () => {
      expect(isMobileWidth(320)).toBe(true);
      expect(isMobileWidth(375)).toBe(true);
      expect(isMobileWidth(414)).toBe(true);
      expect(isMobileWidth(767)).toBe(true);
    });

    it('should return false for widths >= 768', () => {
      expect(isMobileWidth(768)).toBe(false);
      expect(isMobileWidth(1024)).toBe(false);
      expect(isMobileWidth(1280)).toBe(false);
    });
  });

  describe('isTabletWidth', () => {
    it('should return true for widths between 768 and 1023', () => {
      expect(isTabletWidth(768)).toBe(true);
      expect(isTabletWidth(900)).toBe(true);
      expect(isTabletWidth(1023)).toBe(true);
    });

    it('should return false for mobile widths', () => {
      expect(isTabletWidth(767)).toBe(false);
      expect(isTabletWidth(375)).toBe(false);
    });

    it('should return false for desktop widths', () => {
      expect(isTabletWidth(1024)).toBe(false);
      expect(isTabletWidth(1280)).toBe(false);
    });
  });

  describe('isDesktopWidth', () => {
    it('should return true for widths >= 1024', () => {
      expect(isDesktopWidth(1024)).toBe(true);
      expect(isDesktopWidth(1280)).toBe(true);
      expect(isDesktopWidth(1920)).toBe(true);
    });

    it('should return false for widths < 1024', () => {
      expect(isDesktopWidth(1023)).toBe(false);
      expect(isDesktopWidth(768)).toBe(false);
      expect(isDesktopWidth(375)).toBe(false);
    });
  });

  describe('getCurrentBreakpoint', () => {
    it('should return xs for very small widths', () => {
      expect(getCurrentBreakpoint(320)).toBe('xs');
      expect(getCurrentBreakpoint(639)).toBe('xs');
    });

    it('should return sm for widths >= 640', () => {
      expect(getCurrentBreakpoint(640)).toBe('sm');
      expect(getCurrentBreakpoint(767)).toBe('sm');
    });

    it('should return md for widths >= 768', () => {
      expect(getCurrentBreakpoint(768)).toBe('md');
      expect(getCurrentBreakpoint(1023)).toBe('md');
    });

    it('should return lg for widths >= 1024', () => {
      expect(getCurrentBreakpoint(1024)).toBe('lg');
      expect(getCurrentBreakpoint(1279)).toBe('lg');
    });

    it('should return xl for widths >= 1280', () => {
      expect(getCurrentBreakpoint(1280)).toBe('xl');
      expect(getCurrentBreakpoint(1535)).toBe('xl');
    });

    it('should return 2xl for widths >= 1536', () => {
      expect(getCurrentBreakpoint(1536)).toBe('2xl');
      expect(getCurrentBreakpoint(1920)).toBe('2xl');
    });
  });

  describe('CONTAINER_MAX_WIDTHS', () => {
    it('should have correct max widths for each breakpoint', () => {
      expect(CONTAINER_MAX_WIDTHS.xs).toBe('100%');
      expect(CONTAINER_MAX_WIDTHS.sm).toBe('640px');
      expect(CONTAINER_MAX_WIDTHS.md).toBe('768px');
      expect(CONTAINER_MAX_WIDTHS.lg).toBe('1024px');
      expect(CONTAINER_MAX_WIDTHS.xl).toBe('1280px');
      expect(CONTAINER_MAX_WIDTHS['2xl']).toBe('1536px');
    });
  });

  describe('SAFE_AREA_INSETS', () => {
    it('should have correct CSS variable references for iOS safe areas', () => {
      expect(SAFE_AREA_INSETS.top).toBe('env(safe-area-inset-top, 0px)');
      expect(SAFE_AREA_INSETS.right).toBe('env(safe-area-inset-right, 0px)');
      expect(SAFE_AREA_INSETS.bottom).toBe('env(safe-area-inset-bottom, 0px)');
      expect(SAFE_AREA_INSETS.left).toBe('env(safe-area-inset-left, 0px)');
    });
  });

  describe('getMobileViewportHeight', () => {
    it('should return calc expression accounting for safe areas', () => {
      const result = getMobileViewportHeight();
      expect(result).toBe('calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))');
    });
  });
});
