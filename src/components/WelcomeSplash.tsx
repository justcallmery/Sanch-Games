import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface WelcomeSplashProps {
  isLandscape: boolean;
  onComplete: () => void;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({
  isLandscape,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const exitingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    window.setTimeout(() => onCompleteRef.current(), 220);
  }, []);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const duration = reduced ? 400 : 1400;
    let rafId = 0;
    let doneTimer = 0;

    const tick = (now: number) => {
      const pct = Math.min(100, Math.round(((now - start) / duration) * 100));
      setProgress(pct);
      if (pct < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        doneTimer = window.setTimeout(finish, reduced ? 100 : 250);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (doneTimer) window.clearTimeout(doneTimer);
    };
  }, [finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  return (
    <div
      data-testid="welcome-splash"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#F4F5F7] dark:bg-[#111318] text-zinc-900 dark:text-zinc-100 p-6 transition-opacity duration-200 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className={`w-full max-w-xl flex ${
          isLandscape ? 'flex-row items-center gap-8 text-left' : 'flex-col items-center gap-6 text-center'
        } justify-center`}
      >
        {/* Bespoke Handheld Cartridge Emblem */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-zinc-900 dark:bg-zinc-800 border-2 border-zinc-700/80 shadow-xl flex items-center justify-center">
            <svg viewBox="0 0 64 64" className="w-16 h-16" aria-hidden="true">
              <rect x="8" y="10" width="48" height="24" rx="5" fill="#0F766E" />
              <rect x="12" y="14" width="40" height="16" rx="3" fill="#115E59" />
              <path d="M20 22h8m-4-4v8" stroke="#F4F4F5" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="40" cy="20" r="2.6" fill="#FB923C" />
              <circle cx="46" cy="24" r="2.6" fill="#FBBF24" />
              <rect x="14" y="42" width="14" height="4.5" rx="2.2" fill="#52525B" />
              <rect x="18.7" y="37.3" width="4.5" height="14" rx="2.2" fill="#52525B" />
              <circle cx="41" cy="45" r="3.5" fill="#EA580C" />
              <circle cx="49" cy="41" r="3.5" fill="#F59E0B" />
            </svg>
          </div>
        </div>

        <div className={`flex flex-col ${isLandscape ? 'items-start' : 'items-center'} gap-3 flex-1 max-w-xs w-full`}>
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-balance">
              SanchGames
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              54 Offline Games · Portrait &amp; Landscape
            </p>
          </div>

          {/* Loading Progress Track */}
          <div className="w-full flex flex-col gap-1.5 mt-1">
            <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-orange-600 rounded-full origin-left transition-transform duration-100"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              <span>{progress < 100 ? 'Loading offline library...' : 'Welcome!'}</span>
              <span>{progress}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={finish}
            className="mt-1 min-h-[44px] px-5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-display font-bold text-sm inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-transform"
          >
            <span>Enter Arcade</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
