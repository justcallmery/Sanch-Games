import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Users,
  Bot,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameDefinition, VirtualControlState } from '../games/types';
import { GameArtwork } from './GameArtwork';
import { ArcadeCanvasGames } from '../games/engines/ArcadeCanvasGames';
import { PuzzleGridGames } from '../games/engines/PuzzleGridGames';
import { BoardStrategyGames } from '../games/engines/BoardStrategyGames';
import { CardCasinoGames } from '../games/engines/CardCasinoGames';
import { WordTriviaGames } from '../games/engines/WordTriviaGames';
import { BrainCasualGames } from '../games/engines/BrainCasualGames';
import { sound } from '../utils/sound';

type StageState = 'title' | 'playing' | 'paused' | 'gameover';

interface GameStageShellProps {
  game: GameDefinition;
  bestScore: number;
  isLandscape: boolean;
  muted: boolean;
  autostart?: boolean;
  isDailyChallenge?: boolean;
  dailyStreak?: number;
  onToggleMute: () => void;
  onBackToHub: () => void;
  onRecordResult: (score: number, won: boolean) => void;
}

export const GameStageShell: React.FC<GameStageShellProps> = ({
  game,
  bestScore,
  isLandscape,
  muted,
  autostart = false,
  isDailyChallenge = false,
  dailyStreak = 0,
  onToggleMute,
  onBackToHub,
  onRecordResult,
}) => {
  const [stage, setStage] = useState<StageState>(autostart ? 'playing' : 'title');
  const [score, setScore] = useState(0);
  const [scoreLabel, setScoreLabel] = useState<string | undefined>(undefined);
  const [restartNonce, setRestartNonce] = useState(0);
  const [twoPlayer, setTwoPlayer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [result, setResult] = useState<{ won: boolean; score: number; summary: string } | null>(null);

  const controlInputRef = useRef<VirtualControlState>({
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
    justAction: false,
    justDir: null,
  });

  // Sync body state attribute
  useEffect(() => {
    document.body.dataset.state = stage;
  }, [stage]);

  const startGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sound.tap();
    setResult(null);
    setScore(0);
    setScoreLabel(undefined);
    setRestartNonce((n) => n + 1);
    setStage('playing');
  }, []);

  const resumeGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setStage('playing');
  }, []);

  // Keyboard shortcuts for Title Start and Pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stage === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
      } else if ((stage === 'playing' || stage === 'paused') && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
        if (game.category === 'word' && e.key.toLowerCase() === 'p') return;
        e.preventDefault();
        setStage((s) => (s === 'playing' ? 'paused' : 'playing'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, startGame, game.category]);

  const handleScoreChange = useCallback((val: number, label?: string) => {
    setScore(val);
    setScoreLabel(label);
  }, []);

  const handleGameEnd = useCallback(
    (res: { won: boolean; score: number; summary: string }) => {
      setResult(res);
      setScore(res.score);
      setStage('gameover');
      onRecordResult(res.score, res.won);
    },
    [onRecordResult]
  );

  const renderEngine = () => {
    const commonProps = {
      game,
      isLandscape,
      isPaused: stage !== 'playing',
      restartNonce,
      twoPlayer,
      onScoreChange: handleScoreChange,
      onGameEnd: handleGameEnd,
      controlInputRef,
    };

    switch (game.category) {
      case 'arcade':
        return <ArcadeCanvasGames {...commonProps} />;
      case 'puzzle':
        return <PuzzleGridGames {...commonProps} />;
      case 'board':
        return <BoardStrategyGames {...commonProps} />;
      case 'cards':
        return <CardCasinoGames {...commonProps} />;
      case 'word':
        return <WordTriviaGames {...commonProps} />;
      case 'brain':
        return <BrainCasualGames {...commonProps} />;
    }
  };

  const setDir = (dir: 'up' | 'down' | 'left' | 'right', down: boolean) => {
    controlInputRef.current[dir] = down;
    if (down) controlInputRef.current.justDir = dir;
  };

  const setAction = (down: boolean) => {
    controlInputRef.current.action = down;
    if (down) controlInputRef.current.justAction = true;
  };

  const needsDpad = game.controlScheme === 'dpad' || game.controlScheme === 'dpad-action' || game.controlScheme === 'leftright';
  const needsAction = game.controlScheme === 'dpad-action' || game.controlScheme === 'tap';

  const renderDPad = () => {
    if (game.controlScheme === 'leftright') {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Move Left"
            onPointerDown={() => setDir('left', true)}
            onPointerUp={() => setDir('left', false)}
            onPointerLeave={() => setDir('left', false)}
            className="w-14 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center active:bg-orange-500 active:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="Move Right"
            onPointerDown={() => setDir('right', true)}
            onPointerUp={() => setDir('right', false)}
            onPointerLeave={() => setDir('right', false)}
            className="w-14 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center active:bg-orange-500 active:text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-1 w-[132px]">
        <div />
        <button
          type="button"
          aria-label="Up"
          onPointerDown={() => setDir('up', true)}
          onPointerUp={() => setDir('up', false)}
          onPointerLeave={() => setDir('up', false)}
          className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center active:bg-orange-500 active:text-white"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <div />
        <button
          type="button"
          aria-label="Left"
          onPointerDown={() => setDir('left', true)}
          onPointerUp={() => setDir('left', false)}
          onPointerLeave={() => setDir('left', false)}
          className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center active:bg-orange-500 active:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Down"
          onPointerDown={() => setDir('down', true)}
          onPointerUp={() => setDir('down', false)}
          onPointerLeave={() => setDir('down', false)}
          className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center active:bg-orange-500 active:text-white"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Right"
          onPointerDown={() => setDir('right', true)}
          onPointerUp={() => setDir('right', false)}
          onPointerLeave={() => setDir('right', false)}
          className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center active:bg-orange-500 active:text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const renderActionButton = () => (
    <button
      type="button"
      aria-label="Action"
      onPointerDown={() => setAction(true)}
      onPointerUp={() => setAction(false)}
      onPointerLeave={() => setAction(false)}
      className="w-16 h-16 rounded-full bg-orange-600 text-white font-display font-bold text-sm shadow-md active:scale-95 flex items-center justify-center"
    >
      ACT
    </button>
  );

  return (
    <div
      data-testid="game-stage"
      data-orientation={isLandscape ? 'landscape' : 'portrait'}
      className="fixed inset-0 z-30 flex flex-col bg-[#F4F5F7] dark:bg-[#111318] text-zinc-900 dark:text-zinc-100 overflow-hidden"
    >
      {/* PORTRAIT LAYOUT */}
      {!isLandscape ? (
        <>
          <header className="h-14 px-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                aria-label="Back to library"
                onClick={onBackToHub}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-sm truncate">{game.title}</h1>
                <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                  {scoreLabel ?? `${score} ${game.scoreUnit}`} · Best {bestScore}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="How to play"
                onClick={() => setShowRules((r) => !r)}
                className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                onClick={onToggleMute}
                className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label="Restart game"
                onClick={startGame}
                className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Pause game"
                onClick={() => setStage((s) => (s === 'playing' ? 'paused' : 'playing'))}
                className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </header>

          <main className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-hidden">
            {renderEngine()}
          </main>

          {(needsDpad || needsAction) && stage === 'playing' && (
            <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4 shrink-0 pb-safe">
              <div>{needsDpad && renderDPad()}</div>
              <div>{needsAction && renderActionButton()}</div>
            </div>
          )}
        </>
      ) : (
        /* LANDSCAPE CONSOLE LAYOUT (Left Rail + Full-Height Center Playfield + Right Action Rail) */
        <div className="flex-1 min-h-0 flex items-stretch overflow-hidden pl-safe pr-safe">
          {/* Left HUD & D-Pad Rail */}
          <aside className="w-40 sm:w-48 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 flex flex-col justify-between shrink-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Back to library"
                  onClick={onBackToHub}
                  className="min-w-[40px] min-h-[40px] rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="font-display font-bold text-sm truncate">{game.title}</h1>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Score</div>
                <div className="text-lg font-mono font-bold tabular-nums leading-tight">
                  {scoreLabel ?? score}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-zinc-500">
                  Best: {bestScore}
                </div>
              </div>
            </div>

            {needsDpad && stage === 'playing' && (
              <div className="flex justify-center py-1">{renderDPad()}</div>
            )}

            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                aria-label="How to play"
                onClick={() => setShowRules((r) => !r)}
                className="min-h-[38px] rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                onClick={onToggleMute}
                className="min-h-[38px] rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label="Restart game"
                onClick={startGame}
                className="min-h-[38px] rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Pause game"
                onClick={() => setStage((s) => (s === 'playing' ? 'paused' : 'playing'))}
                className="min-h-[38px] rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </aside>

          {/* Center Playfield */}
          <main className="flex-1 min-w-0 h-full flex items-center justify-center p-2 overflow-hidden">
            {renderEngine()}
          </main>

          {/* Right Action Rail (when game uses action pad) */}
          {needsAction && stage === 'playing' && (
            <aside className="w-28 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col items-center justify-center gap-3 shrink-0">
              {renderActionButton()}
              <span className="text-[10px] text-center text-zinc-500">{game.controlsHint}</span>
            </aside>
          )}
        </div>
      )}

      {/* TITLE OVERLAY */}
      {stage === 'title' && (
        <div className="fixed inset-0 z-40 bg-zinc-950/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <GameArtwork game={game} size="lg" />
            <div>
              {isDailyChallenge && (
                <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">
                  Today&apos;s Daily Challenge
                </div>
              )}
              <h2 className="text-2xl font-display font-extrabold text-balance">{game.title}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">{game.rules}</p>
            </div>

            {game.supports2P && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 w-full">
                <button
                  type="button"
                  onClick={() => setTwoPlayer(false)}
                  className={`flex-1 min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    !twoPlayer ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Vs AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTwoPlayer(true)}
                  className={`flex-1 min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    twoPlayer ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>2P Pass & Play</span>
                </button>
              </div>
            )}

            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              {game.controlsHint} · Best: {bestScore} {game.scoreUnit}
            </div>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={onBackToHub}
                className="min-h-[46px] px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-sm"
              >
                Back
              </button>
              <button
                type="button"
                data-start="true"
                onClick={startGame}
                className="flex-1 min-h-[46px] rounded-xl bg-orange-600 text-white font-display font-bold text-base hover:bg-orange-700 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Game</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {stage === 'paused' && (
        <div className="fixed inset-0 z-40 bg-zinc-950/75 flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col gap-3 text-center">
            <h2 className="text-xl font-display font-bold">Game Paused</h2>
            <p className="text-xs text-zinc-500">{game.title} · Current: {scoreLabel ?? score}</p>
            <button
              type="button"
              onClick={resumeGame}
              className="min-h-[44px] rounded-xl bg-orange-600 text-white font-bold text-sm"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={startGame}
              className="min-h-[44px] rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-sm"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={onBackToHub}
              className="min-h-[44px] rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-sm"
            >
              Exit to Library
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY MODAL */}
      {stage === 'gameover' && result && (
        <div className="fixed inset-0 z-40 bg-zinc-950/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className={`text-xs font-bold uppercase tracking-wider ${result.won ? 'text-emerald-600' : 'text-orange-600'}`}>
              {result.won ? 'Stage Complete' : 'Round Complete'}
            </div>
            <h2 className="text-2xl font-display font-extrabold">
              {result.won ? 'Victory!' : 'Game Over'}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{result.summary}</p>
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <div className="text-[11px] text-zinc-500">Score</div>
                <div className="text-xl font-mono font-bold tabular-nums">{result.score}</div>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <div className="text-[11px] text-zinc-500">Personal Best</div>
                <div className="text-xl font-mono font-bold tabular-nums">
                  {game.higherIsBetter
                    ? Math.max(bestScore, result.score)
                    : bestScore === 0
                    ? result.score
                    : Math.min(bestScore, result.score)}
                </div>
              </div>
            </div>
            {isDailyChallenge && (
              <div className="w-full px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center justify-center gap-1.5 tabular-nums">
                <Flame className="w-4 h-4 shrink-0" />
                <span>
                  Daily Challenge Cleared · Streak: {dailyStreak} {dailyStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={onBackToHub}
                className="min-h-[46px] px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-sm"
              >
                Library
              </button>
              <button
                type="button"
                data-start="true"
                onClick={startGame}
                className="flex-1 min-h-[46px] rounded-xl bg-orange-600 text-white font-display font-bold text-sm"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOW TO PLAY MODAL */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-xl flex flex-col gap-3">
            <h3 className="text-lg font-display font-bold">{game.title} — How to Play</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{game.rules}</p>
            <div className="text-xs font-mono text-zinc-500">Controls: {game.controlsHint}</div>
            <button
              type="button"
              onClick={() => setShowRules(false)}
              className="min-h-[44px] rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
