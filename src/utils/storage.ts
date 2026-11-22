import {
  applyDailyCompletion,
  DailyChallengeState,
  DEFAULT_DAILY_STATE,
  getLocalDateKey,
} from '../games/logic/dailyChallenge';

export interface GameRecord {
  bestScore: number;
  wins: number;
  plays: number;
  lastPlayed: number;
  bestTimeSec?: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  muted: boolean;
}

export interface SanchStorageData {
  records: Record<string, GameRecord>;
  favorites: string[];
  recent: string[];
  prefs: UserPreferences;
  daily: DailyChallengeState;
}

const STORAGE_KEY = 'sanchgames_offline_v1';

const DEFAULT_DATA: SanchStorageData = {
  records: {},
  favorites: ['snake', 'game-2048', 'chess', 'klondike', 'word-guess'],
  recent: [],
  prefs: {
    theme: 'light',
    muted: false,
  },
  daily: structuredClone(DEFAULT_DAILY_STATE),
};

export function loadStorage(): SanchStorageData {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_DATA);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw) as Partial<SanchStorageData>;
    const rawDaily = parsed.daily;
    return {
      records: parsed.records ?? {},
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : DEFAULT_DATA.favorites,
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      prefs: {
        theme: parsed.prefs?.theme === 'dark' ? 'dark' : 'light',
        muted: Boolean(parsed.prefs?.muted),
      },
      daily: rawDaily
        ? {
            currentStreak: Number(rawDaily.currentStreak) || 0,
            bestStreak: Number(rawDaily.bestStreak) || 0,
            totalCompleted: Number(rawDaily.totalCompleted) || 0,
            lastCompletedDate:
              typeof rawDaily.lastCompletedDate === 'string'
                ? rawDaily.lastCompletedDate
                : null,
            history: rawDaily.history && typeof rawDaily.history === 'object' ? rawDaily.history : {},
          }
        : structuredClone(DEFAULT_DAILY_STATE),
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

export function saveStorage(data: SanchStorageData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or disabled
  }
}

export function recordGamePlay(
  data: SanchStorageData,
  gameId: string,
  score: number,
  won: boolean,
  higherIsBetter: boolean,
  elapsedSec?: number,
  dailyGameId?: string,
  dateKey: string = getLocalDateKey()
): SanchStorageData {
  const prev = data.records[gameId] ?? {
    bestScore: 0,
    wins: 0,
    plays: 0,
    lastPlayed: 0,
  };

  let nextBest = prev.bestScore;
  if (prev.plays === 0) {
    nextBest = score;
  } else if (higherIsBetter) {
    nextBest = Math.max(prev.bestScore, score);
  } else if (score > 0) {
    nextBest = prev.bestScore === 0 ? score : Math.min(prev.bestScore, score);
  }

  let bestTimeSec = prev.bestTimeSec;
  if (won && typeof elapsedSec === 'number' && elapsedSec > 0) {
    bestTimeSec = bestTimeSec === undefined ? elapsedSec : Math.min(bestTimeSec, elapsedSec);
  }

  const nextRecent = [gameId, ...data.recent.filter((id) => id !== gameId)].slice(0, 12);

  const nextDaily = dailyGameId
    ? applyDailyCompletion(
        data.daily,
        dateKey,
        dailyGameId,
        gameId,
        score,
        won,
        higherIsBetter
      ).next
    : data.daily;

  return {
    ...data,
    records: {
      ...data.records,
      [gameId]: {
        bestScore: nextBest,
        wins: prev.wins + (won ? 1 : 0),
        plays: prev.plays + 1,
        lastPlayed: Date.now(),
        bestTimeSec,
      },
    },
    recent: nextRecent,
    daily: nextDaily,
  };
}
