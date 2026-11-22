import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Clock,
  Gamepad2,
  Heart,
  Moon,
  Search,
  Shuffle,
  Sun,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { GAMES_REGISTRY, getGameById } from './games/registry';
import { CATEGORY_LABELS, GameCategory, GameDefinition } from './games/types';
import { GameArtwork } from './components/GameArtwork';
import { GameStageShell } from './components/GameStageShell';
import { StatsView } from './components/StatsView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { WelcomeSplash } from './components/WelcomeSplash';
import { DailyChallengeBanner } from './components/DailyChallengeBanner';
import { useOrientation } from './hooks/useOrientation';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { loadStorage, recordGamePlay, saveStorage, SanchStorageData } from './utils/storage';
import {
  DEFAULT_DAILY_STATE,
  getEffectiveStreak,
  getLocalDateKey,
  isDailyCompletedOn,
  pickDailyGame,
} from './games/logic/dailyChallenge';
import { sound } from './utils/sound';

type NavTab = 'library' | 'favorites' | 'recent' | 'stats';

export default function App() {
  const { isLandscape, width } = useOrientation();
  const isOnline = useOnlineStatus();

  const [storage, setStorage] = useState<SanchStorageData>(loadStorage);
  const [activeTab, setActiveTab] = useState<NavTab>('library');
  const [category, setCategory] = useState<GameCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Check URL params for ?game=... and ?autostart=1
  const initialParams = useMemo(() => {
    if (typeof window === 'undefined') return { gameId: null, autostart: false };
    const sp = new URLSearchParams(window.location.search);
    const autostart = sp.get('autostart') === '1';
    const gameParam = sp.get('game');
    const validGame = gameParam && getGameById(gameParam) ? gameParam : autostart ? 'snake' : null;
    return { gameId: validGame, autostart };
  }, []);

  const [activeGameId, setActiveGameId] = useState<string | null>(initialParams.gameId);
  const [autostartGame, setAutostartGame] = useState(initialParams.autostart);
  const [showSplash, setShowSplash] = useState(
    !initialParams.autostart && !initialParams.gameId
  );
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());

  useEffect(() => {
    const refreshDate = () => {
      const next = getLocalDateKey();
      setTodayKey((prev) => (prev === next ? prev : next));
    };
    window.addEventListener('focus', refreshDate);
    document.addEventListener('visibilitychange', refreshDate);
    return () => {
      window.removeEventListener('focus', refreshDate);
      document.removeEventListener('visibilitychange', refreshDate);
    };
  }, []);

  const dailyGame = useMemo(() => pickDailyGame(todayKey, GAMES_REGISTRY), [todayKey]);
  const effectiveStreak = getEffectiveStreak(storage.daily, todayKey);
  const dailyCompletedToday = isDailyCompletedOn(storage.daily, todayKey);

  // Sync dark mode class and sound mute on load & change
  useEffect(() => {
    const root = document.documentElement;
    if (storage.prefs.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    sound.setMuted(storage.prefs.muted);
    saveStorage(storage);
  }, [storage]);

  useEffect(() => {
    if (!activeGameId) {
      document.body.dataset.state = showSplash ? 'welcome' : 'hub';
    }
  }, [activeGameId, showSplash]);

  const toggleTheme = () => {
    sound.tap();
    setStorage((prev) => ({
      ...prev,
      prefs: {
        ...prev.prefs,
        theme: prev.prefs.theme === 'dark' ? 'light' : 'dark',
      },
    }));
  };

  const toggleMute = () => {
    setStorage((prev) => {
      const nextMuted = !prev.prefs.muted;
      sound.setMuted(nextMuted);
      if (!nextMuted) sound.tap();
      return {
        ...prev,
        prefs: { ...prev.prefs, muted: nextMuted },
      };
    });
  };

  const toggleFavorite = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    sound.tap();
    setStorage((prev) => {
      const exists = prev.favorites.includes(gameId);
      const favorites = exists
        ? prev.favorites.filter((id) => id !== gameId)
        : [gameId, ...prev.favorites];
      return { ...prev, favorites };
    });
  };

  const openGame = (gameId: string, auto = false) => {
    sound.tap();
    setAutostartGame(auto);
    setActiveGameId(gameId);
  };

  const openRandomGame = () => {
    const pick = GAMES_REGISTRY[Math.floor(Math.random() * GAMES_REGISTRY.length)];
    openGame(pick.id, false);
  };

  const filteredGames = useMemo(() => {
    let list: GameDefinition[] = GAMES_REGISTRY;
    if (activeTab === 'favorites') {
      list = GAMES_REGISTRY.filter((g) => storage.favorites.includes(g.id));
    } else if (activeTab === 'recent') {
      list = storage.recent
        .map((id) => getGameById(id))
        .filter((g): g is GameDefinition => Boolean(g));
    }
    if (activeTab === 'library' && category !== 'all') {
      list = list.filter((g) => g.category === category);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.tagline.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, category, searchQuery, storage.favorites, storage.recent]);

  const activeGame = activeGameId ? getGameById(activeGameId) : undefined;
  const wideRail = isLandscape && width >= 960;

  if (activeGame) {
    return (
      <GameStageShell
        game={activeGame}
        bestScore={storage.records[activeGame.id]?.bestScore ?? 0}
        isLandscape={isLandscape}
        muted={storage.prefs.muted}
        autostart={autostartGame}
        isDailyChallenge={activeGame.id === dailyGame.id}
        dailyStreak={effectiveStreak}
        onToggleMute={toggleMute}
        onBackToHub={() => {
          setActiveGameId(null);
          setAutostartGame(false);
        }}
        onRecordResult={(score, won) => {
          setStorage((prev) =>
            recordGamePlay(
              prev,
              activeGame.id,
              score,
              won,
              activeGame.higherIsBetter,
              undefined,
              dailyGame.id,
              todayKey
            )
          );
        }}
      />
    );
  }

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'library', label: 'Library', icon: <Gamepad2 className="w-5 h-5" /> },
    { id: 'favorites', label: 'Favorites', icon: <Heart className="w-5 h-5" /> },
    { id: 'recent', label: 'Recent', icon: <Clock className="w-5 h-5" /> },
    { id: 'stats', label: 'Profile', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  const categories: (GameCategory | 'all')[] = ['all', 'arcade', 'puzzle', 'board', 'cards', 'word', 'brain'];

  return (
    <>
      {showSplash && (
        <WelcomeSplash
          isLandscape={isLandscape}
          onComplete={() => setShowSplash(false)}
        />
      )}
      <div
        data-orientation={isLandscape ? 'landscape' : 'portrait'}
        className="h-full flex bg-[#F4F5F7] dark:bg-[#111318] text-zinc-900 dark:text-zinc-100 overflow-hidden"
      >
      {/* LANDSCAPE LEFT NAVIGATION RAIL */}
      {isLandscape && (
        <aside
          className={`${
            wideRail ? 'w-52' : 'w-18'
          } border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between py-3 px-2 shrink-0 pl-safe`}
        >
          <div className="flex flex-col gap-3">
            <div className={`flex items-center ${wideRail ? 'px-2 gap-2.5' : 'justify-center'}`}>
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 font-display font-extrabold text-base">
                S
              </div>
              {wideRail && (
                <span className="font-display font-extrabold text-lg tracking-tight whitespace-nowrap">
                  SanchGames
                </span>
              )}
            </div>

            <nav aria-label="Primary navigation" className="flex flex-col gap-1 mt-1">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    onClick={() => {
                      sound.tap();
                      setActiveTab(item.id);
                    }}
                    className={`min-h-[44px] rounded-xl flex items-center ${
                      wideRail ? 'px-3 gap-3 justify-start' : 'justify-center'
                    } text-sm font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-orange-600 text-white'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {item.icon}
                    {wideRail && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className={`flex ${wideRail ? 'flex-col gap-2 px-1' : 'flex-col items-center gap-2'}`}>
            <div className={`flex ${wideRail ? 'gap-2' : 'flex-col gap-1.5'}`}>
              <button
                type="button"
                aria-label={storage.prefs.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleTheme}
                className="min-w-[40px] min-h-[40px] flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                {storage.prefs.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label={storage.prefs.muted ? 'Unmute sound' : 'Mute sound'}
                onClick={toggleMute}
                className="min-w-[40px] min-h-[40px] flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                {storage.prefs.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            {wideRail && <PWAInstallButton />}
          </div>
        </aside>
      )}

      {/* MAIN CONTENT SHELL */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* PORTRAIT TOP APP BAR */}
        {!isLandscape && (
          <header className="h-12 px-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 shrink-0">
            {!searchOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-display font-extrabold text-sm">
                    S
                  </div>
                  <span className="font-display font-extrabold text-lg tracking-tight whitespace-nowrap">
                    SanchGames
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Search games"
                    onClick={() => setSearchOpen(true)}
                    className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={storage.prefs.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    onClick={toggleTheme}
                    className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {storage.prefs.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    aria-label={storage.prefs.muted ? 'Unmute sound' : 'Mute sound'}
                    onClick={toggleMute}
                    className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {storage.prefs.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <PWAInstallButton />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="search"
                  autoFocus
                  aria-label="Search 54 games"
                  placeholder="Search 54 offline games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  aria-label="Close search"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </header>
        )}

        {/* SCROLLABLE BODY */}
        <main className="flex-1 overflow-y-auto">
          {!isOnline && (
            <div className="mx-3 mt-2 px-3 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-medium flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>Offline Mode Active — All 54 games run locally without internet.</span>
            </div>
          )}

          {activeTab === 'stats' ? (
            <StatsView
              storage={storage}
              dailyGame={dailyGame}
              dateKey={todayKey}
              onSelectGame={(id) => openGame(id, false)}
              onResetStats={() => {
                sound.tap();
                setStorage((prev) => ({
                  ...prev,
                  records: {},
                  recent: [],
                  daily: structuredClone(DEFAULT_DAILY_STATE),
                }));
              }}
            />
          ) : (
            <div className={`max-w-7xl mx-auto p-3 sm:p-5 ${!isLandscape ? 'pb-20' : 'pb-6'} flex flex-col gap-4`}>
              {/* Top Workspace Toolbar (Search in Landscape + Surprise Me + Title) */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight">
                    {activeTab === 'library'
                      ? 'Offline Arcade'
                      : activeTab === 'favorites'
                      ? 'Saved Favorites'
                      : 'Recently Played'}
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {filteredGames.length} playable offline games · Portrait & Landscape ready
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isLandscape && (
                    <div className="flex items-center gap-2 px-3 min-h-[40px] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <Search className="w-4 h-4 text-zinc-400" />
                      <input
                        type="search"
                        aria-label="Search games"
                        placeholder="Search 54 games..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-36 sm:w-48 bg-transparent text-xs outline-none"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={openRandomGame}
                    className="min-h-[40px] px-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 whitespace-nowrap shrink-0"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Random Game</span>
                  </button>
                </div>
              </div>

              {/* Daily Challenge Spotlight (Library Tab) */}
              {activeTab === 'library' && !searchQuery.trim() && (
                <DailyChallengeBanner
                  game={dailyGame}
                  dateKey={todayKey}
                  completedToday={dailyCompletedToday}
                  todayScore={storage.daily.history[todayKey]?.score}
                  streakDays={effectiveStreak}
                  onPlay={() => openGame(dailyGame.id, false)}
                />
              )}

              {/* Category Filter Segmented Strip */}
              {activeTab === 'library' && (
                <div
                  role="tablist"
                  aria-label="Game categories"
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
                >
                  {categories.map((cat) => {
                    const active = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          sound.tap();
                          setCategory(cat);
                        }}
                        className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Game Cards Grid */}
              {filteredGames.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm font-semibold">No games match your current view.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategory('all');
                      setActiveTab('library');
                    }}
                    className="mt-3 min-h-[40px] px-4 rounded-xl bg-orange-600 text-white text-xs font-bold"
                  >
                    Show All 54 Games
                  </button>
                </div>
              ) : (
                <div
                  data-testid="games-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                >
                  {filteredGames.map((g) => {
                    const rec = storage.records[g.id];
                    const isFav = storage.favorites.includes(g.id);
                    return (
                      <div
                        key={g.id}
                        className="group rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-3 hover:border-orange-500/70 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => openGame(g.id, false)}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left"
                        >
                          <GameArtwork game={g} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="font-display font-bold text-sm truncate text-zinc-900 dark:text-zinc-50">
                              {g.title}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {CATEGORY_LABELS[g.category]}
                              <span aria-hidden="true"> · </span>
                              {rec && rec.plays > 0
                                ? `Best ${rec.bestScore} ${g.scoreUnit}`
                                : g.supports2P
                                ? 'AI / 2P'
                                : 'Offline'}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          aria-label={isFav ? `Remove ${g.title} from favorites` : `Add ${g.title} to favorites`}
                          onClick={(e) => toggleFavorite(e, g.id)}
                          className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isFav ? 'fill-orange-600 text-orange-600' : 'text-zinc-400'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* PORTRAIT BOTTOM TAB BAR */}
        {!isLandscape && (
          <nav
            aria-label="Bottom navigation"
            className="h-14 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 grid grid-cols-4 items-center shrink-0 pb-safe"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setActiveTab(item.id);
                  }}
                  className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    active
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
    </>
  );
}
