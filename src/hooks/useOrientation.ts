import { useEffect, useState } from 'react';

export interface OrientationState {
  width: number;
  height: number;
  isLandscape: boolean;
  isCompactHeight: boolean;
  isMobile: boolean;
  prefersReducedMotion: boolean;
}

function readOrientation(): OrientationState {
  if (typeof window === 'undefined') {
    return {
      width: 390,
      height: 844,
      isLandscape: false,
      isCompactHeight: false,
      isMobile: true,
      prefersReducedMotion: false,
    };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;
  const isCompactHeight = height < 520;
  const isMobile = Math.min(width, height) < 768;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  return { width, height, isLandscape, isCompactHeight, isMobile, prefersReducedMotion };
}

export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>(readOrientation);

  useEffect(() => {
    const update = () => setState(readOrientation());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return state;
}
