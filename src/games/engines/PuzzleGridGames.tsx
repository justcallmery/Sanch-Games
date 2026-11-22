import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameRuntimeProps } from '../types';
import { sound } from '../../utils/sound';
import {
  canMove2048,
  computeLineClues,
  create2048Board,
  createMineBoard,
  createSolvable15Board,
  createSolvableLightsOut,
  Direction,
  generateSudoku,
  is15Solved,
  isValidSudokuPlacement,
  MineCell,
  move2048Board,
  NONOGRAM_LEVELS,
  parseSokobanLevel,
  populateMines,
  revealMineCell,
  SOKOBAN_LEVELS,
  SokobanState,
  stepSokoban,
  toggleLightsOut,
} from '../logic/puzzleLogic';

// Curated solvable Kakuro 4x4 playable sub-grids (with black clue cells)
const KAKURO_PUZZLES = [
  {
    // 4x4 grid: '#' block, {right?, down?} clue, or 0 playable
    clues: [
      ['#', { down: 4 }, { down: 10 }, '#'],
      [{ right: 3 }, 0, 0, { down: 7 }],
      [{ right: 15 }, 0, 0, 0],
      ['#', { right: 8 }, 0, 0],
    ] as (string | { right?: number; down?: number } | number)[][],
    solution: [
      [0, 0, 0, 0],
      [0, 1, 2, 0],
      [0, 3, 8, 4],
      [0, 0, 5, 3],
    ],
  },
  {
    clues: [
      ['#', { down: 11 }, { down: 7 }, '#'],
      [{ right: 6 }, 0, 0, { down: 9 }],
      [{ right: 16 }, 0, 0, 0],
      ['#', { right: 9 }, 0, 0],
    ] as (string | { right?: number; down?: number } | number)[][],
    solution: [
      [0, 0, 0, 0],
      [0, 4, 2, 0],
      [0, 7, 5, 4],
      [0, 0, 4, 5],
    ],
  },
];

// Curated 4x4 KenKen puzzles
const KENKEN_PUZZLES = [
  {
    solution: [
      [2, 1, 4, 3],
      [4, 3, 2, 1],
      [1, 2, 3, 4],
      [3, 4, 1, 2],
    ],
    cages: [
      { id: 0, label: '3+', cells: [[0, 0], [0, 1]], color: 'bg-amber-500/10' },
      { id: 1, label: '12×', cells: [[0, 2], [0, 3]], color: 'bg-teal-500/10' },
      { id: 2, label: '7+', cells: [[1, 0], [1, 1]], color: 'bg-sky-500/10' },
      { id: 3, label: '1-', cells: [[1, 2], [1, 3]], color: 'bg-rose-500/10' },
      { id: 4, label: '3+', cells: [[2, 0], [2, 1]], color: 'bg-emerald-500/10' },
      { id: 5, label: '7+', cells: [[2, 2], [2, 3]], color: 'bg-indigo-500/10' },
      { id: 6, label: '7+', cells: [[3, 0], [3, 1]], color: 'bg-orange-500/10' },
      { id: 7, label: '2÷', cells: [[3, 2], [3, 3]], color: 'bg-purple-500/10' },
    ],
  },
];

export const PuzzleGridGames: React.FC<GameRuntimeProps> = ({
  game,
  isLandscape,
  isPaused,
  restartNonce,
  onScoreChange,
  onGameEnd,
}) => {
  // --- 2048 ---
  const [board2048, setBoard2048] = useState<number[][]>(() => create2048Board());
  const [score2048, setScore2048] = useState(0);
  const swipe2048Ref = useRef<{ x: number; y: number } | null>(null);

  // --- Minesweeper ---
  const [mineBoard, setMineBoard] = useState<MineCell[][]>(() => createMineBoard(8, 8));
  const [minesReady, setMinesReady] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [mineSeconds, setMineSeconds] = useState(0);

  // --- Sudoku 9x9 & 6x6 ---
  const [sudokuData, setSudokuData] = useState(() =>
    generateSudoku(game.id === 'sudoku-6' ? 6 : 9, game.id === 'sudoku-6' ? 16 : 42)
  );
  const [sudokuGrid, setSudokuGrid] = useState<number[][]>(() => sudokuData.puzzle.map((r) => [...r]));
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [sudokuMistakes, setSudokuMistakes] = useState(0);

  // --- Nonogram ---
  const [nonoIdx, setNonoIdx] = useState(0);
  const [nonoGrid, setNonoGrid] = useState<(0 | 1 | 2)[][]>(() =>
    Array.from({ length: 8 }, () => Array(8).fill(0))
  ); // 0 empty, 1 filled, 2 X
  const [nonoMode, setNonoMode] = useState<'fill' | 'x'>('fill');

  // --- Lights Out ---
  const [lightsGrid, setLightsGrid] = useState<boolean[][]>(() => createSolvableLightsOut(5, 7));
  const [lightsMoves, setLightsMoves] = useState(0);

  // --- Sliding 15 ---
  const [board15, setBoard15] = useState<number[]>(() => createSolvable15Board(55));
  const [moves15, setMoves15] = useState(0);

  // --- Sokoban ---
  const [sokoIdx, setSokoIdx] = useState(0);
  const [sokoState, setSokoState] = useState<SokobanState>(() => parseSokobanLevel(SOKOBAN_LEVELS[0]));
  const [sokoHistory, setSokoHistory] = useState<SokobanState[]>([]);
  const [sokoMoves, setSokoMoves] = useState(0);

  // --- Kakuro ---
  const [kakuroIdx, setKakuroIdx] = useState(0);
  const [kakuroGrid, setKakuroGrid] = useState<number[][]>(() =>
    Array.from({ length: 4 }, () => Array(4).fill(0))
  );

  // --- KenKen ---
  const [kenGrid, setKenGrid] = useState<number[][]>(() =>
    Array.from({ length: 4 }, () => Array(4).fill(0))
  );

  // Reset on restartNonce or game switch
  useEffect(() => {
    setSelectedCell(null);
    if (game.id === 'game-2048') {
      setBoard2048(create2048Board());
      setScore2048(0);
      onScoreChange(0);
    } else if (game.id === 'minesweeper') {
      setMineBoard(createMineBoard(8, 8));
      setMinesReady(false);
      setFlagMode(false);
      setMineSeconds(0);
      onScoreChange(0, '0s');
    } else if (game.id === 'sudoku-9' || game.id === 'sudoku-6') {
      const s = generateSudoku(game.id === 'sudoku-6' ? 6 : 9, game.id === 'sudoku-6' ? 16 : 40);
      setSudokuData(s);
      setSudokuGrid(s.puzzle.map((r) => [...r]));
      setSudokuMistakes(0);
      onScoreChange(0);
    } else if (game.id === 'nonogram') {
      setNonoGrid(Array.from({ length: 8 }, () => Array(8).fill(0)));
      onScoreChange(0);
    } else if (game.id === 'lights-out') {
      setLightsGrid(createSolvableLightsOut(5, 7));
      setLightsMoves(0);
      onScoreChange(0);
    } else if (game.id === 'sliding-15') {
      setBoard15(createSolvable15Board(55));
      setMoves15(0);
      onScoreChange(0);
    } else if (game.id === 'sokoban') {
      setSokoState(parseSokobanLevel(SOKOBAN_LEVELS[sokoIdx]));
      setSokoHistory([]);
      setSokoMoves(0);
      onScoreChange(sokoIdx * 100);
    } else if (game.id === 'kakuro') {
      setKakuroGrid(Array.from({ length: 4 }, () => Array(4).fill(0)));
      onScoreChange(0);
    } else if (game.id === 'kenken') {
      setKenGrid(Array.from({ length: 4 }, () => Array(4).fill(0)));
      onScoreChange(0);
    }
  }, [game.id, restartNonce, sokoIdx]);

  // Minesweeper timer
  useEffect(() => {
    if (game.id !== 'minesweeper' || !minesReady || isPaused) return;
    const t = setInterval(() => {
      setMineSeconds((s) => {
        const next = s + 1;
        onScoreChange(next * 1000, `${next}s`);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [game.id, minesReady, isPaused]);

  // 2048 move handler
  const handle2048Move = useCallback(
    (dir: Direction) => {
      if (isPaused) return;
      const res = move2048Board(board2048, dir);
      if (!res.moved) return;
      sound.tap();
      if (res.gained > 0) sound.score();
      const nextScore = score2048 + res.gained;
      setBoard2048(res.board);
      setScore2048(nextScore);
      onScoreChange(nextScore);
      if (!canMove2048(res.board)) {
        const maxTile = Math.max(...res.board.flat());
        sound.lose();
        onGameEnd({ won: maxTile >= 2048, score: nextScore, summary: `Highest tile: ${maxTile}` });
      }
    },
    [board2048, score2048, isPaused, onScoreChange, onGameEnd]
  );

  // Sokoban move handler
  const handleSokobanMove = useCallback(
    (dir: Direction) => {
      if (isPaused) return;
      const res = stepSokoban(sokoState, dir);
      if (!res.moved) return;
      sound.tap();
      setSokoHistory((h) => [...h.slice(-25), sokoState]);
      setSokoState(res.state);
      const nextMoves = sokoMoves + 1;
      setSokoMoves(nextMoves);
      if (res.won) {
        sound.win();
        const pts = Math.max(50, 200 - nextMoves * 2) + sokoIdx * 100;
        onScoreChange(pts);
        if (sokoIdx < SOKOBAN_LEVELS.length - 1) {
          setTimeout(() => setSokoIdx((i) => i + 1), 400);
        } else {
          onGameEnd({ won: true, score: pts, summary: 'Cleared all 5 Sokoban warehouses!' });
        }
      }
    },
    [sokoState, sokoMoves, sokoIdx, isPaused, onScoreChange, onGameEnd]
  );

  // Keyboard bindings for 2048 & Sokoban
  useEffect(() => {
    if (game.id !== 'game-2048' && game.id !== 'sokoban') return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      if (game.id === 'game-2048') handle2048Move(dir);
      if (game.id === 'sokoban') handleSokobanMove(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game.id, handle2048Move, handleSokobanMove]);

  // --- RENDER PER GAME ---
  if (game.id === 'game-2048') {
    const tileColors: Record<number, string> = {
      0: 'bg-zinc-200/70 dark:bg-zinc-800/80 text-transparent',
      2: 'bg-amber-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100',
      4: 'bg-amber-100 dark:bg-amber-900/60 text-zinc-900 dark:text-amber-100',
      8: 'bg-orange-400 text-white',
      16: 'bg-orange-500 text-white',
      32: 'bg-orange-600 text-white',
      64: 'bg-red-500 text-white',
      128: 'bg-amber-400 text-zinc-950',
      256: 'bg-amber-500 text-white',
      512: 'bg-teal-500 text-white',
      1024: 'bg-teal-600 text-white',
      2048: 'bg-emerald-600 text-white',
    };

    return (
      <div
        className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}
        onPointerDown={(e) => {
          swipe2048Ref.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (!swipe2048Ref.current) return;
          const dx = e.clientX - swipe2048Ref.current.x;
          const dy = e.clientY - swipe2048Ref.current.y;
          swipe2048Ref.current = null;
          if (Math.hypot(dx, dy) < 26) return;
          if (Math.abs(dx) > Math.abs(dy)) handle2048Move(dx > 0 ? 'right' : 'left');
          else handle2048Move(dy > 0 ? 'down' : 'up');
        }}
      >
        <div
          data-testid="board-2048"
          className="touch-game-surface grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-zinc-300 dark:bg-zinc-900 border border-zinc-400/40 dark:border-zinc-700 w-[min(82vw,330px)] aspect-square"
          style={{ maxHeight: isLandscape ? 'calc(100vh - 5rem)' : '52vh', maxWidth: isLandscape ? 'calc(100vh - 5rem)' : '330px' }}
        >
          {board2048.flat().map((val, idx) => (
            <div
              key={idx}
              className={`rounded-xl flex items-center justify-center font-display font-bold tabular-nums transition-transform duration-100 ${
                val >= 1000 ? 'text-lg' : val >= 100 ? 'text-xl' : 'text-2xl'
              } ${tileColors[val] ?? 'bg-emerald-700 text-white'}`}
            >
              {val > 0 ? val : ''}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label="Slide Up"
            onClick={() => handle2048Move('up')}
            className="min-w-[48px] min-h-[44px] px-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-semibold text-sm active:scale-95"
          >
            Up
          </button>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Slide Left"
              onClick={() => handle2048Move('left')}
              className="min-w-[54px] min-h-[44px] px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-semibold text-sm active:scale-95"
            >
              Left
            </button>
            <button
              type="button"
              aria-label="Slide Down"
              onClick={() => handle2048Move('down')}
              className="min-w-[54px] min-h-[44px] px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-semibold text-sm active:scale-95"
            >
              Down
            </button>
            <button
              type="button"
              aria-label="Slide Right"
              onClick={() => handle2048Move('right')}
              className="min-w-[54px] min-h-[44px] px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-semibold text-sm active:scale-95"
            >
              Right
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (game.id === 'minesweeper') {
    const TOTAL_MINES = 10;
    const flagsUsed = mineBoard.flat().filter((c) => c.flagged).length;

    const handleCellClick = (r: number, c: number) => {
      if (isPaused) return;
      let board = mineBoard;
      if (!minesReady) {
        board = populateMines(board, TOTAL_MINES, r, c);
        setMinesReady(true);
      }
      if (flagMode) {
        if (board[r][c].revealed) return;
        const next = board.map((row, ri) =>
          row.map((cell, ci) => (ri === r && ci === c ? { ...cell, flagged: !cell.flagged } : cell))
        );
        sound.tap();
        setMineBoard(next);
        return;
      }
      const res = revealMineCell(board, r, c);
      setMineBoard(res.board);
      if (res.hitMine) {
        sound.hit();
        const revealedAll = res.board.map((row) =>
          row.map((cell) => (cell.isMine ? { ...cell, revealed: true } : cell))
        );
        setMineBoard(revealedAll);
        onGameEnd({ won: false, score: mineSeconds * 1000, summary: `Detonated at ${mineSeconds}s` });
      } else if (res.won) {
        sound.win();
        onGameEnd({ won: true, score: Math.max(1000, mineSeconds * 1000), summary: `Cleared minefield in ${mineSeconds}s` });
      } else {
        sound.tap();
      }
    };

    const numColors = ['', 'text-blue-600', 'text-emerald-600', 'text-red-600', 'text-indigo-700', 'text-amber-700', 'text-teal-600', 'text-zinc-900', 'text-zinc-500'];

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-8 gap-1 p-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 aspect-square"
          style={{ width: isLandscape ? 'min(76vh, 320px)' : 'min(90vw, 350px)' }}
        >
          {mineBoard.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                aria-label={`Row ${r + 1} Column ${c + 1}`}
                onClick={() => handleCellClick(r, c)}
                className={`rounded-md font-mono font-bold text-sm flex items-center justify-center transition-colors ${
                  cell.revealed
                    ? cell.isMine
                      ? 'bg-red-500 text-white'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 ' + numColors[cell.adjacent]
                    : cell.flagged
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-400/60 dark:bg-zinc-700 hover:bg-zinc-400/80'
                }`}
              >
                {cell.revealed ? (cell.isMine ? 'X' : cell.adjacent > 0 ? cell.adjacent : '') : cell.flagged ? 'F' : ''}
              </button>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 items-center">
          <div className="text-sm font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
            Mines: {TOTAL_MINES - flagsUsed} · {mineSeconds}s
          </div>
          <button
            type="button"
            onClick={() => setFlagMode((f) => !f)}
            className={`min-h-[44px] px-4 py-2 rounded-xl font-semibold text-sm border transition-colors ${
              flagMode
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700'
            }`}
          >
            {flagMode ? 'Flag Mode: ON' : 'Reveal Mode'}
          </button>
        </div>
      </div>
    );
  }

  if (game.id === 'sudoku-9' || game.id === 'sudoku-6') {
    const size = sudokuData.size;
    const handleEnterNum = (num: number) => {
      if (!selectedCell || isPaused) return;
      const [r, c] = selectedCell;
      if (sudokuData.puzzle[r][c] !== 0) return;
      const next = sudokuGrid.map((row) => [...row]);
      next[r][c] = num;
      setSudokuGrid(next);

      if (num !== 0 && num !== sudokuData.solution[r][c]) {
        sound.error();
        setSudokuMistakes((m) => m + 1);
      } else if (num !== 0) {
        sound.tap();
      }

      const complete = next.every((row, ri) =>
        row.every((v, ci) => v === sudokuData.solution[ri][ci])
      );
      if (complete) {
        sound.win();
        const pts = Math.max(100, size * 40 - sudokuMistakes * 20);
        onScoreChange(pts);
        onGameEnd({ won: true, score: pts, summary: `Solved ${size}x${size} Sudoku (${sudokuMistakes} mistakes)` });
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div
          className={`grid gap-0.5 p-1.5 rounded-xl bg-zinc-400 dark:bg-zinc-700 border-2 border-zinc-700 dark:border-zinc-500 aspect-square`}
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            width: isLandscape ? 'min(78vh, 320px)' : 'min(92vw, 350px)',
          }}
        >
          {sudokuGrid.map((row, r) =>
            row.map((val, c) => {
              const isGiven = sudokuData.puzzle[r][c] !== 0;
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const isError = val !== 0 && !isGiven && val !== sudokuData.solution[r][c];
              const boxBottom = (r + 1) % sudokuData.boxRows === 0 && r < size - 1;
              const boxRight = (c + 1) % sudokuData.boxCols === 0 && c < size - 1;
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => setSelectedCell([r, c])}
                  className={`flex items-center justify-center font-mono font-bold text-sm sm:text-base transition-colors ${
                    boxBottom ? 'border-b-2 border-b-zinc-700 dark:border-b-zinc-400' : ''
                  } ${boxRight ? 'border-r-2 border-r-zinc-700 dark:border-r-zinc-400' : ''} ${
                    isSelected
                      ? 'bg-orange-500/25 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500 z-10'
                      : isError
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300'
                      : isGiven
                      ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                      : 'bg-white dark:bg-zinc-800 text-teal-700 dark:text-teal-300'
                  }`}
                >
                  {val > 0 ? val : ''}
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-2 items-center">
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Mistakes: {sudokuMistakes}</div>
          <div className={`grid ${size === 9 ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5`}>
            {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleEnterNum(n)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono font-bold text-base hover:bg-orange-50 dark:hover:bg-zinc-700 active:scale-95"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleEnterNum(0)}
              className="min-w-[44px] min-h-[44px] px-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 font-semibold text-xs active:scale-95"
            >
              Erase
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (game.id === 'nonogram') {
    const level = NONOGRAM_LEVELS[nonoIdx];
    const rowClues = level.grid.map((row) => computeLineClues(row.map((v) => v === 1)));
    const colClues = Array.from({ length: 8 }, (_, c) =>
      computeLineClues(level.grid.map((row) => row[c] === 1))
    );

    const toggleCell = (r: number, c: number) => {
      if (isPaused) return;
      const targetVal = nonoMode === 'fill' ? 1 : 2;
      const next = nonoGrid.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? (cell === targetVal ? 0 : targetVal) : cell))
      );
      sound.tap();
      setNonoGrid(next);

      const solved = level.grid.every((row, ri) =>
        row.every((v, ci) => (v === 1 ? next[ri][ci] === 1 : next[ri][ci] !== 1))
      );
      if (solved) {
        sound.win();
        const pts = (nonoIdx + 1) * 150;
        onScoreChange(pts);
        onGameEnd({ won: true, score: pts, summary: `Revealed "${level.name}" Nonogram!` });
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-2'} items-center justify-center p-2`}>
        <div className="flex flex-col items-end">
          <div className="flex gap-0.5 mb-1 pl-10">
            {colClues.map((clues, c) => (
              <div key={c} className="w-7 sm:w-8 flex flex-col items-center justify-end text-[10px] font-mono leading-tight text-zinc-600 dark:text-zinc-400">
                {clues.map((n, idx) => <span key={idx}>{n}</span>)}
              </div>
            ))}
          </div>
          <div className="flex gap-1 items-center">
            <div className="flex flex-col gap-0.5 w-10 text-right pr-1">
              {rowClues.map((clues, r) => (
                <div key={r} className="h-7 sm:h-8 flex items-center justify-end text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                  {clues.join(' ')}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-0.5 p-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg">
              {nonoGrid.map((row, r) =>
                row.map((cell, c) => (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    aria-label={`Picross ${r + 1},${c + 1}`}
                    onClick={() => toggleCell(r, c)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-sm flex items-center justify-center font-mono text-xs font-bold ${
                      cell === 1
                        ? 'bg-violet-600 text-white'
                        : cell === 2
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                        : 'bg-white dark:bg-zinc-900'
                    }`}
                  >
                    {cell === 2 ? '×' : ''}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-center">
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Puzzle: {level.name}</div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setNonoMode('fill')}
              className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border ${nonoMode === 'fill' ? 'bg-violet-600 text-white border-violet-700' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'}`}
            >
              Fill
            </button>
            <button
              type="button"
              onClick={() => setNonoMode('x')}
              className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border ${nonoMode === 'x' ? 'bg-zinc-800 text-white border-zinc-900' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'}`}
            >
              Mark X
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setNonoIdx((i) => (i + 1) % NONOGRAM_LEVELS.length);
              setNonoGrid(Array.from({ length: 8 }, () => Array(8).fill(0)));
            }}
            className="min-h-[40px] px-3 rounded-xl text-xs bg-zinc-200 dark:bg-zinc-800 font-medium"
          >
            Next Picture
          </button>
        </div>
      </div>
    );
  }

  if (game.id === 'lights-out') {
    const handleTap = (r: number, c: number) => {
      if (isPaused) return;
      sound.tap();
      const next = toggleLightsOut(lightsGrid, r, c);
      const nextMoves = lightsMoves + 1;
      setLightsGrid(next);
      setLightsMoves(nextMoves);
      onScoreChange(nextMoves);
      if (next.every((row) => row.every((cell) => !cell))) {
        sound.win();
        onGameEnd({ won: true, score: nextMoves, summary: `Extinguished all lights in ${nextMoves} moves!` });
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-6' : 'flex-col gap-4'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-5 gap-2 p-3 rounded-2xl bg-zinc-900 border border-zinc-700 aspect-square"
          style={{ width: isLandscape ? 'min(76vh, 300px)' : 'min(86vw, 320px)' }}
        >
          {lightsGrid.map((row, r) =>
            row.map((on, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                aria-label={`Light ${r + 1},${c + 1} ${on ? 'on' : 'off'}`}
                onClick={() => handleTap(r, c)}
                className={`rounded-xl transition-all duration-150 ${
                  on
                    ? 'bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6)] scale-100'
                    : 'bg-zinc-800 border border-zinc-700 scale-95'
                }`}
              />
            ))
          )}
        </div>
        <div className="text-sm font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
          Moves: {lightsMoves}
        </div>
      </div>
    );
  }

  if (game.id === 'sliding-15') {
    const handleSlide = (idx: number) => {
      if (isPaused || board15[idx] === 0) return;
      const emptyIdx = board15.indexOf(0);
      const r1 = Math.floor(idx / 4), c1 = idx % 4;
      const r2 = Math.floor(emptyIdx / 4), c2 = emptyIdx % 4;
      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
      sound.tap();
      const next = [...board15];
      [next[idx], next[emptyIdx]] = [next[emptyIdx], next[idx]];
      const nextMoves = moves15 + 1;
      setBoard15(next);
      setMoves15(nextMoves);
      onScoreChange(nextMoves);
      if (is15Solved(next)) {
        sound.win();
        onGameEnd({ won: true, score: nextMoves, summary: `Ordered all 15 tiles in ${nextMoves} slides!` });
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-6' : 'flex-col gap-4'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-zinc-300 dark:bg-zinc-900 border border-zinc-400/50 dark:border-zinc-700 aspect-square"
          style={{ width: isLandscape ? 'min(76vh, 310px)' : 'min(86vw, 330px)' }}
        >
          {board15.map((val, idx) => (
            <button
              key={idx}
              type="button"
              disabled={val === 0}
              onClick={() => handleSlide(idx)}
              className={`rounded-xl font-display font-bold text-xl tabular-nums transition-transform active:scale-95 ${
                val === 0
                  ? 'bg-transparent cursor-default'
                  : 'bg-teal-600 text-white shadow-sm hover:bg-teal-500'
              }`}
            >
              {val > 0 ? val : ''}
            </button>
          ))}
        </div>
        <div className="text-sm font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
          Slides: {moves15}
        </div>
      </div>
    );
  }

  if (game.id === 'sokoban') {
    const rows = sokoState.grid.length;
    const cols = sokoState.grid[0].length;
    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div
          className="grid gap-1 p-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            width: isLandscape ? 'min(70vh, 320px)' : 'min(88vw, 340px)',
          }}
        >
          {sokoState.grid.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = sokoState.player[0] === r && sokoState.player[1] === c;
              const isGoal = sokoState.goals.has(`${r},${c}`);
              return (
                <div
                  key={`${r}-${c}`}
                  className={`aspect-square rounded-md flex items-center justify-center font-bold text-xs ${
                    cell === '#'
                      ? 'bg-zinc-700 dark:bg-zinc-600'
                      : isPlayer
                      ? 'bg-teal-600 text-white'
                      : cell === '$'
                      ? isGoal
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-600 text-white'
                      : isGoal
                      ? 'bg-emerald-500/20 border-2 border-dashed border-emerald-500'
                      : 'bg-white dark:bg-zinc-800'
                  }`}
                >
                  {isPlayer ? 'P' : cell === '$' ? 'B' : isGoal ? '•' : ''}
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            Warehouse {sokoIdx + 1}/{SOKOBAN_LEVELS.length} · Moves: {sokoMoves}
          </div>
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={() => handleSokobanMove('up')} className="min-w-[48px] min-h-[42px] px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-bold">Up</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => handleSokobanMove('left')} className="min-w-[48px] min-h-[42px] px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-bold">Left</button>
              <button type="button" onClick={() => handleSokobanMove('down')} className="min-w-[48px] min-h-[42px] px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-bold">Down</button>
              <button type="button" onClick={() => handleSokobanMove('right')} className="min-w-[48px] min-h-[42px] px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-bold">Right</button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sokoHistory.length === 0}
              onClick={() => {
                const prev = sokoHistory[sokoHistory.length - 1];
                if (prev) {
                  setSokoState(prev);
                  setSokoHistory((h) => h.slice(0, -1));
                }
              }}
              className="min-h-[38px] px-3 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs font-medium disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => {
                setSokoState(parseSokobanLevel(SOKOBAN_LEVELS[sokoIdx]));
                setSokoHistory([]);
                setSokoMoves(0);
              }}
              className="min-h-[38px] px-3 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs font-medium"
            >
              Reset Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (game.id === 'kakuro') {
    const puzzle = KAKURO_PUZZLES[kakuroIdx];
    const enterVal = (val: number) => {
      if (!selectedCell || isPaused) return;
      const [r, c] = selectedCell;
      if (puzzle.clues[r][c] !== 0) return;
      const next = kakuroGrid.map((row) => [...row]);
      next[r][c] = val;
      setKakuroGrid(next);
      sound.tap();

      let solved = true;
      for (let rr = 0; rr < 4; rr++) {
        for (let cc = 0; cc < 4; cc++) {
          if (puzzle.clues[rr][cc] === 0 && next[rr][cc] !== puzzle.solution[rr][cc]) solved = false;
        }
      }
      if (solved) {
        sound.win();
        const pts = (kakuroIdx + 1) * 150;
        onScoreChange(pts);
        onGameEnd({ won: true, score: pts, summary: 'Solved Kakuro cross-sum grid!' });
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-4 gap-1 p-2 rounded-2xl bg-zinc-300 dark:bg-zinc-700 aspect-square"
          style={{ width: isLandscape ? 'min(74vh, 290px)' : 'min(82vw, 310px)' }}
        >
          {puzzle.clues.map((row, r) =>
            row.map((cell, c) => {
              if (cell === '#') return <div key={`${r}-${c}`} className="bg-zinc-800 rounded-md" />;
              if (typeof cell === 'object') {
                return (
                  <div key={`${r}-${c}`} className="bg-zinc-800 text-white rounded-md p-1 flex flex-col justify-between text-[10px] font-mono">
                    <span className="text-right text-amber-300">{cell.right ? `${cell.right}→` : ''}</span>
                    <span className="text-left text-sky-300">{cell.down ? `${cell.down}↓` : ''}</span>
                  </div>
                );
              }
              const isSel = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const val = kakuroGrid[r][c];
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => setSelectedCell([r, c])}
                  className={`rounded-md font-mono font-bold text-xl flex items-center justify-center ${
                    isSel ? 'bg-sky-500/25 ring-2 ring-sky-500' : 'bg-white dark:bg-zinc-900'
                  }`}
                >
                  {val > 0 ? val : ''}
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-2 items-center">
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => enterVal(n)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono font-bold text-sm"
              >
                {n === 0 ? 'Clr' : n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setKakuroIdx((i) => (i + 1) % KAKURO_PUZZLES.length);
              setKakuroGrid(Array.from({ length: 4 }, () => Array(4).fill(0)));
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800"
          >
            Switch Board
          </button>
        </div>
      </div>
    );
  }

  // --- KenKen 4x4 ---
  const kenPuzzle = KENKEN_PUZZLES[0];
  const enterKenVal = (n: number) => {
    if (!selectedCell || isPaused) return;
    const [r, c] = selectedCell;
    const next = kenGrid.map((row) => [...row]);
    next[r][c] = n;
    setKenGrid(next);
    sound.tap();
    const solved = next.every((row, ri) => row.every((v, ci) => v === kenPuzzle.solution[ri][ci]));
    if (solved) {
      sound.win();
      onScoreChange(250);
      onGameEnd({ won: true, score: 250, summary: 'Solved 4x4 KenKen arithmetic cages!' });
    }
  };

  return (
    <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-5' : 'flex-col gap-4'} items-center justify-center p-2`}>
      <div
        className="grid grid-cols-4 gap-1 p-2 rounded-2xl bg-zinc-300 dark:bg-zinc-700 aspect-square"
        style={{ width: isLandscape ? 'min(74vh, 290px)' : 'min(82vw, 310px)' }}
      >
        {kenGrid.map((row, r) =>
          row.map((val, c) => {
            const cage = kenPuzzle.cages.find((cg) => cg.cells.some(([cr, cc]) => cr === r && cc === c));
            const isFirst = cage && cage.cells[0][0] === r && cage.cells[0][1] === c;
            const isSel = selectedCell?.[0] === r && selectedCell?.[1] === c;
            const valid = isValidSudokuPlacement(kenGrid, r, c, val, 4, 4);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => setSelectedCell([r, c])}
                className={`relative rounded-lg bg-white dark:bg-zinc-900 font-mono font-bold text-xl flex items-center justify-center ${
                  cage?.color ?? ''
                } ${isSel ? 'ring-2 ring-teal-500' : ''} ${val > 0 && !valid ? 'text-red-500' : ''}`}
              >
                {isFirst && (
                  <span className="absolute top-1 left-1.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                    {cage.label}
                  </span>
                )}
                {val > 0 ? val : ''}
              </button>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 0].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => enterKenVal(n)}
            className="min-w-[46px] min-h-[46px] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono font-bold text-base"
          >
            {n === 0 ? 'Clr' : n}
          </button>
        ))}
      </div>
    </div>
  );
};
