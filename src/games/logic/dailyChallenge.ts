import { GameDefinition } from '../types';

export interface DailyChallengeRecord {
  gameId: string;
  score: number;
  won: boolean;
}

export interface DailyChallengeState {
  currentStreak: number;
  bestStreak: number;
  totalCompleted: number;
  lastCompletedDate: string | null;
  history: Record<string, DailyChallengeRecord>;
}

export const DEFAULT_DAILY_STATE: DailyChallengeState = {
  currentStreak: 0,
  bestStreak: 0,
  totalCompleted: 0,
  lastCompletedDate: null,
  history: {},
};

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  const py = prev.getUTCFullYear();
  const pm = String(prev.getUTCMonth() + 1).padStart(2, '0');
  const pd = String(prev.getUTCDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

export function formatReadableDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function hashDateKey(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Extra avalanche mix
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function pickDailyGame<T extends Pick<GameDefinition, 'id'>>(
  dateKey: string,
  games: readonly T[]
): T {
  if (games.length === 0) {
    throw new Error('Cannot pick daily game from an empty registry');
  }
  if (games.length === 1) return games[0];

  const prevKey = getPreviousDateKey(dateKey);
  const prevIdx = hashDateKey(`sanch-daily-v1:${prevKey}`) % games.length;
  let idx = hashDateKey(`sanch-daily-v1:${dateKey}`) % games.length;
  if (idx === prevIdx) {
    idx = (idx + 1) % games.length;
  }
  return games[idx];
}

export function getEffectiveStreak(
  daily: DailyChallengeState,
  todayKey: string = getLocalDateKey()
): number {
  if (!daily.lastCompletedDate) return 0;
  if (
    daily.lastCompletedDate === todayKey ||
    daily.lastCompletedDate === getPreviousDateKey(todayKey)
  ) {
    return daily.currentStreak;
  }
  return 0;
}

export function isDailyCompletedOn(
  daily: DailyChallengeState,
  dateKey: string
): boolean {
  return daily.lastCompletedDate === dateKey || Boolean(daily.history[dateKey]);
}

export function applyDailyCompletion(
  daily: DailyChallengeState,
  dateKey: string,
  dailyGameId: string,
  playedGameId: string,
  score: number,
  won: boolean,
  higherIsBetter: boolean
): { next: DailyChallengeState; newlyCompleted: boolean } {
  if (playedGameId !== dailyGameId) {
    return { next: daily, newlyCompleted: false };
  }

  const existing = daily.history[dateKey];
  const alreadyDoneToday = daily.lastCompletedDate === dateKey || Boolean(existing);

  let bestDailyScore = score;
  if (existing) {
    if (higherIsBetter) {
      bestDailyScore = Math.max(existing.score, score);
    } else if (score > 0 && (existing.score === 0 || score < existing.score)) {
      bestDailyScore = score;
    } else {
      bestDailyScore = existing.score;
    }
  }

  const nextHistory: Record<string, DailyChallengeRecord> = {
    ...daily.history,
    [dateKey]: {
      gameId: dailyGameId,
      score: bestDailyScore,
      won: Boolean(existing?.won || won),
    },
  };

  // Prune entries older than 45 records so storage remains compact
  const keys = Object.keys(nextHistory).sort();
  if (keys.length > 45) {
    for (const oldKey of keys.slice(0, keys.length - 45)) {
      delete nextHistory[oldKey];
    }
  }

  if (alreadyDoneToday) {
    return {
      next: {
        ...daily,
        history: nextHistory,
      },
      newlyCompleted: false,
    };
  }

  const yesterdayKey = getPreviousDateKey(dateKey);
  const consecutive = daily.lastCompletedDate === yesterdayKey;
  const nextStreak = consecutive ? daily.currentStreak + 1 : 1;
  const nextBestStreak = Math.max(daily.bestStreak, nextStreak);

  return {
    next: {
      currentStreak: nextStreak,
      bestStreak: nextBestStreak,
      totalCompleted: daily.totalCompleted + 1,
      lastCompletedDate: dateKey,
      history: nextHistory,
    },
    newlyCompleted: true,
  };
}

export interface StreakWeekDay {
  dateKey: string;
  label: string;
  completed: boolean;
  isToday: boolean;
}

export function getRecentWeekStreakDays(
  daily: DailyChallengeState,
  todayKey: string = getLocalDateKey()
): StreakWeekDay[] {
  const days: StreakWeekDay[] = [];
  let cursor = todayKey;
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    keys.unshift(cursor);
    cursor = getPreviousDateKey(cursor);
  }
  for (const key of keys) {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const label = dt.toLocaleDateString('en-US', {
      weekday: 'narrow',
      timeZone: 'UTC',
    });
    days.push({
      dateKey: key,
      label,
      completed: Boolean(daily.history[key]) || daily.lastCompletedDate === key,
      isToday: key === todayKey,
    });
  }
  return days;
}
