import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTouchDevice,
  usePrefersReducedMotion,
  useResponsive,
  BREAKPOINTS,
} from '@/hooks/useMediaQuery';

// Helper to create a mock MediaQueryList
function createMockMediaQueryList(matches: boolean): MediaQueryList {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];

  const addEventListener = vi.fn((event: string, callback: EventListenerOrEventListenerObject) => {
    if (event === 'change' && typeof callback === 'function') {
      listeners.push(callback as (e: MediaQueryListEvent) => void);
    }
  });

  const removeEventListener = vi.fn(
    (event: string, callback: EventListenerOrEventListenerObject) => {
      if (event === 'change' && typeof callback === 'function') {
        const index = listeners.indexOf(callback as (e: MediaQueryListEvent) => void);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  );

  return {
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener,
    removeEventListener,
    dispatchEvent: vi.fn((event: MediaQueryListEvent) => {
      listeners.forEach((listener) => listener(event));
      return true;
    }),
  } as MediaQueryList;
}

describe('useMediaQuery hook', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  describe('BREAKPOINTS', () => {
    it('should have correct Tailwind breakpoint values', () => {
      expect(BREAKPOINTS.sm).toBe(640);
      expect(BREAKPOINTS.md).toBe(768);
      expect(BREAKPOINTS.lg).toBe(1024);
      expect(BREAKPOINTS.xl).toBe(1280);
      expect(BREAKPOINTS['2xl']).toBe(1536);
    });
  });

  describe('useMediaQuery', () => {
    it('should return initial match state', () => {
      const mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
    });

    it('should return false when query does not match', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(result.current).toBe(false);
    });

    it('should add and remove event listener', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      unmount();

      expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('useIsMobile', () => {
    it('should return true when viewport is mobile sized', () => {
      const mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith(`(max-width: ${BREAKPOINTS.md - 1}px)`);
    });

    it('should return false when viewport is not mobile sized', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);
    });
  });

  describe('useIsTablet', () => {
    it('should return true when viewport is tablet sized', () => {
      const mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useIsTablet());

      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith(`(max-width: ${BREAKPOINTS.lg - 1}px)`);
    });

    it('should return false when viewport is not tablet sized', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useIsTablet());

      expect(result.current).toBe(false);
    });
  });

  describe('useIsDesktop', () => {
    it('should return true when viewport is desktop sized', () => {
      const mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useIsDesktop());

      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith(`(min-width: ${BREAKPOINTS.lg}px)`);
    });

    it('should return false when viewport is not desktop sized', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useIsDesktop());

      expect(result.current).toBe(false);
    });
  });

  describe('useIsTouchDevice', () => {
    it('should return true for touch devices', () => {
      const mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useIsTouchDevice());

      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse)');
    });

    it('should return false for non-touch devices', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useIsTouchDevice());

      expect(result.current).toBe(false);
    });
  });

  describe('usePrefersReducedMotion', () => {
    it('should return true when reduced motion is preferred', () => {
      const mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => usePrefersReducedMotion());

      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should return false when reduced motion is not preferred', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => usePrefersReducedMotion());

      expect(result.current).toBe(false);
    });
  });

  describe('useResponsive', () => {
    it('should return responsive state object', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useResponsive());

      expect(result.current).toHaveProperty('isMobile');
      expect(result.current).toHaveProperty('isTablet');
      expect(result.current).toHaveProperty('isDesktop');
      expect(result.current).toHaveProperty('isTouchDevice');
      expect(result.current).toHaveProperty('prefersReducedMotion');
    });

    it('should return all false for desktop non-touch device', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isTouchDevice).toBe(false);
      expect(result.current.prefersReducedMotion).toBe(false);
    });

    it('should return correct values for mobile touch device', () => {
      const mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isTouchDevice).toBe(true);
    });
  });
});
