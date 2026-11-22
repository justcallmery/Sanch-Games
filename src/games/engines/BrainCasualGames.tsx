import React, { useCallback, useEffect, useState } from 'react';
import { GameRuntimeProps } from '../types';
import { sound } from '../../utils/sound';
import { evaluateMastermind, scoreYachtCategory, YachtCategory } from '../logic/cardWordLogic';

// --- Pipe Connect Helper ---
// Directions: 0=Top, 1=Right, 2=Bottom, 3=Left
type PipeShape = 'straight' | 'elbow' | 'tee';
interface PipeTile {
  shape: PipeShape;
  rot: number; // 0..3 clockwise 90deg steps
}

function getPipePorts(tile: PipeTile): boolean[] {
  const base: boolean[] =
    tile.shape === 'straight'
      ? [true, false, true, false]
      : tile.shape === 'elbow'
      ? [true, true, false, false]
      : [true, true, true, false];
  const out = [false, false, false, false];
  for (let i = 0; i < 4; i++) {
    out[(i + tile.rot) % 4] = base[i];
  }
  return out;
}

function createPipeBoard(): PipeTile[][] {
  // Guaranteed solvable 4x4 path with randomized rotations
  const solutionShapes: PipeShape[][] = [
    ['elbow', 'straight', 'elbow', 'elbow'],
    ['straight', 'elbow', 'elbow', 'straight'],
    ['elbow', 'tee', 'straight', 'elbow'],
    ['straight', 'elbow', 'elbow', 'straight'],
  ];
  return solutionShapes.map((row) =>
    row.map((shape) => ({ shape, rot: Math.floor(Math.random() * 4) }))
  );
}

function checkPipeConnected(board: PipeTile[][]): { connected: Set<string>; solved: boolean } {
  const N = 4;
  const visited = new Set<string>();
  const startPorts = getPipePorts(board[0][0]);
  if (!startPorts[3]) return { connected: visited, solved: false }; // Must open Left (IN)

  const queue: [number, number][] = [[0, 0]];
  visited.add('0,0');
  const opp = [2, 3, 0, 1];
  const deltas: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const ports = getPipePorts(board[r][c]);
    for (let d = 0; d < 4; d++) {
      if (!ports[d]) continue;
      const nr = r + deltas[d][0];
      const nc = c + deltas[d][1];
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      const nPorts = getPipePorts(board[nr][nc]);
      if (nPorts[opp[d]]) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  const endPorts = getPipePorts(board[3][3]);
  const solved = visited.has('3,3') && endPorts[1]; // Exits Right (OUT) at bottom-right
  return { connected: visited, solved };
}

const YACHT_CATS: { id: YachtCategory; label: string }[] = [
  { id: 'ones', label: 'Ones' },
  { id: 'twos', label: 'Twos' },
  { id: 'threes', label: 'Threes' },
  { id: 'fours', label: 'Fours' },
  { id: 'fives', label: 'Fives' },
  { id: 'sixes', label: 'Sixes' },
  { id: 'threeKind', label: '3 of Kind' },
  { id: 'fourKind', label: '4 of Kind' },
  { id: 'fullHouse', label: 'Full House' },
  { id: 'smStraight', label: 'Sm Straight' },
  { id: 'lgStraight', label: 'Lg Straight' },
  { id: 'yacht', label: 'Yacht (50)' },
  { id: 'chance', label: 'Chance' },
];

export const BrainCasualGames: React.FC<GameRuntimeProps> = ({
  game,
  isLandscape,
  isPaused,
  restartNonce,
  onScoreChange,
  onGameEnd,
}) => {
  // 1. Simon Says
  const [simonSeq, setSimonSeq] = useState<number[]>([]);
  const [simonIdx, setSimonIdx] = useState(0);
  const [simonLit, setSimonLit] = useState<number | null>(null);
  const [simonShowing, setSimonShowing] = useState(false);

  // 2. Reaction Timer
  const [reactPhase, setReactPhase] = useState<'wait' | 'ready' | 'go' | 'done'>('wait');
  const [reactStart, setReactStart] = useState(0);
  const [reactTimes, setReactTimes] = useState<number[]>([]);
  const [reactMsg, setReactMsg] = useState('Tap Start Trial to begin');

  // 3. Chimp Test
  const [chimpLevel, setChimpLevel] = useState(4);
  const [chimpPositions, setChimpPositions] = useState<Record<number, number>>({});
  const [chimpNext, setChimpNext] = useState(1);
  const [chimpHidden, setChimpHidden] = useState(false);

  // 4. Math Sprint
  const [mathQ, setMathQ] = useState<{ text: string; ans: number; choices: number[] }>({ text: '4 + 5', ans: 9, choices: [7, 8, 9, 10] });
  const [mathTime, setMathTime] = useState(45);
  const [mathScore, setMathScore] = useState(0);

  // 5. Color Match (Stroop)
  const [stroop, setStroop] = useState<{ topWord: string; bottomWord: string; bottomColor: string; match: boolean }>({
    topWord: 'RED', bottomWord: 'BLUE', bottomColor: '#EF4444', match: true,
  });
  const [stroopTime, setStroopTime] = useState(35);
  const [stroopScore, setStroopScore] = useState(0);

  // 6. Number Sequence
  const [seqData, setSeqData] = useState<{ seq: number[]; ans: number; choices: number[] }>({ seq: [2, 4, 6, 8], ans: 10, choices: [9, 10, 12, 14] });
  const [seqRound, setSeqRound] = useState(1);
  const [seqScore, setSeqScore] = useState(0);

  // 7. Pipe Connect
  const [pipeBoard, setPipeBoard] = useState<PipeTile[][]>(createPipeBoard);
  const [pipeMoves, setPipeMoves] = useState(0);

  // 8. Mastermind
  const [mmSecret, setMmSecret] = useState<number[]>([0, 1, 2, 3]);
  const [mmGuess, setMmGuess] = useState<number[]>([0, 0, 0, 0]);
  const [mmHistory, setMmHistory] = useState<{ guess: number[]; exact: number; partial: number }[]>([]);

  // 9. Dice Yacht
  const [dice, setDice] = useState<number[]>([1, 2, 3, 4, 5]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [yachtScores, setYachtScores] = useState<Partial<Record<YachtCategory, number>>>({});

  const genMathQ = useCallback(() => {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const a = op === '×' ? 2 + Math.floor(Math.random() * 11) : 5 + Math.floor(Math.random() * 35);
    const b = op === '×' ? 2 + Math.floor(Math.random() * 11) : 3 + Math.floor(Math.random() * 25);
    const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    const choices = new Set<number>([ans]);
    while (choices.size < 4) {
      choices.add(ans + (Math.floor(Math.random() * 11) - 5));
    }
    setMathQ({
      text: `${a} ${op} ${b}`,
      ans,
      choices: Array.from(choices).sort(() => Math.random() - 0.5),
    });
  }, []);

  const genStroop = useCallback(() => {
    const items = [
      { name: 'RED', hex: '#EF4444' },
      { name: 'BLUE', hex: '#3B82F6' },
      { name: 'GREEN', hex: '#10B981' },
      { name: 'AMBER', hex: '#F59E0B' },
    ];
    const top = items[Math.floor(Math.random() * items.length)];
    const shouldMatch = Math.random() < 0.5;
    const bottomColorItem = shouldMatch ? top : items.filter((i) => i.name !== top.name)[Math.floor(Math.random() * 3)];
    const bottomWordItem = items[Math.floor(Math.random() * items.length)];
    setStroop({
      topWord: top.name,
      bottomWord: bottomWordItem.name,
      bottomColor: bottomColorItem.hex,
      match: shouldMatch,
    });
  }, []);

  const genSequence = useCallback(() => {
    const mode = Math.floor(Math.random() * 3);
    let seq: number[] = [];
    let ans = 0;
    if (mode === 0) {
      const start = 2 + Math.floor(Math.random() * 10);
      const step = 2 + Math.floor(Math.random() * 8);
      seq = [start, start + step, start + step * 2, start + step * 3];
      ans = start + step * 4;
    } else if (mode === 1) {
      const start = 1 + Math.floor(Math.random() * 4);
      const mult = 2 + Math.floor(Math.random() * 2);
      seq = [start, start * mult, start * mult ** 2, start * mult ** 3];
      ans = start * mult ** 4;
    } else {
      const base = 1 + Math.floor(Math.random() * 5);
      seq = [base, base + 1, base + 3, base + 6];
      ans = base + 10;
    }
    const choices = new Set<number>([ans]);
    while (choices.size < 4) choices.add(Math.max(1, ans + Math.floor(Math.random() * 12) - 5));
    setSeqData({ seq, ans, choices: Array.from(choices).sort(() => Math.random() - 0.5) });
  }, []);

  const setupChimp = useCallback((count: number) => {
    const cells = Array.from({ length: 20 }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
    const map: Record<number, number> = {};
    cells.forEach((cellIdx, i) => {
      map[cellIdx] = i + 1;
    });
    setChimpPositions(map);
    setChimpNext(1);
    setChimpHidden(false);
  }, []);

  const playSimonSequence = useCallback((seq: number[]) => {
    setSimonShowing(true);
    const tones = [261.63, 329.63, 392.0, 523.25];
    seq.forEach((pad, idx) => {
      setTimeout(() => {
        setSimonLit(pad);
        sound.playTone(tones[pad], 0.18, 'sine', 0.12);
        setTimeout(() => setSimonLit(null), 260);
      }, idx * 450 + 250);
    });
    setTimeout(() => setSimonShowing(false), seq.length * 450 + 300);
  }, []);

  useEffect(() => {
    if (game.id === 'simon-says') {
      const first = [Math.floor(Math.random() * 4)];
      setSimonSeq(first);
      setSimonIdx(0);
      onScoreChange(0);
      playSimonSequence(first);
    } else if (game.id === 'reaction-timer') {
      setReactPhase('wait');
      setReactTimes([]);
      setReactMsg('Tap Start Trial to test your reflex (5 rounds)');
      onScoreChange(0);
    } else if (game.id === 'chimp-test') {
      setChimpLevel(4);
      setupChimp(4);
      onScoreChange(0);
    } else if (game.id === 'math-sprint') {
      genMathQ();
      setMathTime(45);
      setMathScore(0);
      onScoreChange(0);
    } else if (game.id === 'color-match') {
      genStroop();
      setStroopTime(35);
      setStroopScore(0);
      onScoreChange(0);
    } else if (game.id === 'number-sequence') {
      genSequence();
      setSeqRound(1);
      setSeqScore(0);
      onScoreChange(0);
    } else if (game.id === 'pipe-connect') {
      setPipeBoard(createPipeBoard());
      setPipeMoves(0);
      onScoreChange(0);
    } else if (game.id === 'mastermind') {
      setMmSecret(Array.from({ length: 4 }, () => Math.floor(Math.random() * 6)));
      setMmGuess([0, 1, 2, 3]);
      setMmHistory([]);
      onScoreChange(0);
    } else if (game.id === 'yacht-dice') {
      setDice(Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6)));
      setHeld([false, false, false, false, false]);
      setRollsLeft(2);
      setYachtScores({});
      onScoreChange(0);
    }
  }, [game.id, restartNonce]);

  // Countdown timers for Math Sprint and Color Match
  useEffect(() => {
    if (isPaused) return;
    if (game.id === 'math-sprint') {
      const t = setInterval(() => {
        setMathTime((s) => {
          if (s <= 1) {
            onGameEnd({ won: mathScore >= 50, score: mathScore, summary: `45s Sprint Score: ${mathScore}` });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
    if (game.id === 'color-match') {
      const t = setInterval(() => {
        setStroopTime((s) => {
          if (s <= 1) {
            onGameEnd({ won: stroopScore >= 50, score: stroopScore, summary: `Stroop Reflex Score: ${stroopScore}` });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [game.id, isPaused, mathScore, stroopScore]);

  // --- 1. Simon Says ---
  if (game.id === 'simon-says') {
    const pads = [
      { color: 'bg-emerald-500', lit: 'bg-emerald-300 scale-95', freq: 261.63, name: 'Green' },
      { color: 'bg-red-500', lit: 'bg-red-300 scale-95', freq: 329.63, name: 'Red' },
      { color: 'bg-amber-400', lit: 'bg-amber-200 scale-95', freq: 392.0, name: 'Amber' },
      { color: 'bg-blue-500', lit: 'bg-blue-300 scale-95', freq: 523.25, name: 'Blue' },
    ];
    const tapPad = (padIdx: number) => {
      if (isPaused || simonShowing) return;
      sound.playTone(pads[padIdx].freq, 0.14, 'sine', 0.12);
      setSimonLit(padIdx);
      setTimeout(() => setSimonLit(null), 160);

      if (padIdx === simonSeq[simonIdx]) {
        if (simonIdx + 1 === simonSeq.length) {
          const pts = simonSeq.length * 10;
          onScoreChange(pts);
          const nextSeq = [...simonSeq, Math.floor(Math.random() * 4)];
          setSimonSeq(nextSeq);
          setSimonIdx(0);
          setTimeout(() => playSimonSequence(nextSeq), 450);
        } else {
          setSimonIdx(simonIdx + 1);
        }
      } else {
        sound.error();
        const pts = (simonSeq.length - 1) * 10;
        onGameEnd({ won: pts >= 40, score: pts, summary: `Repeated ${simonSeq.length - 1} steps!` });
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-6' : 'flex-col gap-4'} items-center justify-center p-2`}>
        <div className="grid grid-cols-2 gap-3 w-[min(78vw,280px)] aspect-square" style={{ maxHeight: isLandscape ? '76vh' : undefined, maxWidth: isLandscape ? '76vh' : undefined }}>
          {pads.map((p, i) => (
            <button
              key={p.name}
              type="button"
              aria-label={`${p.name} pad`}
              onClick={() => tapPad(i)}
              className={`rounded-2xl transition-all shadow-md ${simonLit === i ? p.lit : p.color}`}
            />
          ))}
        </div>
        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
          {simonShowing ? 'Watch pattern...' : `Step ${simonIdx + 1} / ${simonSeq.length}`}
        </div>
      </div>
    );
  }

  // --- 2. Reaction Timer ---
  if (game.id === 'reaction-timer') {
    const startTrial = () => {
      setReactPhase('ready');
      setReactMsg('Wait for Emerald Green...');
      const delay = 1400 + Math.random() * 2200;
      setTimeout(() => {
        setReactPhase((cur) => {
          if (cur !== 'ready') return cur;
          setReactStart(performance.now());
          setReactMsg('TAP NOW!');
          return 'go';
        });
      }, delay);
    };

    const handlePadTap = () => {
      if (isPaused) return;
      if (reactPhase === 'wait') {
        startTrial();
      } else if (reactPhase === 'ready') {
        sound.error();
        setReactPhase('wait');
        setReactMsg('Too early! Tap to retry trial');
      } else if (reactPhase === 'go') {
        const ms = Math.round(performance.now() - reactStart);
        sound.score();
        const nextTimes = [...reactTimes, ms];
        setReactTimes(nextTimes);
        const avg = Math.round(nextTimes.reduce((a, b) => a + b, 0) / nextTimes.length);
        onScoreChange(avg, `${avg}ms`);
        if (nextTimes.length >= 5) {
          setReactPhase('done');
          onGameEnd({ won: avg < 380, score: avg, summary: `5-round average: ${avg}ms` });
        } else {
          setReactPhase('wait');
          setReactMsg(`${ms}ms! Tap for trial ${nextTimes.length + 1}/5`);
        }
      }
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-3">
        <button
          type="button"
          onClick={handlePadTap}
          className={`w-full max-w-md h-64 rounded-3xl font-display font-bold text-xl text-white shadow-lg flex flex-col items-center justify-center gap-2 transition-colors ${
            reactPhase === 'go'
              ? 'bg-emerald-500'
              : reactPhase === 'ready'
              ? 'bg-red-600'
              : 'bg-zinc-800'
          }`}
        >
          <span>{reactMsg}</span>
          {reactTimes.length > 0 && (
            <span className="text-xs font-mono opacity-80">Trials: {reactTimes.map((t) => `${t}ms`).join(' · ')}</span>
          )}
        </button>
      </div>
    );
  }

  // --- 3. Chimp Test ---
  if (game.id === 'chimp-test') {
    const tapChimpCell = (cellIdx: number) => {
      if (isPaused) return;
      const num = chimpPositions[cellIdx];
      if (!num) return;
      if (num === chimpNext) {
        sound.tap();
        if (num === 1) setChimpHidden(true);
        const nextPos = { ...chimpPositions };
        delete nextPos[cellIdx];
        setChimpPositions(nextPos);
        if (num === chimpLevel) {
          sound.win();
          const pts = chimpLevel * 25;
          onScoreChange(pts);
          const nextLvl = chimpLevel + 1;
          setChimpLevel(nextLvl);
          setTimeout(() => setupChimp(nextLvl), 400);
        } else {
          setChimpNext(num + 1);
        }
      } else {
        sound.error();
        onGameEnd({ won: chimpLevel >= 6, score: (chimpLevel - 1) * 25, summary: `Reached ${chimpLevel} numbers!` });
      }
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-2">
        <div className="text-xs font-mono text-zinc-500">Numbers: {chimpLevel} · Tap 1..{chimpLevel} in order</div>
        <div className="grid grid-cols-5 gap-2 p-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 w-[min(92vw,340px)]">
          {Array.from({ length: 20 }, (_, idx) => {
            const val = chimpPositions[idx];
            return (
              <button
                key={idx}
                type="button"
                disabled={!val}
                onClick={() => tapChimpCell(idx)}
                className={`aspect-square rounded-xl font-display font-bold text-lg flex items-center justify-center ${
                  !val
                    ? 'bg-transparent'
                    : chimpHidden
                    ? 'bg-white dark:bg-zinc-700 border-2 border-amber-500 text-transparent'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {val ?? ''}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- 4. Math Sprint ---
  if (game.id === 'math-sprint') {
    const answerMath = (val: number) => {
      if (isPaused) return;
      if (val === mathQ.ans) {
        sound.score();
        const ns = mathScore + 10;
        setMathScore(ns);
        onScoreChange(ns);
      } else {
        sound.error();
      }
      genMathQ();
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-3 max-w-sm mx-auto">
        <div className="text-xs font-mono text-zinc-500">Time: {mathTime}s</div>
        <div className="text-4xl font-display font-extrabold tabular-nums">{mathQ.text} = ?</div>
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {mathQ.choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => answerMath(c)}
              className="min-h-[54px] rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono font-bold text-xl hover:border-blue-500 active:scale-95"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- 5. Color Match (Stroop) ---
  if (game.id === 'color-match') {
    const pickStroop = (userSaysMatch: boolean) => {
      if (isPaused) return;
      if (userSaysMatch === stroop.match) {
        sound.score();
        const ns = stroopScore + 10;
        setStroopScore(ns);
        onScoreChange(ns);
      } else {
        sound.error();
      }
      genStroop();
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-3 max-w-sm mx-auto">
        <div className="text-xs font-mono text-zinc-500">Time: {stroopTime}s · Does Meaning match Ink Color?</div>
        <div className="w-full p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-3">
          <span className="text-xs text-zinc-400">MEANING</span>
          <span className="text-3xl font-display font-extrabold">{stroop.topWord}</span>
          <span className="text-xs text-zinc-400 mt-1">INK COLOR</span>
          <span className="text-3xl font-display font-extrabold" style={{ color: stroop.bottomColor }}>
            {stroop.bottomWord}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full">
          <button type="button" onClick={() => pickStroop(false)} className="min-h-[48px] rounded-xl bg-rose-600 text-white font-bold text-sm">No Match</button>
          <button type="button" onClick={() => pickStroop(true)} className="min-h-[48px] rounded-xl bg-emerald-600 text-white font-bold text-sm">Match</button>
        </div>
      </div>
    );
  }

  // --- 6. Number Sequence ---
  if (game.id === 'number-sequence') {
    const answerSeq = (val: number) => {
      if (isPaused) return;
      let nextScore = seqScore;
      if (val === seqData.ans) {
        sound.score();
        nextScore += 50;
        setSeqScore(nextScore);
        onScoreChange(nextScore);
      } else {
        sound.error();
      }
      if (seqRound >= 8) {
        onGameEnd({ won: nextScore >= 250, score: nextScore, summary: `Completed 8 sequence puzzles · ${nextScore} pts` });
      } else {
        setSeqRound((r) => r + 1);
        genSequence();
      }
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-3 max-w-md mx-auto">
        <div className="text-xs font-mono text-zinc-500">Puzzle {seqRound}/8</div>
        <div className="flex items-center gap-2 font-mono font-bold text-2xl">
          {seqData.seq.map((n, i) => (
            <span key={i} className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">{n}</span>
          ))}
          <span className="px-3 py-2 rounded-xl bg-teal-600 text-white">?</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
          {seqData.choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => answerSeq(c)}
              className="min-h-[48px] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono font-bold text-lg"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- 7. Pipe Connect ---
  if (game.id === 'pipe-connect') {
    const { connected } = checkPipeConnected(pipeBoard);
    const rotateTile = (r: number, c: number) => {
      if (isPaused) return;
      sound.tap();
      const next = pipeBoard.map((row, ri) =>
        row.map((tile, ci) => (ri === r && ci === c ? { ...tile, rot: (tile.rot + 1) % 4 } : tile))
      );
      const nextMoves = pipeMoves + 1;
      setPipeBoard(next);
      setPipeMoves(nextMoves);
      const res = checkPipeConnected(next);
      onScoreChange(res.connected.size * 25);
      if (res.solved) {
        sound.win();
        const pts = Math.max(100, 400 - nextMoves * 10);
        onScoreChange(pts);
        onGameEnd({ won: true, score: pts, summary: `Connected pipeline in ${nextMoves} rotations!` });
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-5' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-sky-600">IN→</span>
          <div
            className="grid grid-cols-4 gap-1 p-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 aspect-square"
            style={{ width: isLandscape ? 'min(74vh, 290px)' : 'min(78vw, 310px)' }}
          >
            {pipeBoard.map((row, r) =>
              row.map((tile, c) => {
                const isWet = connected.has(`${r},${c}`);
                const ports = getPipePorts(tile);
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    aria-label={`Pipe ${r + 1},${c + 1}`}
                    onClick={() => rotateTile(r, c)}
                    className="rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-1"
                  >
                    <svg viewBox="0 0 40 40" className="w-full h-full">
                      <circle cx="20" cy="20" r="6" fill={isWet ? '#0284C7' : '#64748B'} />
                      {ports[0] && <rect x="16" y="0" width="8" height="20" fill={isWet ? '#0284C7' : '#64748B'} />}
                      {ports[1] && <rect x="20" y="16" width="20" height="8" fill={isWet ? '#0284C7' : '#64748B'} />}
                      {ports[2] && <rect x="16" y="20" width="8" height="20" fill={isWet ? '#0284C7' : '#64748B'} />}
                      {ports[3] && <rect x="0" y="16" width="20" height="8" fill={isWet ? '#0284C7' : '#64748B'} />}
                    </svg>
                  </button>
                );
              })
            )}
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600">→OUT</span>
        </div>
        <div className="text-xs font-mono text-zinc-500">Rotations: {pipeMoves}</div>
      </div>
    );
  }

  // --- 8. Mastermind ---
  if (game.id === 'mastermind') {
    const pegColors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-400', 'bg-purple-500', 'bg-orange-500'];
    const submitGuess = () => {
      if (isPaused) return;
      const ev = evaluateMastermind(mmGuess, mmSecret);
      const nextHist = [...mmHistory, { guess: [...mmGuess], ...ev }];
      setMmHistory(nextHist);
      if (ev.exact === 4) {
        sound.win();
        const pts = Math.max(100, 900 - nextHist.length * 80);
        onScoreChange(pts);
        onGameEnd({ won: true, score: pts, summary: `Cracked code in ${nextHist.length}/8 guesses!` });
      } else if (nextHist.length >= 8) {
        sound.lose();
        onGameEnd({ won: false, score: 0, summary: 'Out of 8 attempts!' });
      } else {
        sound.tap();
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-5' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto px-2">
          {mmHistory.map((h, i) => (
            <div key={i} className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-1.5">
                {h.guess.map((c, ci) => <span key={ci} className={`w-6 h-6 rounded-full ${pegColors[c]}`} />)}
              </div>
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                {h.exact} Exact · {h.partial} Color
              </span>
            </div>
          ))}
          {mmHistory.length === 0 && <div className="text-xs text-zinc-500">Tap pegs to cycle colors, then Submit</div>}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2 p-2 rounded-2xl bg-zinc-200 dark:bg-zinc-800">
            {mmGuess.map((c, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Peg ${idx + 1}`}
                onClick={() => {
                  sound.tap();
                  setMmGuess((g) => g.map((v, i) => (i === idx ? (v + 1) % 6 : v)));
                }}
                className={`w-11 h-11 rounded-full border-2 border-white shadow ${pegColors[c]}`}
              />
            ))}
          </div>
          <button type="button" onClick={submitGuess} className="min-h-[42px] px-6 rounded-xl bg-orange-600 text-white font-bold text-sm">
            Submit ({mmHistory.length}/8)
          </button>
        </div>
      </div>
    );
  }

  // --- 9. Dice Yacht (Yahtzee) ---
  const totalYacht = Object.values(yachtScores).reduce((a, b) => a + (b ?? 0), 0);
  const rollDice = () => {
    if (isPaused || rollsLeft <= 0) return;
    sound.flip();
    setDice((prev) => prev.map((d, i) => (held[i] ? d : 1 + Math.floor(Math.random() * 6))));
    setRollsLeft((r) => r - 1);
  };

  const scoreCategory = (cat: YachtCategory) => {
    if (isPaused || yachtScores[cat] !== undefined) return;
    const pts = scoreYachtCategory(dice, cat);
    sound.score();
    const nextScores = { ...yachtScores, [cat]: pts };
    setYachtScores(nextScores);
    const nextTotal = Object.values(nextScores).reduce((a, b) => a + (b ?? 0), 0);
    onScoreChange(nextTotal);

    if (Object.keys(nextScores).length === YACHT_CATS.length) {
      sound.win();
      onGameEnd({ won: nextTotal >= 150, score: nextTotal, summary: `Final Yacht Score: ${nextTotal}` });
    } else {
      setDice(Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6)));
      setHeld([false, false, false, false, false]);
      setRollsLeft(2);
    }
  };

  return (
    <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {dice.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                sound.tap();
                setHeld((h) => h.map((v, idx) => (idx === i ? !v : v)));
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-display font-extrabold text-xl border-2 transition-transform ${
                held[i]
                  ? 'bg-amber-400 text-zinc-950 border-amber-600 -translate-y-1'
                  : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={rollsLeft <= 0}
          onClick={rollDice}
          className="min-h-[42px] px-6 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-40"
        >
          Roll Dice ({rollsLeft} left)
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-[210px] overflow-y-auto w-full max-w-md">
        {YACHT_CATS.map((cat) => {
          const locked = yachtScores[cat.id] !== undefined;
          const preview = scoreYachtCategory(dice, cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              disabled={locked}
              onClick={() => scoreCategory(cat.id)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between ${
                locked
                  ? 'bg-zinc-200 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 opacity-60'
                  : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-orange-500'
              }`}
            >
              <span className="truncate">{cat.label}</span>
              <span className="font-mono font-bold ml-1">{locked ? yachtScores[cat.id] : `+${preview}`}</span>
            </button>
          );
        })}
      </div>
      <div className="text-xs font-mono">Total: {totalYacht}</div>
    </div>
  );
};
