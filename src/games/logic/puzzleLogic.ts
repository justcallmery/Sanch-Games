// Pure, deterministic puzzle game logic modules (unit-tested with node:test)

export type Direction = 'up' | 'down' | 'left' | 'right';

// --- 1. 2048 Logic ---
export function create2048Board(rng: () => number = Math.random): number[][] {
  const board = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  spawn2048Tile(board, rng);
  spawn2048Tile(board, rng);
  return board;
}

export function spawn2048Tile(board: number[][], rng: () => number = Math.random): boolean {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return false;
  const [r, c] = empty[Math.floor(rng() * empty.length)];
  board[r][c] = rng() < 0.9 ? 2 : 4;
  return true;
}

function slideLineLeft(line: number[]): { result: number[]; gained: number; moved: boolean } {
  const nonZero = line.filter((v) => v !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < nonZero.length; i++) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const val = nonZero[i] * 2;
      merged.push(val);
      gained += val;
      i++;
    } else {
      merged.push(nonZero[i]);
    }
  }
  while (merged.length < 4) merged.push(0);
  const moved = line.some((v, idx) => v !== merged[idx]);
  return { result: merged, gained, moved };
}

export function move2048Board(
  board: number[][],
  dir: Direction,
  rng: () => number = Math.random
): { board: number[][]; gained: number; moved: boolean } {
  const next = board.map((row) => [...row]);
  let moved = false;
  let gained = 0;

  if (dir === 'left' || dir === 'right') {
    for (let r = 0; r < 4; r++) {
      const line = dir === 'left' ? next[r] : [...next[r]].reverse();
      const { result, gained: g, moved: m } = slideLineLeft(line);
      if (m) moved = true;
      gained += g;
      next[r] = dir === 'left' ? result : result.reverse();
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const col = [next[0][c], next[1][c], next[2][c], next[3][c]];
      const line = dir === 'up' ? col : col.reverse();
      const { result, gained: g, moved: m } = slideLineLeft(line);
      if (m) moved = true;
      gained += g;
      const finalCol = dir === 'up' ? result : result.reverse();
      for (let r = 0; r < 4; r++) next[r][c] = finalCol[r];
    }
  }

  if (moved) {
    spawn2048Tile(next, rng);
  }
  return { board: next, gained, moved };
}

export function canMove2048(board: number[][]): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
    }
  }
  return false;
}

// --- 2. Minesweeper Logic ---
export interface MineCell {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export function createMineBoard(rows: number, cols: number): MineCell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
}

export function populateMines(
  board: MineCell[][],
  mineCount: number,
  safeRow: number,
  safeCol: number,
  rng: () => number = Math.random
): MineCell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const next = board.map((r) => r.map((c) => ({ ...c })));
  const candidates: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
      candidates.push([r, c]);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const actualMines = Math.min(mineCount, candidates.length);
  for (let i = 0; i < actualMines; i++) {
    const [r, c] = candidates[i];
    next[r][c].isMine = true;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && next[nr][nc].isMine) {
            count++;
          }
        }
      }
      next[r][c].adjacent = count;
    }
  }
  return next;
}

export function revealMineCell(
  board: MineCell[][],
  row: number,
  col: number
): { board: MineCell[][]; hitMine: boolean; won: boolean } {
  const rows = board.length;
  const cols = board[0].length;
  const next = board.map((r) => r.map((c) => ({ ...c })));

  if (next[row][col].flagged || next[row][col].revealed) {
    return { board: next, hitMine: false, won: isMineBoardWon(next) };
  }

  if (next[row][col].isMine) {
    next[row][col].revealed = true;
    return { board: next, hitMine: true, won: false };
  }

  const queue: [number, number][] = [[row, col]];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const cell = next[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !next[nr][nc].revealed) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  return { board: next, hitMine: false, won: isMineBoardWon(next) };
}

export function isMineBoardWon(board: MineCell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && !cell.revealed) return false;
    }
  }
  return true;
}

// --- 3. Sudoku Generator & Validator (9x9 and 6x6) ---
export interface SudokuPuzzle {
  size: number;
  boxRows: number;
  boxCols: number;
  puzzle: number[][];
  solution: number[][];
}

export function isValidSudokuPlacement(
  grid: number[][],
  row: number,
  col: number,
  num: number,
  boxRows: number,
  boxCols: number
): boolean {
  const size = grid.length;
  for (let i = 0; i < size; i++) {
    if (i !== col && grid[row][i] === num) return false;
    if (i !== row && grid[i][col] === num) return false;
  }
  const br = Math.floor(row / boxRows) * boxRows;
  const bc = Math.floor(col / boxCols) * boxCols;
  for (let r = br; r < br + boxRows; r++) {
    for (let c = bc; c < bc + boxCols; c++) {
      if ((r !== row || c !== col) && grid[r][c] === num) return false;
    }
  }
  return true;
}

export function generateSudoku(size: 6 | 9, blanks: number, rng: () => number = Math.random): SudokuPuzzle {
  const boxRows = size === 9 ? 3 : 2;
  const boxCols = 3;
  const grid = Array.from({ length: size }, () => Array(size).fill(0));

  const digits = Array.from({ length: size }, (_, i) => i + 1);
  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function solve(cellIdx: number): boolean {
    if (cellIdx === size * size) return true;
    const r = Math.floor(cellIdx / size);
    const c = cellIdx % size;
    if (grid[r][c] !== 0) return solve(cellIdx + 1);
    for (const num of shuffle(digits)) {
      if (isValidSudokuPlacement(grid, r, c, num, boxRows, boxCols)) {
        grid[r][c] = num;
        if (solve(cellIdx + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  solve(0);
  const solution = grid.map((r) => [...r]);
  const puzzle = grid.map((r) => [...r]);

  const coords: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) coords.push([r, c]);
  }
  const shuffledCoords = shuffle(coords);
  for (let i = 0; i < Math.min(blanks, shuffledCoords.length); i++) {
    const [r, c] = shuffledCoords[i];
    puzzle[r][c] = 0;
  }

  return { size, boxRows, boxCols, puzzle, solution };
}

// --- 4. Lights Out Logic ---
export function toggleLightsOut(grid: boolean[][], row: number, col: number): boolean[][] {
  const size = grid.length;
  const next = grid.map((r) => [...r]);
  const deltas = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of deltas) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      next[nr][nc] = !next[nr][nc];
    }
  }
  return next;
}

export function createSolvableLightsOut(size = 5, taps = 8, rng: () => number = Math.random): boolean[][] {
  let grid = Array.from({ length: size }, () => Array(size).fill(false));
  for (let i = 0; i < taps; i++) {
    const r = Math.floor(rng() * size);
    const c = Math.floor(rng() * size);
    grid = toggleLightsOut(grid, r, c);
  }
  // Ensure at least one light is on
  if (grid.every((row) => row.every((cell) => !cell))) {
    grid = toggleLightsOut(grid, 2, 2);
  }
  return grid;
}

// --- 5. Sliding 15 Puzzle ---
export function createSolvable15Board(moves = 60, rng: () => number = Math.random): number[] {
  const board = Array.from({ length: 16 }, (_, i) => (i + 1) % 16);
  let emptyIdx = 15;
  let lastIdx = -1;
  for (let i = 0; i < moves; i++) {
    const r = Math.floor(emptyIdx / 4);
    const c = emptyIdx % 4;
    const neighbors: number[] = [];
    if (r > 0) neighbors.push(emptyIdx - 4);
    if (r < 3) neighbors.push(emptyIdx + 4);
    if (c > 0) neighbors.push(emptyIdx - 1);
    if (c < 3) neighbors.push(emptyIdx + 1);
    const valid = neighbors.filter((n) => n !== lastIdx);
    const pick = valid[Math.floor(rng() * valid.length)];
    [board[emptyIdx], board[pick]] = [board[pick], board[emptyIdx]];
    lastIdx = emptyIdx;
    emptyIdx = pick;
  }
  if (is15Solved(board)) {
    [board[14], board[15]] = [board[15], board[14]];
    [board[12], board[13]] = [board[13], board[12]];
  }
  return board;
}

export function is15Solved(board: number[]): boolean {
  for (let i = 0; i < 15; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[15] === 0;
}

// --- 6. Nonogram Clue Generator ---
export function computeLineClues(line: boolean[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const cell of line) {
    if (cell) {
      run++;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues.length > 0 ? clues : [0];
}

export const NONOGRAM_LEVELS: { name: string; grid: number[][] }[] = [
  {
    name: 'Heart',
    grid: [
      [0, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    name: 'Rocket',
    grid: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 0, 0, 1, 1, 0, 0, 1],
      [0, 0, 1, 0, 0, 1, 0, 0],
    ],
  },
  {
    name: 'Anchor',
    grid: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [1, 0, 0, 1, 1, 0, 0, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
    ],
  },
  {
    name: 'Crown',
    grid: [
      [1, 0, 0, 1, 1, 0, 0, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
];

// --- 7. Sokoban Handcrafted Solvable Levels ---
// '#' wall, '.' goal, '$' crate, '@' player, '*' crate on goal, '+' player on goal, ' ' floor
export const SOKOBAN_LEVELS: string[][] = [
  [
    '#######',
    '#     #',
    '# .$. #',
    '# $@$ #',
    '#  .  #',
    '#######',
  ],
  [
    '#######',
    '#..   #',
    '# $$  #',
    '# @#  #',
    '#     #',
    '#######',
  ],
  [
    '########',
    '#   #  #',
    '# .$ $ #',
    '#  #@. #',
    '#   #  #',
    '########',
  ],
  [
    '########',
    '#  ..  #',
    '#  $$  #',
    '#  ##  #',
    '#  @   #',
    '########',
  ],
  [
    '########',
    '#   .  #',
    '# $$#. #',
    '# @ #  #',
    '#      #',
    '########',
  ],
];

export interface SokobanState {
  grid: string[][];
  player: [number, number];
  goals: Set<string>;
}

export function parseSokobanLevel(lines: string[]): SokobanState {
  const goals = new Set<string>();
  let player: [number, number] = [1, 1];
  const grid = lines.map((line, r) =>
    line.split('').map((ch, c) => {
      if (ch === '.' || ch === '*' || ch === '+') goals.add(`${r},${c}`);
      if (ch === '@' || ch === '+') {
        player = [r, c];
        return ' ';
      }
      if (ch === '*') return '$';
      if (ch === '.') return ' ';
      return ch;
    })
  );
  return { grid, player, goals };
}

export function stepSokoban(state: SokobanState, dir: Direction): { state: SokobanState; moved: boolean; won: boolean } {
  const deltas: Record<Direction, [number, number]> = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1],
  };
  const [dr, dc] = deltas[dir];
  const [pr, pc] = state.player;
  const nr = pr + dr;
  const nc = pc + dc;

  if (nr < 0 || nr >= state.grid.length || nc < 0 || nc >= state.grid[0].length) {
    return { state, moved: false, won: false };
  }
  const target = state.grid[nr][nc];
  if (target === '#') return { state, moved: false, won: false };

  const nextGrid = state.grid.map((r) => [...r]);
  if (target === '$') {
    const br = nr + dr;
    const bc = nc + dc;
    if (
      br < 0 ||
      br >= nextGrid.length ||
      bc < 0 ||
      bc >= nextGrid[0].length ||
      nextGrid[br][bc] === '#' ||
      nextGrid[br][bc] === '$'
    ) {
      return { state, moved: false, won: false };
    }
    nextGrid[nr][nc] = ' ';
    nextGrid[br][bc] = '$';
  }

  const won = Array.from(state.goals).every((key) => {
    const [gr, gc] = key.split(',').map(Number);
    return nextGrid[gr][gc] === '$';
  });

  return {
    state: { grid: nextGrid, player: [nr, nc], goals: state.goals },
    moved: true,
    won,
  };
}
