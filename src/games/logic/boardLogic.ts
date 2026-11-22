// Pure board game rules & AI logic (unit-tested with node:test)

// --- 1. Tic-Tac-Toe ---
export type CellMark = 'X' | 'O' | null;

export function checkTTTWinner(board: CellMark[]): { winner: CellMark | 'draw'; line?: number[] } {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((c) => c !== null)) return { winner: 'draw' };
  return { winner: null };
}

export function bestTTTMove(board: CellMark[], aiMark: 'X' | 'O'): number {
  const humanMark = aiMark === 'X' ? 'O' : 'X';
  function minimax(b: CellMark[], isMax: boolean, depth: number): number {
    const res = checkTTTWinner(b).winner;
    if (res === aiMark) return 10 - depth;
    if (res === humanMark) return depth - 10;
    if (res === 'draw') return 0;

    let best = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        b[i] = isMax ? aiMark : humanMark;
        const score = minimax(b, !isMax, depth + 1);
        b[i] = null;
        best = isMax ? Math.max(best, score) : Math.min(best, score);
      }
    }
    return best;
  }

  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = aiMark;
      const score = minimax(board, false, 0);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

// --- 2. Connect Four ---
export type C4Cell = 0 | 1 | 2; // 0 empty, 1 player, 2 ai/p2

export function createC4Board(): C4Cell[][] {
  return Array.from({ length: 6 }, () => Array(7).fill(0) as C4Cell[]);
}

export function dropC4Disc(board: C4Cell[][], col: number, player: 1 | 2): { board: C4Cell[][]; row: number } | null {
  for (let r = 5; r >= 0; r--) {
    if (board[r][col] === 0) {
      const next = board.map((row) => [...row]);
      next[r][col] = player;
      return { board: next, row: r };
    }
  }
  return null;
}

export function checkC4Winner(board: C4Cell[][]): { winner: 0 | 1 | 2 | 'draw'; cells?: [number, number][] } {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const p = board[r][c];
      if (p === 0) continue;
      for (const [dr, dc] of dirs) {
        const line: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && board[nr][nc] === p) {
            line.push([nr, nc]);
          } else break;
        }
        if (line.length === 4) return { winner: p, cells: line };
      }
    }
  }
  if (board[0].every((c) => c !== 0)) return { winner: 'draw' };
  return { winner: 0 };
}

export function pickC4AIMove(board: C4Cell[][], aiPlayer: 1 | 2 = 2): number {
  const human: 1 | 2 = aiPlayer === 2 ? 1 : 2;
  const validCols = [3, 2, 4, 1, 5, 0, 6].filter((c) => board[0][c] === 0);
  if (validCols.length === 0) return -1;

  // Win immediately
  for (const col of validCols) {
    const res = dropC4Disc(board, col, aiPlayer);
    if (res && checkC4Winner(res.board).winner === aiPlayer) return col;
  }
  // Block human win
  for (const col of validCols) {
    const res = dropC4Disc(board, col, human);
    if (res && checkC4Winner(res.board).winner === human) return col;
  }
  // Avoid giving opponent an immediate win above
  const safeCols = validCols.filter((col) => {
    const res = dropC4Disc(board, col, aiPlayer);
    if (!res) return false;
    const above = dropC4Disc(res.board, col, human);
    if (above && checkC4Winner(above.board).winner === human) return false;
    return true;
  });
  return safeCols.length > 0 ? safeCols[0] : validCols[0];
}

// --- 3. Reversi (Othello) ---
export type ReversiCell = 0 | 1 | 2;

export function createReversiBoard(): ReversiCell[][] {
  const b = Array.from({ length: 8 }, () => Array(8).fill(0) as ReversiCell[]);
  b[3][3] = 2;
  b[3][4] = 1;
  b[4][3] = 1;
  b[4][4] = 2;
  return b;
}

export function getReversiFlips(board: ReversiCell[][], r: number, c: number, player: 1 | 2): [number, number][] {
  if (board[r][c] !== 0) return [];
  const opp = player === 1 ? 2 : 1;
  const flips: [number, number][] = [];
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];
  for (const [dr, dc] of dirs) {
    const chain: [number, number][] = [];
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === opp) {
      chain.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    if (chain.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === player) {
      flips.push(...chain);
    }
  }
  return flips;
}

export function getReversiValidMoves(board: ReversiCell[][], player: 1 | 2): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (getReversiFlips(board, r, c, player).length > 0) moves.push([r, c]);
    }
  }
  return moves;
}

export function applyReversiMove(board: ReversiCell[][], r: number, c: number, player: 1 | 2): ReversiCell[][] {
  const flips = getReversiFlips(board, r, c, player);
  if (flips.length === 0) return board;
  const next = board.map((row) => [...row]);
  next[r][c] = player;
  for (const [fr, fc] of flips) next[fr][fc] = player;
  return next;
}

// --- 4. Checkers (Draughts) ---
export type CheckerPiece = null | { player: 1 | 2; king: boolean };

export interface CheckerMove {
  from: [number, number];
  to: [number, number];
  captured?: [number, number];
}

export function createCheckersBoard(): CheckerPiece[][] {
  const b: CheckerPiece[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { player: 2, king: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { player: 1, king: false };
    }
  }
  return b;
}

export function getCheckerMoves(board: CheckerPiece[][], player: 1 | 2): CheckerMove[] {
  const jumps: CheckerMove[] = [];
  const steps: CheckerMove[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.player !== player) continue;
      const rowDirs = piece.king ? [-1, 1] : player === 1 ? [-1] : [1];
      for (const dr of rowDirs) {
        for (const dc of [-1, 1]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!board[nr][nc]) {
              steps.push({ from: [r, c], to: [nr, nc] });
            } else if (board[nr][nc]!.player !== player) {
              const jr = nr + dr;
              const jc = nc + dc;
              if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !board[jr][jc]) {
                jumps.push({ from: [r, c], to: [jr, jc], captured: [nr, nc] });
              }
            }
          }
        }
      }
    }
  }
  return jumps.length > 0 ? jumps : steps;
}

// --- 5. Chess (8x8 Legal Move Engine) ---
export type ChessColor = 'w' | 'b';
export type ChessPieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export interface ChessPiece {
  color: ChessColor;
  type: ChessPieceType;
}
export type ChessBoard = (ChessPiece | null)[][];

export function createChessBoard(): ChessBoard {
  const backRank: ChessPieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    b[0][c] = { color: 'b', type: backRank[c] };
    b[1][c] = { color: 'b', type: 'p' };
    b[6][c] = { color: 'w', type: 'p' };
    b[7][c] = { color: 'w', type: backRank[c] };
  }
  return b;
}

function getPseudoMoves(board: ChessBoard, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const inBounds = (rr: number, cc: number) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;

  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      if (r === startRow && !board[r + dir * 2][c]) {
        moves.push([r + dir * 2, c]);
      }
    }
    for (const dc of [-1, 1]) {
      if (inBounds(r + dir, c + dc) && board[r + dir][c + dc] && board[r + dir][c + dc]!.color !== piece.color) {
        moves.push([r + dir, c + dc]);
      }
    }
  } else if (piece.type === 'n') {
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of deltas) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc]?.color !== piece.color) moves.push([nr, nc]);
    }
  } else if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color !== piece.color) moves.push([nr, nc]);
      }
    }
  } else {
    const dirs: [number, number][] = [];
    if (piece.type === 'r' || piece.type === 'q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    if (piece.type === 'b' || piece.type === 'q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        if (!board[nr][nc]) {
          moves.push([nr, nc]);
        } else {
          if (board[nr][nc]!.color !== piece.color) moves.push([nr, nc]);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
}

export function isKingInCheck(board: ChessBoard, color: ChessColor): boolean {
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color && board[r][c]?.type === 'k') {
        kr = r; kc = c;
      }
    }
  }
  if (kr === -1) return true;
  const opp: ChessColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === opp) {
        const attacks = getPseudoMoves(board, r, c);
        if (attacks.some(([ar, ac]) => ar === kr && ac === kc)) return true;
      }
    }
  }
  return false;
}

export function applyChessMove(board: ChessBoard, from: [number, number], to: [number, number]): ChessBoard {
  const next = board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  const piece = next[from[0]][from[1]];
  if (!piece) return next;
  next[from[0]][from[1]] = null;
  if (piece.type === 'p' && (to[0] === 0 || to[0] === 7)) {
    next[to[0]][to[1]] = { color: piece.color, type: 'q' };
  } else {
    next[to[0]][to[1]] = piece;
  }
  return next;
}

export function getLegalChessMoves(board: ChessBoard, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  return getPseudoMoves(board, r, c).filter(([tr, tc]) => {
    const next = applyChessMove(board, [r, c], [tr, tc]);
    return !isKingInCheck(next, piece.color);
  });
}

export function getAllLegalChessMovesForColor(board: ChessBoard, color: ChessColor): { from: [number, number]; to: [number, number] }[] {
  const all: { from: [number, number]; to: [number, number] }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        for (const to of getLegalChessMoves(board, r, c)) {
          all.push({ from: [r, c], to });
        }
      }
    }
  }
  return all;
}

export function pickChessAIMove(board: ChessBoard, aiColor: ChessColor = 'b'): { from: [number, number]; to: [number, number] } | null {
  const pieceVal: Record<ChessPieceType, number> = { p: 10, n: 30, b: 32, r: 50, q: 90, k: 900 };
  const moves = getAllLegalChessMovesForColor(board, aiColor);
  if (moves.length === 0) return null;
  let bestScore = -Infinity;
  let bestMoves: typeof moves = [];
  for (const m of moves) {
    const captured = board[m.to[0]][m.to[1]];
    let score = captured ? pieceVal[captured.type] : 0;
    const next = applyChessMove(board, m.from, m.to);
    const opp: ChessColor = aiColor === 'w' ? 'b' : 'w';
    if (isKingInCheck(next, opp)) score += 6;
    // Center preference
    score += (3.5 - Math.abs(3.5 - m.to[0])) * 0.4 + (3.5 - Math.abs(3.5 - m.to[1])) * 0.4;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [m];
    } else if (Math.abs(score - bestScore) < 0.01) {
      bestMoves.push(m);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// --- 6. Gomoku 5-in-a-Row ---
export function checkGomokuWinner(board: (0 | 1 | 2)[][]): 0 | 1 | 2 {
  const n = board.length;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const p = board[r][c];
      if (p === 0) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let k = 1; k < 5; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && board[nr][nc] === p) count++;
          else break;
        }
        if (count >= 5) return p;
      }
    }
  }
  return 0;
}

// --- 7. Nim Optimal AI (Misère) ---
export function pickNimAIMove(heaps: number[]): { row: number; take: number } {
  const nonEmpty = heaps.map((count, row) => ({ row, count })).filter((h) => h.count > 0);
  if (nonEmpty.length === 0) return { row: 0, take: 1 };
  const multi = heaps.filter((c) => c > 1).length;
  if (multi <= 1) {
    // Misere endgame: leave an odd number of heaps of size 1
    const bigIdx = heaps.findIndex((c) => c > 1);
    const ones = heaps.filter((c) => c === 1).length;
    if (bigIdx !== -1) {
      const target = ones % 2 === 0 ? 1 : 0;
      return { row: bigIdx, take: heaps[bigIdx] - target };
    }
    return { row: nonEmpty[0].row, take: 1 };
  }
  const nimSum = heaps.reduce((a, b) => a ^ b, 0);
  if (nimSum !== 0) {
    for (let r = 0; r < heaps.length; r++) {
      const target = heaps[r] ^ nimSum;
      if (target < heaps[r]) return { row: r, take: heaps[r] - target };
    }
  }
  return { row: nonEmpty[0].row, take: 1 };
}
