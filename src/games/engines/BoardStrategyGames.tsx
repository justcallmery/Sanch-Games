import React, { useEffect, useState } from 'react';
import { GameRuntimeProps } from '../types';
import { sound } from '../../utils/sound';
import {
  applyChessMove,
  applyReversiMove,
  bestTTTMove,
  C4Cell,
  CellMark,
  checkC4Winner,
  CheckerMove,
  CheckerPiece,
  checkGomokuWinner,
  checkTTTWinner,
  ChessBoard,
  ChessPiece,
  createC4Board,
  createCheckersBoard,
  createChessBoard,
  createReversiBoard,
  dropC4Disc,
  getAllLegalChessMovesForColor,
  getCheckerMoves,
  getLegalChessMoves,
  getReversiValidMoves,
  isKingInCheck,
  pickC4AIMove,
  pickChessAIMove,
  pickNimAIMove,
  ReversiCell,
} from '../logic/boardLogic';

const CHESS_GLYPHS: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

export const BoardStrategyGames: React.FC<GameRuntimeProps> = ({
  game,
  isLandscape,
  isPaused,
  restartNonce,
  twoPlayer,
  onScoreChange,
  onGameEnd,
}) => {
  // Tic-Tac-Toe
  const [tttBoard, setTttBoard] = useState<CellMark[]>(Array(9).fill(null));
  const [tttTurn, setTttTurn] = useState<'X' | 'O'>('X');

  // Ultimate Tic-Tac-Toe
  const [uBoards, setUBoards] = useState<CellMark[][]>(() => Array.from({ length: 9 }, () => Array(9).fill(null)));
  const [uMacro, setUMacro] = useState<(CellMark | 'draw')[]>(Array(9).fill(null));
  const [uActiveBoard, setUActiveBoard] = useState<number | null>(null);
  const [uTurn, setUTurn] = useState<'X' | 'O'>('X');

  // Connect Four
  const [c4Board, setC4Board] = useState<C4Cell[][]>(createC4Board);
  const [c4Turn, setC4Turn] = useState<1 | 2>(1);

  // Reversi
  const [revBoard, setRevBoard] = useState<ReversiCell[][]>(createReversiBoard);
  const [revTurn, setRevTurn] = useState<1 | 2>(1);

  // Checkers
  const [chkBoard, setChkBoard] = useState<CheckerPiece[][]>(createCheckersBoard);
  const [chkTurn, setChkTurn] = useState<1 | 2>(1);
  const [chkSelected, setChkSelected] = useState<[number, number] | null>(null);

  // Chess
  const [chessBoard, setChessBoard] = useState<ChessBoard>(createChessBoard);
  const [chessTurn, setChessTurn] = useState<'w' | 'b'>('w');
  const [chessSel, setChessSel] = useState<[number, number] | null>(null);

  // Gomoku 11x11
  const [gomBoard, setGomBoard] = useState<(0 | 1 | 2)[][]>(() => Array.from({ length: 11 }, () => Array(11).fill(0)));
  const [gomTurn, setGomTurn] = useState<1 | 2>(1);

  // Nim Sticks
  const [nimHeaps, setNimHeaps] = useState<number[]>([1, 3, 5, 7]);
  const [nimTurn, setNimTurn] = useState<1 | 2>(1);

  // Dots & Boxes (4x4 dots -> 3x3 boxes)
  const [hEdges, setHEdges] = useState<(0 | 1 | 2)[][]>(() => Array.from({ length: 4 }, () => Array(3).fill(0)));
  const [vEdges, setVEdges] = useState<(0 | 1 | 2)[][]>(() => Array.from({ length: 3 }, () => Array(4).fill(0)));
  const [boxes, setBoxes] = useState<(0 | 1 | 2)[][]>(() => Array.from({ length: 3 }, () => Array(3).fill(0)));
  const [dbTurn, setDbTurn] = useState<1 | 2>(1);

  const [thinking, setThinking] = useState(false);

  // Reset
  useEffect(() => {
    setThinking(false);
    setTttBoard(Array(9).fill(null));
    setTttTurn('X');
    setUBoards(Array.from({ length: 9 }, () => Array(9).fill(null)));
    setUMacro(Array(9).fill(null));
    setUActiveBoard(null);
    setUTurn('X');
    setC4Board(createC4Board());
    setC4Turn(1);
    setRevBoard(createReversiBoard());
    setRevTurn(1);
    setChkBoard(createCheckersBoard());
    setChkTurn(1);
    setChkSelected(null);
    setChessBoard(createChessBoard());
    setChessTurn('w');
    setChessSel(null);
    setGomBoard(Array.from({ length: 11 }, () => Array(11).fill(0)));
    setGomTurn(1);
    setNimHeaps([1, 3, 5, 7]);
    setNimTurn(1);
    setHEdges(Array.from({ length: 4 }, () => Array(3).fill(0)));
    setVEdges(Array.from({ length: 3 }, () => Array(4).fill(0)));
    setBoxes(Array.from({ length: 3 }, () => Array(3).fill(0)));
    setDbTurn(1);
    onScoreChange(0);
  }, [game.id, restartNonce, twoPlayer]);

  // --- 1. Tic-Tac-Toe ---
  if (game.id === 'tic-tac-toe') {
    const handleTTT = (idx: number) => {
      if (isPaused || thinking || tttBoard[idx] !== null) return;
      const next = [...tttBoard];
      next[idx] = tttTurn;
      sound.tap();
      setTttBoard(next);
      const res = checkTTTWinner(next);
      if (res.winner) {
        const won = res.winner === 'X';
        onScoreChange(won ? 1 : 0);
        onGameEnd({
          won: res.winner !== 'O',
          score: won ? 1 : 0,
          summary: res.winner === 'draw' ? 'Stalemate Draw!' : `${res.winner} takes the 3x3 board!`,
        });
        return;
      }
      if (twoPlayer) {
        setTttTurn(tttTurn === 'X' ? 'O' : 'X');
      } else {
        setThinking(true);
        setTimeout(() => {
          const aiIdx = bestTTTMove([...next], 'O');
          if (aiIdx !== -1) next[aiIdx] = 'O';
          sound.flip();
          setTttBoard([...next]);
          setThinking(false);
          const aiRes = checkTTTWinner(next);
          if (aiRes.winner) {
            onGameEnd({
              won: aiRes.winner === 'draw',
              score: 0,
              summary: aiRes.winner === 'draw' ? 'Draw against Optimal AI!' : 'AI wins the round.',
            });
          }
        }, 320);
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-6' : 'flex-col gap-4'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 aspect-square"
          style={{ width: isLandscape ? 'min(74vh, 290px)' : 'min(82vw, 310px)' }}
        >
          {tttBoard.map((cell, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Cell ${i + 1} ${cell ?? 'empty'}`}
              onClick={() => handleTTT(i)}
              className={`rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300/60 dark:border-zinc-700 font-display font-extrabold text-4xl flex items-center justify-center ${
                cell === 'X' ? 'text-orange-600' : 'text-teal-600'
              }`}
            >
              {cell}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {thinking ? 'AI thinking...' : twoPlayer ? `Player ${tttTurn} Turn` : 'Your Turn (X)'}
        </div>
      </div>
    );
  }

  // --- 2. Ultimate Tic-Tac-Toe ---
  if (game.id === 'ultimate-ttt') {
    const playUltimate = (bIdx: number, cIdx: number, curBoards: CellMark[][], curMacro: (CellMark | 'draw')[], mark: 'X' | 'O') => {
      const nb = curBoards.map((b, i) => (i === bIdx ? b.map((c, j) => (j === cIdx ? mark : c)) : b));
      const nm = [...curMacro];
      const subRes = checkTTTWinner(nb[bIdx]);
      if (subRes.winner) nm[bIdx] = subRes.winner;
      const nextActive = nm[cIdx] === null ? cIdx : null;
      return { nb, nm, nextActive };
    };

    const handleUClick = (bIdx: number, cIdx: number) => {
      if (isPaused || thinking) return;
      if (uActiveBoard !== null && uActiveBoard !== bIdx) return;
      if (uMacro[bIdx] !== null || uBoards[bIdx][cIdx] !== null) return;

      sound.tap();
      const { nb, nm, nextActive } = playUltimate(bIdx, cIdx, uBoards, uMacro, uTurn);
      setUBoards(nb);
      setUMacro(nm);
      setUActiveBoard(nextActive);

      const macroCheck = checkTTTWinner(nm.map((m) => (m === 'draw' ? null : m)));
      if (macroCheck.winner && macroCheck.winner !== 'draw') {
        const won = macroCheck.winner === 'X';
        onScoreChange(won ? 1 : 0);
        onGameEnd({ won, score: won ? 1 : 0, summary: `${macroCheck.winner} won Ultimate 3x3!` });
        return;
      }
      if (nm.every((m) => m !== null)) {
        onGameEnd({ won: true, score: 0, summary: 'Ultimate board ended in a draw!' });
        return;
      }

      if (twoPlayer) {
        setUTurn(uTurn === 'X' ? 'O' : 'X');
      } else {
        setThinking(true);
        setTimeout(() => {
          const validBoards = nextActive !== null ? [nextActive] : nm.map((m, idx) => (m === null ? idx : -1)).filter((i) => i !== -1);
          const choices: [number, number][] = [];
          for (const vb of validBoards) {
            nb[vb].forEach((val, ci) => { if (val === null) choices.push([vb, ci]); });
          }
          if (choices.length > 0) {
            const [ab, ac] = choices[Math.floor(Math.random() * choices.length)];
            const aiRes = playUltimate(ab, ac, nb, nm, 'O');
            sound.flip();
            setUBoards(aiRes.nb);
            setUMacro(aiRes.nm);
            setUActiveBoard(aiRes.nextActive);
            const mc = checkTTTWinner(aiRes.nm.map((m) => (m === 'draw' ? null : m)));
            if (mc.winner && mc.winner !== 'draw') {
              onGameEnd({ won: false, score: 0, summary: 'AI captured 3 macro boards!' });
            }
          }
          setThinking(false);
        }, 350);
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-2'} items-center justify-center p-1`}>
        <div
          className="grid grid-cols-3 gap-1.5 p-2 rounded-2xl bg-zinc-300 dark:bg-zinc-900 aspect-square"
          style={{ width: isLandscape ? 'min(80vh, 320px)' : 'min(92vw, 350px)' }}
        >
          {uBoards.map((board, bIdx) => {
            const isPlayable = uMacro[bIdx] === null && (uActiveBoard === null || uActiveBoard === bIdx);
            return (
              <div
                key={bIdx}
                className={`relative grid grid-cols-3 gap-0.5 p-1 rounded-lg ${
                  isPlayable ? 'bg-orange-500/20 ring-2 ring-orange-500' : 'bg-zinc-100 dark:bg-zinc-800 opacity-85'
                }`}
              >
                {uMacro[bIdx] && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-zinc-900/75 text-white font-display font-extrabold text-3xl">
                    {uMacro[bIdx] === 'draw' ? '—' : uMacro[bIdx]}
                  </div>
                )}
                {board.map((cell, cIdx) => (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => handleUClick(bIdx, cIdx)}
                    className={`aspect-square rounded-sm bg-white dark:bg-zinc-900 text-xs font-bold flex items-center justify-center ${
                      cell === 'X' ? 'text-orange-600' : 'text-teal-500'
                    }`}
                  >
                    {cell}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          {thinking ? 'AI moving...' : twoPlayer ? `Turn: ${uTurn}` : 'Your Turn (X)'}
        </div>
      </div>
    );
  }

  // --- 3. Connect Four ---
  if (game.id === 'connect-four') {
    const handleDrop = (col: number) => {
      if (isPaused || thinking) return;
      const res = dropC4Disc(c4Board, col, c4Turn);
      if (!res) return;
      sound.tap();
      setC4Board(res.board);
      const win = checkC4Winner(res.board);
      if (win.winner !== 0) {
        const won = win.winner === 1;
        onScoreChange(won ? 1 : 0);
        onGameEnd({
          won: win.winner !== 2,
          score: won ? 1 : 0,
          summary: win.winner === 'draw' ? 'Grid filled — Draw!' : `Player ${win.winner} connected four!`,
        });
        return;
      }

      if (twoPlayer) {
        setC4Turn(c4Turn === 1 ? 2 : 1);
      } else {
        setThinking(true);
        setTimeout(() => {
          const aiCol = pickC4AIMove(res.board, 2);
          if (aiCol !== -1) {
            const aiRes = dropC4Disc(res.board, aiCol, 2);
            if (aiRes) {
              sound.flip();
              setC4Board(aiRes.board);
              const aiWin = checkC4Winner(aiRes.board);
              if (aiWin.winner !== 0) {
                onGameEnd({
                  won: aiWin.winner === 'draw',
                  score: 0,
                  summary: aiWin.winner === 'draw' ? 'Grid Draw!' : 'AI connected four discs!',
                });
              }
            }
          }
          setThinking(false);
        }, 350);
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-5' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-7 gap-1.5 p-2.5 rounded-2xl bg-blue-700 dark:bg-blue-900 border-2 border-blue-800 shadow-lg"
          style={{ width: isLandscape ? 'min(85vh, 350px)' : 'min(92vw, 360px)' }}
        >
          {c4Board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                aria-label={`Drop column ${c + 1}`}
                onClick={() => handleDrop(c)}
                className={`aspect-square rounded-full transition-colors ${
                  cell === 1
                    ? 'bg-red-500 shadow-inner'
                    : cell === 2
                    ? 'bg-amber-400 shadow-inner'
                    : 'bg-zinc-100 dark:bg-slate-900'
                }`}
              />
            ))
          )}
        </div>
        <div className="flex flex-col items-center gap-1 text-xs font-semibold">
          <span className={c4Turn === 1 ? 'text-red-500' : 'text-amber-500'}>
            {thinking ? 'AI dropping...' : twoPlayer ? `Player ${c4Turn} Turn` : 'Your Turn (Red)'}
          </span>
        </div>
      </div>
    );
  }

  // --- 4. Reversi ---
  if (game.id === 'reversi') {
    const validMoves = getReversiValidMoves(revBoard, revTurn);
    const p1Count = revBoard.flat().filter((c) => c === 1).length;
    const p2Count = revBoard.flat().filter((c) => c === 2).length;

    const finishReversi = (b: ReversiCell[][]) => {
      const c1 = b.flat().filter((x) => x === 1).length;
      const c2 = b.flat().filter((x) => x === 2).length;
      onScoreChange(c1);
      onGameEnd({
        won: c1 >= c2,
        score: c1,
        summary: `Final Discs — You: ${c1} · Opponent: ${c2}`,
      });
    };

    const handleRevClick = (r: number, c: number) => {
      if (isPaused || thinking) return;
      if (!validMoves.some(([vr, vc]) => vr === r && vc === c)) return;
      sound.tap();
      let next = applyReversiMove(revBoard, r, c, revTurn);
      setRevBoard(next);
      onScoreChange(next.flat().filter((x) => x === 1).length);

      const nextTurn: 1 | 2 = revTurn === 1 ? 2 : 1;
      const nextMoves = getReversiValidMoves(next, nextTurn);
      if (nextMoves.length === 0) {
        const curMovesAgain = getReversiValidMoves(next, revTurn);
        if (curMovesAgain.length === 0) {
          finishReversi(next);
        }
        return;
      }

      if (twoPlayer) {
        setRevTurn(nextTurn);
      } else {
        setThinking(true);
        const runAI = (boardState: ReversiCell[][]) => {
          const aiMoves = getReversiValidMoves(boardState, 2);
          if (aiMoves.length === 0) {
            if (getReversiValidMoves(boardState, 1).length === 0) finishReversi(boardState);
            setThinking(false);
            return;
          }
          // Prefer corners, otherwise max flips
          aiMoves.sort((a, b) => {
            const cornerA = (a[0] === 0 || a[0] === 7) && (a[1] === 0 || a[1] === 7) ? 100 : 0;
            const cornerB = (b[0] === 0 || b[0] === 7) && (b[1] === 0 || b[1] === 7) ? 100 : 0;
            return cornerB - cornerA;
          });
          const [ar, ac] = aiMoves[0];
          const afterAI = applyReversiMove(boardState, ar, ac, 2);
          sound.flip();
          setRevBoard(afterAI);
          onScoreChange(afterAI.flat().filter((x) => x === 1).length);
          if (getReversiValidMoves(afterAI, 1).length === 0) {
            if (getReversiValidMoves(afterAI, 2).length === 0) finishReversi(afterAI);
            else setTimeout(() => runAI(afterAI), 350);
          } else {
            setThinking(false);
          }
        };
        setTimeout(() => runAI(next), 350);
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-8 gap-0.5 p-1.5 rounded-xl bg-emerald-800 border-2 border-emerald-950 aspect-square"
          style={{ width: isLandscape ? 'min(76vh, 310px)' : 'min(90vw, 340px)' }}
        >
          {revBoard.map((row, r) =>
            row.map((cell, c) => {
              const isValid = !thinking && validMoves.some(([vr, vc]) => vr === r && vc === c);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleRevClick(r, c)}
                  className="bg-emerald-700 rounded-sm flex items-center justify-center p-1"
                >
                  {cell !== 0 ? (
                    <span className={`w-full h-full rounded-full shadow ${cell === 1 ? 'bg-zinc-900' : 'bg-white'}`} />
                  ) : isValid ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-300/60" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        <div className="flex flex-col gap-1 text-xs font-mono tabular-nums">
          <span>Dark: {p1Count} · Light: {p2Count}</span>
          <span className="text-zinc-500">{thinking ? 'AI moving...' : twoPlayer ? `Turn: P${revTurn}` : 'Your Turn (Dark)'}</span>
        </div>
      </div>
    );
  }

  // --- 5. Checkers ---
  if (game.id === 'checkers') {
    const legal = getCheckerMoves(chkBoard, chkTurn);
    const selectedMoves = chkSelected
      ? legal.filter((m) => m.from[0] === chkSelected[0] && m.from[1] === chkSelected[1])
      : [];

    const executeCheckerMove = (board: CheckerPiece[][], m: CheckerMove, player: 1 | 2) => {
      const next = board.map((r) => r.map((c) => (c ? { ...c } : null)));
      const piece = { ...next[m.from[0]][m.from[1]]! };
      if ((player === 1 && m.to[0] === 0) || (player === 2 && m.to[0] === 7)) piece.king = true;
      next[m.from[0]][m.from[1]] = null;
      next[m.to[0]][m.to[1]] = piece;
      if (m.captured) next[m.captured[0]][m.captured[1]] = null;
      return next;
    };

    const handleSquare = (r: number, c: number) => {
      if (isPaused || thinking) return;
      const moveMatch = selectedMoves.find((m) => m.to[0] === r && m.to[1] === c);
      if (moveMatch) {
        sound.tap();
        const next = executeCheckerMove(chkBoard, moveMatch, chkTurn);
        setChkBoard(next);
        setChkSelected(null);

        const nextPlayer: 1 | 2 = chkTurn === 1 ? 2 : 1;
        const oppMoves = getCheckerMoves(next, nextPlayer);
        if (oppMoves.length === 0) {
          const won = chkTurn === 1;
          onScoreChange(won ? 1 : 0);
          onGameEnd({ won, score: won ? 1 : 0, summary: `Player ${chkTurn} wins Checkers!` });
          return;
        }
        if (twoPlayer) {
          setChkTurn(nextPlayer);
        } else {
          setThinking(true);
          setTimeout(() => {
            const aiMoves = getCheckerMoves(next, 2);
            if (aiMoves.length === 0) {
              onScoreChange(1);
              onGameEnd({ won: true, score: 1, summary: 'You win Checkers!' });
            } else {
              const pick = aiMoves[Math.floor(Math.random() * aiMoves.length)];
              const afterAI = executeCheckerMove(next, pick, 2);
              sound.flip();
              setChkBoard(afterAI);
              if (getCheckerMoves(afterAI, 1).length === 0) {
                onGameEnd({ won: false, score: 0, summary: 'AI captured all moves!' });
              }
            }
            setThinking(false);
          }, 350);
        }
        return;
      }

      if (chkBoard[r][c]?.player === chkTurn) {
        setChkSelected([r, c]);
      } else {
        setChkSelected(null);
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-8 rounded-xl overflow-hidden border-2 border-zinc-800 aspect-square"
          style={{ width: isLandscape ? 'min(76vh, 310px)' : 'min(90vw, 340px)' }}
        >
          {chkBoard.map((row, r) =>
            row.map((piece, c) => {
              const dark = (r + c) % 2 === 1;
              const isSel = chkSelected?.[0] === r && chkSelected?.[1] === c;
              const isTarget = selectedMoves.some((m) => m.to[0] === r && m.to[1] === c);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleSquare(r, c)}
                  className={`flex items-center justify-center p-1 ${
                    dark ? 'bg-amber-900' : 'bg-amber-100'
                  } ${isSel ? 'ring-2 ring-inset ring-yellow-400' : ''} ${
                    isTarget ? 'ring-2 ring-inset ring-emerald-400' : ''
                  }`}
                >
                  {piece && (
                    <span
                      className={`w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
                        piece.player === 1 ? 'bg-red-600 text-white' : 'bg-zinc-900 text-amber-300'
                      }`}
                    >
                      {piece.king ? 'K' : ''}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          {thinking ? 'AI moving...' : twoPlayer ? `P${chkTurn} Turn` : 'Your Turn (Red)'}
        </div>
      </div>
    );
  }

  // --- 6. Pocket Chess ---
  if (game.id === 'chess') {
    const legalTargets = chessSel ? getLegalChessMoves(chessBoard, chessSel[0], chessSel[1]) : [];

    const handleChessClick = (r: number, c: number) => {
      if (isPaused || thinking) return;
      if (chessSel && legalTargets.some(([tr, tc]) => tr === r && tc === c)) {
        sound.tap();
        const next = applyChessMove(chessBoard, chessSel, [r, c]);
        setChessBoard(next);
        setChessSel(null);

        const nextTurn = chessTurn === 'w' ? 'b' : 'w';
        const oppMoves = getAllLegalChessMovesForColor(next, nextTurn);
        if (oppMoves.length === 0) {
          const check = isKingInCheck(next, nextTurn);
          const won = chessTurn === 'w' && check;
          onScoreChange(won ? 1 : 0);
          onGameEnd({
            won: check ? won : true,
            score: won ? 1 : 0,
            summary: check ? `Checkmate! ${chessTurn === 'w' ? 'White' : 'Black'} wins!` : 'Stalemate Draw!',
          });
          return;
        }

        if (twoPlayer) {
          setChessTurn(nextTurn);
        } else {
          setThinking(true);
          setTimeout(() => {
            const aiMove = pickChessAIMove(next, 'b');
            if (aiMove) {
              const afterAI = applyChessMove(next, aiMove.from, aiMove.to);
              sound.flip();
              setChessBoard(afterAI);
              if (getAllLegalChessMovesForColor(afterAI, 'w').length === 0) {
                const check = isKingInCheck(afterAI, 'w');
                onGameEnd({ won: false, score: 0, summary: check ? 'Checkmate by Black AI!' : 'Stalemate Draw!' });
              }
            }
            setThinking(false);
          }, 360);
        }
        return;
      }

      const piece: ChessPiece | null = chessBoard[r][c];
      if (piece && piece.color === chessTurn) {
        setChessSel([r, c]);
      } else {
        setChessSel(null);
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-2'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-8 rounded-xl overflow-hidden border-2 border-zinc-700 aspect-square"
          style={{ width: isLandscape ? 'min(78vh, 320px)' : 'min(92vw, 350px)' }}
        >
          {chessBoard.map((row, r) =>
            row.map((piece, c) => {
              const light = (r + c) % 2 === 0;
              const isSel = chessSel?.[0] === r && chessSel?.[1] === c;
              const isTarget = legalTargets.some(([tr, tc]) => tr === r && tc === c);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleChessClick(r, c)}
                  className={`flex items-center justify-center text-xl sm:text-2xl leading-none select-none ${
                    light ? 'bg-stone-200' : 'bg-stone-500'
                  } ${isSel ? 'ring-2 ring-inset ring-orange-500 bg-orange-200/70' : ''} ${
                    isTarget ? 'ring-2 ring-inset ring-emerald-500' : ''
                  }`}
                >
                  {piece ? (
                    <span className={piece.color === 'w' ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]' : 'text-zinc-950'}>
                      {CHESS_GLYPHS[`${piece.color}${piece.type}`]}
                    </span>
                  ) : isTarget ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          {thinking ? 'Black AI thinking...' : twoPlayer ? `${chessTurn === 'w' ? 'White' : 'Black'} Turn` : 'Your Turn (White)'}
        </div>
      </div>
    );
  }

  // --- 7. Gomoku 11x11 ---
  if (game.id === 'gomoku') {
    const handleGomoku = (r: number, c: number) => {
      if (isPaused || thinking || gomBoard[r][c] !== 0) return;
      sound.tap();
      const next = gomBoard.map((row) => [...row]);
      next[r][c] = gomTurn;
      setGomBoard(next);
      const win = checkGomokuWinner(next);
      if (win !== 0) {
        const won = win === 1;
        onScoreChange(won ? 1 : 0);
        onGameEnd({ won, score: won ? 1 : 0, summary: `Player ${win} aligned 5 stones!` });
        return;
      }
      if (twoPlayer) {
        setGomTurn(gomTurn === 1 ? 2 : 1);
      } else {
        setThinking(true);
        setTimeout(() => {
          // Simple heuristic AI: block/extend near occupied stones
          const candidates: { r: number; c: number; score: number }[] = [];
          for (let rr = 0; rr < 11; rr++) {
            for (let cc = 0; cc < 11; cc++) {
              if (next[rr][cc] !== 0) continue;
              let s = 0;
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  const nr = rr + dr, nc = cc + dc;
                  if (nr >= 0 && nr < 11 && nc >= 0 && nc < 11) {
                    if (next[nr][nc] === 2) s += 3;
                    else if (next[nr][nc] === 1) s += 2;
                  }
                }
              }
              candidates.push({ r: rr, c: cc, score: s + Math.random() * 0.5 });
            }
          }
          candidates.sort((a, b) => b.score - a.score);
          if (candidates[0]) {
            next[candidates[0].r][candidates[0].c] = 2;
            sound.flip();
            setGomBoard([...next]);
            if (checkGomokuWinner(next) === 2) {
              onGameEnd({ won: false, score: 0, summary: 'White AI connected 5 stones!' });
            }
          }
          setThinking(false);
        }, 280);
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-2'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-11 gap-0.5 p-1.5 rounded-xl bg-amber-200 dark:bg-amber-900/60 border border-amber-400 aspect-square"
          style={{ width: isLandscape ? 'min(78vh, 320px)' : 'min(92vw, 350px)' }}
        >
          {gomBoard.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleGomoku(r, c)}
                className="rounded-sm bg-amber-100/80 dark:bg-amber-950/60 flex items-center justify-center p-0.5"
              >
                {cell !== 0 && (
                  <span className={`w-full h-full rounded-full shadow-sm ${cell === 1 ? 'bg-zinc-900' : 'bg-white'}`} />
                )}
              </button>
            ))
          )}
        </div>
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          {thinking ? 'AI placing stone...' : twoPlayer ? `Player ${gomTurn} Turn` : 'Connect 5 (Black)'}
        </div>
      </div>
    );
  }

  // --- 8. Nim Sticks ---
  if (game.id === 'nim') {
    const takeSticks = (rowIdx: number, count: number) => {
      if (isPaused || thinking || nimHeaps[rowIdx] < count) return;
      sound.tap();
      const next = [...nimHeaps];
      next[rowIdx] -= count;
      setNimHeaps(next);
      if (next.every((h) => h === 0)) {
        // Misere: player who took last stick loses
        const won = nimTurn === 2;
        onScoreChange(won ? 1 : 0);
        onGameEnd({ won, score: won ? 1 : 0, summary: `Player ${nimTurn} took the last stick and lost!` });
        return;
      }

      if (twoPlayer) {
        setNimTurn(nimTurn === 1 ? 2 : 1);
      } else {
        setThinking(true);
        setTimeout(() => {
          const aiMove = pickNimAIMove(next);
          next[aiMove.row] = Math.max(0, next[aiMove.row] - aiMove.take);
          sound.flip();
          setNimHeaps([...next]);
          if (next.every((h) => h === 0)) {
            onScoreChange(1);
            onGameEnd({ won: true, score: 1, summary: 'AI was forced to take the last stick!' });
          }
          setThinking(false);
        }, 420);
      }
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 max-w-md mx-auto">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {thinking ? 'AI choosing...' : 'Tap sticks in a row to take from that end (last stick loses)'}
        </div>
        <div className="w-full flex flex-col gap-2.5">
          {nimHeaps.map((count, rIdx) => (
            <div key={rIdx} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-mono text-zinc-500 w-10">Row {rIdx + 1}</span>
              <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
                {Array.from({ length: count }, (_, i) => {
                  const takeAmount = count - i;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Take ${takeAmount} from row ${rIdx + 1}`}
                      onClick={() => takeSticks(rIdx, takeAmount)}
                      className="w-4 h-10 rounded-full bg-amber-600 hover:bg-orange-500 transition-colors active:scale-95"
                    />
                  );
                })}
                {count === 0 && <span className="text-xs text-zinc-400">Empty</span>}
              </div>
              <span className="text-xs font-mono w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- 9. Dots & Boxes ---
  const countOwned = (b: (0 | 1 | 2)[][], p: 1 | 2) => b.flat().filter((x) => x === p).length;

  const tryClaimBoxes = (
    he: (0 | 1 | 2)[][],
    ve: (0 | 1 | 2)[][],
    bx: (0 | 1 | 2)[][],
    player: 1 | 2
  ) => {
    const nextB = bx.map((r) => [...r]);
    let claimed = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (nextB[r][c] === 0 && he[r][c] !== 0 && he[r + 1][c] !== 0 && ve[r][c] !== 0 && ve[r][c + 1] !== 0) {
          nextB[r][c] = player;
          claimed++;
        }
      }
    }
    return { nextB, claimed };
  };

  const handleEdge = (type: 'h' | 'v', r: number, c: number) => {
    if (isPaused || thinking) return;
    if (type === 'h' && hEdges[r][c] !== 0) return;
    if (type === 'v' && vEdges[r][c] !== 0) return;

    const applyMove = (
      he: (0 | 1 | 2)[][],
      ve: (0 | 1 | 2)[][],
      bx: (0 | 1 | 2)[][],
      player: 1 | 2,
      t: 'h' | 'v',
      rr: number,
      cc: number
    ) => {
      const nhe = he.map((row) => [...row]);
      const nve = ve.map((row) => [...row]);
      if (t === 'h') nhe[rr][cc] = player;
      else nve[rr][cc] = player;
      const { nextB, claimed } = tryClaimBoxes(nhe, nve, bx, player);
      return { nhe, nve, nextB, claimed };
    };

    sound.tap();
    const res = applyMove(hEdges, vEdges, boxes, dbTurn, type, r, c);
    setHEdges(res.nhe);
    setVEdges(res.nve);
    setBoxes(res.nextB);
    onScoreChange(countOwned(res.nextB, 1));

    if (res.nextB.flat().every((x) => x !== 0)) {
      const p1 = countOwned(res.nextB, 1);
      const p2 = countOwned(res.nextB, 2);
      onGameEnd({ won: p1 >= p2, score: p1, summary: `Boxes — You: ${p1} · Opponent: ${p2}` });
      return;
    }

    if (res.claimed > 0) {
      sound.score();
      return; // bonus turn!
    }

    if (twoPlayer) {
      setDbTurn(dbTurn === 1 ? 2 : 1);
    } else {
      setThinking(true);
      const runAI = (he: (0 | 1 | 2)[][], ve: (0 | 1 | 2)[][], bx: (0 | 1 | 2)[][]) => {
        const edges: { t: 'h' | 'v'; r: number; c: number }[] = [];
        he.forEach((row, ri) => row.forEach((v, ci) => { if (v === 0) edges.push({ t: 'h', r: ri, c: ci }); }));
        ve.forEach((row, ri) => row.forEach((v, ci) => { if (v === 0) edges.push({ t: 'v', r: ri, c: ci }); }));
        if (edges.length === 0) { setThinking(false); return; }

        // Prefer completing a box
        let chosen = edges[Math.floor(Math.random() * edges.length)];
        for (const e of edges) {
          const test = applyMove(he, ve, bx, 2, e.t, e.r, e.c);
          if (test.claimed > 0) { chosen = e; break; }
        }
        const aiRes = applyMove(he, ve, bx, 2, chosen.t, chosen.r, chosen.c);
        sound.flip();
        setHEdges(aiRes.nhe);
        setVEdges(aiRes.nve);
        setBoxes(aiRes.nextB);
        if (aiRes.nextB.flat().every((x) => x !== 0)) {
          const p1 = countOwned(aiRes.nextB, 1);
          const p2 = countOwned(aiRes.nextB, 2);
          onGameEnd({ won: p1 >= p2, score: p1, summary: `Boxes — You: ${p1} · AI: ${p2}` });
          setThinking(false);
          return;
        }
        if (aiRes.claimed > 0) {
          setTimeout(() => runAI(aiRes.nhe, aiRes.nve, aiRes.nextB), 300);
        } else {
          setThinking(false);
        }
      };
      setTimeout(() => runAI(res.nhe, res.nve, res.nextB), 320);
    }
  };

  return (
    <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-6' : 'flex-col gap-4'} items-center justify-center p-2`}>
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        {[0, 1, 2, 3].map((r) => (
          <div key={r} className="flex flex-col">
            {/* Dot + horizontal edge row */}
            <div className="flex items-center">
              {[0, 1, 2, 3].map((c) => (
                <React.Fragment key={c}>
                  <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 dark:bg-zinc-200 z-10" />
                  {c < 3 && (
                    <button
                      type="button"
                      aria-label={`Horizontal edge ${r},${c}`}
                      onClick={() => handleEdge('h', r, c)}
                      className={`w-14 h-4 -mx-0.5 rounded-full transition-colors ${
                        hEdges[r][c] === 1
                          ? 'bg-orange-500'
                          : hEdges[r][c] === 2
                          ? 'bg-teal-500'
                          : 'bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            {/* Vertical edges + boxes row */}
            {r < 3 && (
              <div className="flex items-center">
                {[0, 1, 2, 3].map((c) => (
                  <React.Fragment key={c}>
                    <button
                      type="button"
                      aria-label={`Vertical edge ${r},${c}`}
                      onClick={() => handleEdge('v', r, c)}
                      className={`w-4 h-14 -my-0.5 rounded-full transition-colors ${
                        vEdges[r][c] === 1
                          ? 'bg-orange-500'
                          : vEdges[r][c] === 2
                          ? 'bg-teal-500'
                          : 'bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300'
                      }`}
                    />
                    {c < 3 && (
                      <div
                        className={`w-14 h-14 flex items-center justify-center font-display font-bold text-lg ${
                          boxes[r][c] === 1
                            ? 'bg-orange-500/20 text-orange-600'
                            : boxes[r][c] === 2
                            ? 'bg-teal-500/20 text-teal-600'
                            : ''
                        }`}
                      >
                        {boxes[r][c] === 1 ? 'P1' : boxes[r][c] === 2 ? (twoPlayer ? 'P2' : 'AI') : ''}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
        P1: {countOwned(boxes, 1)} · {twoPlayer ? 'P2' : 'AI'}: {countOwned(boxes, 2)}
      </div>
    </div>
  );
};
