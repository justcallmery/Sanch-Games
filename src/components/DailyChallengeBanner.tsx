import React from 'react';
import { CheckCircle2, Flame, Play } from 'lucide-react';
import { CATEGORY_LABELS, GameDefinition } from '../games/types';
import { formatReadableDateKey } from '../games/logic/dailyChallenge';
import { GameArtwork } from './GameArtwork';

interface DailyChallengeBannerProps {
  game: GameDefinition;
  dateKey: string;
  completedToday: boolean;
  todayScore?: number;
  streakDays: number;
  onPlay: () => void;
}

export const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({
  game,
  dateKey,
  completedToday,
  todayScore,
  streakDays,
  onPlay,
}) => {
  const readableDate = formatReadableDateKey(dateKey);

  return (
    <section
      data-testid="daily-challenge-card"
      aria-label="Daily Challenge"
      className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <GameArtwork game={game} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 truncate">
            <span>Daily Challenge</span>
            <span aria-hidden="true">·</span>
            <span>{readableDate}</span>
            <span aria-hidden="true">·</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {CATEGORY_LABELS[game.category]}
            </span>
          </div>

          <h2 className="font-display font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-50 truncate mt-0.5">
            {game.title}
          </h2>

          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
            {completedToday ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="tabular-nums">
                  Completed today · {todayScore ?? 0} {game.scoreUnit}
                </span>
              </span>
            ) : (
              <span>
                Finish 1 round today to claim your streak
                {streakDays > 0 ? (
                  <span className="inline-flex items-center gap-1 ml-1.5 font-semibold text-orange-600 dark:text-orange-400 tabular-nums">
                    <span aria-hidden="true">·</span>
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    {streakDays}d active
                  </span>
                ) : null}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onPlay}
        className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-display font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-opacity hover:opacity-95 active:scale-[0.98] ${
          completedToday
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            : 'bg-orange-600 text-white'
        }`}
      >
        <Play className="w-4 h-4 fill-current shrink-0" />
        <span>{completedToday ? 'Play Again' : 'Play Daily Challenge'}</span>
      </button>
    </section>
  );
};
