import React, { useState } from 'react';
import { Check, Flame, Play } from 'lucide-react';
import { CATEGORY_LABELS, GameCategory, GameDefinition } from '../games/types';
import { GAMES_REGISTRY } from '../games/registry';
import { SanchStorageData } from '../utils/storage';
import {
  getEffectiveStreak,
  getRecentWeekStreakDays,
  isDailyCompletedOn,
} from '../games/logic/dailyChallenge';

interface StatsViewProps {
  storage: SanchStorageData;
  dailyGame: GameDefinition;
  dateKey: string;
  onSelectGame: (id: string) => void;
  onResetStats: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  storage,
  dailyGame,
  dateKey,
  onSelectGame,
  onResetStats,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const entries = Object.entries(storage.records);
  const totalPlays = entries.reduce((sum, [, r]) => sum + r.plays, 0);
  const totalWins = entries.reduce((sum, [, r]) => sum + r.wins, 0);
  const gamesTried = entries.filter(([, r]) => r.plays > 0).length;

  const currentStreak = getEffectiveStreak(storage.daily, dateKey);
  const bestStreak = storage.daily.bestStreak;
  const totalDailyCleared = storage.daily.totalCompleted;
  const completedToday = isDailyCompletedOn(storage.daily, dateKey);
  const weekDays = getRecentWeekStreakDays(storage.daily, dateKey);

  const categories: GameCategory[] = ['arcade', 'puzzle', 'board', 'cards', 'word', 'brain'];

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 sm:pb-6 flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-50">
          Offline Player Profile
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          All scores, daily streaks, and progress are saved locally on your device.
        </p>
      </div>

      {/* SPECIAL DAILY CHALLENGE STREAK COUNTER */}
      <section
        data-testid="profile-streak-card"
        aria-label="Daily Challenge Streak"
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                currentStreak > 0
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Daily Challenge Streak
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  data-testid="streak-count"
                  className="text-2xl sm:text-3xl font-display font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50"
                >
                  {currentStreak}
                </span>
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  {currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-left sm:text-right border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800 pt-3 sm:pt-0">
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Best Streak</div>
              <div className="text-lg font-mono font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {bestStreak}d
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Challenges Cleared</div>
              <div className="text-lg font-mono font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {totalDailyCleared}
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Rolling Completion Strip */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="grid grid-cols-7 gap-1.5 flex-1 max-w-sm" aria-label="Last 7 days streak history">
            {weekDays.map((day) => (
              <div
                key={day.dateKey}
                aria-label={`${day.dateKey}: ${day.completed ? 'Completed' : 'Not completed'}`}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {day.label}
                </span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono tabular-nums ${
                    day.completed
                      ? 'bg-orange-600 text-white'
                      : day.isToday
                      ? 'border border-dashed border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {day.completed ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span>{day.dateKey.slice(8)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            {completedToday ? (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Today&apos;s challenge cleared ({dailyGame.title})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSelectGame(dailyGame.id)}
                className="min-h-[44px] px-4 rounded-xl bg-orange-600 text-white text-xs font-display font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-orange-700"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Today: {dailyGame.title}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Games Tried</div>
          <div className="text-2xl font-display font-bold tabular-nums mt-1">
            {gamesTried} / {GAMES_REGISTRY.length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Sessions</div>
          <div className="text-2xl font-display font-bold tabular-nums mt-1">{totalPlays}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Victories</div>
          <div className="text-2xl font-display font-bold tabular-nums mt-1">{totalWins}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Favorites</div>
          <div className="text-2xl font-display font-bold tabular-nums mt-1">
            {storage.favorites.length}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-display font-bold mb-3">Category Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => {
            const catGames = GAMES_REGISTRY.filter((g) => g.category === cat);
            const tried = catGames.filter((g) => (storage.records[g.id]?.plays ?? 0) > 0).length;
            const pct = Math.round((tried / catGames.length) * 100);
            return (
              <div key={cat} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                  <span className="font-mono tabular-nums text-zinc-500">
                    {tried}/{catGames.length}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-orange-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-display font-bold mb-3">Personal Bests</h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {entries
              .sort((a, b) => b[1].lastPlayed - a[1].lastPlayed)
              .slice(0, 15)
              .map(([id, rec]) => {
                const game = GAMES_REGISTRY.find((g) => g.id === id);
                if (!game) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectGame(id)}
                    className="w-full py-2.5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold">{game.title}</div>
                      <div className="text-xs text-zinc-500">
                        {rec.plays} plays · {rec.wins} wins
                      </div>
                    </div>
                    <div className="text-sm font-mono font-bold tabular-nums text-orange-600 dark:text-orange-400">
                      {rec.bestScore} {game.scoreUnit}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="min-h-[40px] px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Reset Local Scores
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 font-medium">Clear all local records?</span>
            <button
              type="button"
              onClick={() => {
                onResetStats();
                setConfirmReset(false);
              }}
              className="min-h-[38px] px-3 rounded-xl bg-red-600 text-white text-xs font-bold"
            >
              Confirm Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="min-h-[38px] px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
