import React, { useCallback, useEffect, useState } from 'react';
import { GameRuntimeProps } from '../types';
import { sound } from '../../utils/sound';
import {
  COMMON_DICTIONARY_SET,
  evaluateWordGuess,
  FIVE_LETTER_WORDS,
  HANGMAN_WORDS,
  OFFLINE_TRIVIA,
  SCRAMBLE_WORDS,
  TriviaQuestion,
} from '../logic/cardWordLogic';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function buildWordSearchGrid(words: string[]): { grid: string[][]; placements: Record<string, [number, number][]> } {
  const N = 10;
  const grid: string[][] = Array.from({ length: N }, () => Array(N).fill(''));
  const placements: Record<string, [number, number][]> = {};
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const w of words) {
    let placed = false;
    for (let attempt = 0; attempt < 80 && !placed; attempt++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const r0 = Math.floor(Math.random() * N);
      const c0 = Math.floor(Math.random() * N);
      const rEnd = r0 + dr * (w.length - 1);
      const cEnd = c0 + dc * (w.length - 1);
      if (rEnd < 0 || rEnd >= N || cEnd < 0 || cEnd >= N) continue;
      let ok = true;
      const coords: [number, number][] = [];
      for (let i = 0; i < w.length; i++) {
        const rr = r0 + dr * i, cc = c0 + dc * i;
        if (grid[rr][cc] !== '' && grid[rr][cc] !== w[i]) {
          ok = false;
          break;
        }
        coords.push([rr, cc]);
      }
      if (ok) {
        coords.forEach(([rr, cc], i) => (grid[rr][cc] = w[i]));
        placements[w] = coords;
        placed = true;
      }
    }
  }
  const letters = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c] === '') grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
    }
  }
  return { grid, placements };
}

export const WordTriviaGames: React.FC<GameRuntimeProps> = ({
  game,
  isLandscape,
  isPaused,
  restartNonce,
  onScoreChange,
  onGameEnd,
}) => {
  // 1. Word Guess 5
  const [wgTarget, setWgTarget] = useState('CRANE');
  const [wgGuesses, setWgGuesses] = useState<string[]>([]);
  const [wgCurrent, setWgCurrent] = useState('');
  const [wgMsg, setWgMsg] = useState('');

  // 2. Hangman
  const [hmItem, setHmItem] = useState(HANGMAN_WORDS[0]);
  const [hmGuessed, setHmGuessed] = useState<Set<string>>(new Set());
  const [hmStreak, setHmStreak] = useState(0);

  // 3. Word Scramble
  const [wsWord, setWsWord] = useState('PLANET');
  const [wsTiles, setWsTiles] = useState<{ ch: string; used: boolean }[]>([]);
  const [wsPicked, setWsPicked] = useState<{ ch: string; srcIdx: number }[]>([]);
  const [wsScore, setWsScore] = useState(0);

  // 4. Word Search
  const [wsTargetWords] = useState(['SOLAR', 'ORBIT', 'PRISM', 'CHESS', 'MAPLE', 'TIGER']);
  const [wsGridData, setWsGridData] = useState(() => buildWordSearchGrid(['SOLAR', 'ORBIT', 'PRISM', 'CHESS', 'MAPLE', 'TIGER']));
  const [wsFound, setWsFound] = useState<Set<string>>(new Set());
  const [wsStartCell, setWsStartCell] = useState<[number, number] | null>(null);

  // 5. Boggle 4x4
  const [bogDice, setBogDice] = useState<string[]>([]);
  const [bogPath, setBogPath] = useState<number[]>([]);
  const [bogWords, setBogWords] = useState<string[]>([]);
  const [bogTime, setBogTime] = useState(90);
  const [bogScore, setBogScore] = useState(0);

  // 6. Typing Blitz
  const [tbQueue, setTbQueue] = useState<string[]>(['SOLAR', 'PULSE', 'TIGER']);
  const [tbTyped, setTbTyped] = useState('');
  const [tbScore, setTbScore] = useState(0);

  // 7. Trivia
  const [trQuestions, setTrQuestions] = useState<TriviaQuestion[]>([]);
  const [trIdx, setTrIdx] = useState(0);
  const [trScore, setTrScore] = useState(0);
  const [trFeedback, setTrFeedback] = useState<number | null>(null);

  // 8. Anagram Rack
  const [anaRack, setAnaRack] = useState<string[]>(['S', 'T', 'A', 'R', 'E', 'L', 'N']);
  const [anaPick, setAnaPick] = useState<number[]>([]);
  const [anaFound, setAnaFound] = useState<string[]>([]);
  const [anaTime, setAnaTime] = useState(60);
  const [anaScore, setAnaScore] = useState(0);

  const loadScramble = useCallback(() => {
    const w = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
    const letters = w.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    setWsWord(w);
    setWsTiles(letters.map((ch) => ({ ch, used: false })));
    setWsPicked([]);
  }, []);

  useEffect(() => {
    if (game.id === 'word-guess') {
      setWgTarget(FIVE_LETTER_WORDS[Math.floor(Math.random() * FIVE_LETTER_WORDS.length)]);
      setWgGuesses([]);
      setWgCurrent('');
      setWgMsg('');
      onScoreChange(0);
    } else if (game.id === 'hangman') {
      setHmItem(HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]);
      setHmGuessed(new Set());
      setHmStreak(0);
      onScoreChange(0);
    } else if (game.id === 'word-scramble') {
      loadScramble();
      setWsScore(0);
      onScoreChange(0);
    } else if (game.id === 'word-search') {
      setWsGridData(buildWordSearchGrid(wsTargetWords));
      setWsFound(new Set());
      setWsStartCell(null);
      onScoreChange(0);
    } else if (game.id === 'boggle') {
      const pool = 'AAEEGNABBJOOACHOPSCAFFKPSDEILRXDELRVYDISTTYEEGHNWEEINSUEHRTVWEIOSSTELRTTYHIMNUQ';
      const dice = Array.from({ length: 16 }, () => pool[Math.floor(Math.random() * pool.length)]);
      setBogDice(dice);
      setBogPath([]);
      setBogWords([]);
      setBogTime(90);
      setBogScore(0);
      onScoreChange(0);
    } else if (game.id === 'typing-blitz') {
      setTbQueue([
        FIVE_LETTER_WORDS[Math.floor(Math.random() * FIVE_LETTER_WORDS.length)],
        FIVE_LETTER_WORDS[Math.floor(Math.random() * FIVE_LETTER_WORDS.length)],
      ]);
      setTbTyped('');
      setTbScore(0);
      onScoreChange(0);
    } else if (game.id === 'trivia') {
      const shuffled = [...OFFLINE_TRIVIA].sort(() => Math.random() - 0.5).slice(0, 10);
      setTrQuestions(shuffled);
      setTrIdx(0);
      setTrScore(0);
      setTrFeedback(null);
      onScoreChange(0);
    } else if (game.id === 'anagram-duel') {
      const racks = [
        ['S', 'T', 'A', 'R', 'E', 'L', 'N'],
        ['P', 'L', 'A', 'N', 'E', 'T', 'S'],
        ['C', 'A', 'R', 'E', 'S', 'T', 'O'],
        ['B', 'R', 'A', 'I', 'N', 'E', 'D'],
      ];
      setAnaRack(racks[Math.floor(Math.random() * racks.length)]);
      setAnaPick([]);
      setAnaFound([]);
      setAnaTime(60);
      setAnaScore(0);
      onScoreChange(0);
    }
  }, [game.id, restartNonce, loadScramble]);

  // Timers for Boggle, Typing Blitz, Anagram
  useEffect(() => {
    if (isPaused) return;
    if (game.id === 'boggle') {
      const t = setInterval(() => {
        setBogTime((sec) => {
          if (sec <= 1) {
            onGameEnd({ won: bogScore > 0, score: bogScore, summary: `Found ${bogWords.length} words!` });
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
    if (game.id === 'anagram-duel') {
      const t = setInterval(() => {
        setAnaTime((sec) => {
          if (sec <= 1) {
            onGameEnd({ won: anaScore > 0, score: anaScore, summary: `Formed ${anaFound.length} words!` });
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
    if (game.id === 'typing-blitz') {
      const t = setInterval(() => {
        setTbQueue((q) => {
          if (q.length >= 6) {
            onGameEnd({ won: false, score: tbScore, summary: `Word queue overflowed! Score: ${tbScore}` });
            return q;
          }
          return [...q, FIVE_LETTER_WORDS[Math.floor(Math.random() * FIVE_LETTER_WORDS.length)]];
        });
      }, 3600);
      return () => clearInterval(t);
    }
  }, [game.id, isPaused, bogScore, bogWords.length, anaScore, anaFound.length, tbScore]);

  // Word Guess 5 handler
  const handleWordGuessKey = useCallback(
    (key: string) => {
      if (isPaused) return;
      if (key === 'DEL' || key === 'BACKSPACE') {
        setWgCurrent((c) => c.slice(0, -1));
        setWgMsg('');
        return;
      }
      if (key === 'ENTER') {
        if (wgCurrent.length !== 5) {
          sound.error();
          setWgMsg('Enter 5 letters');
          return;
        }
        sound.tap();
        const nextGuesses = [...wgGuesses, wgCurrent];
        setWgGuesses(nextGuesses);
        setWgCurrent('');
        if (wgCurrent === wgTarget) {
          sound.win();
          const pts = 7 - nextGuesses.length;
          onScoreChange(pts);
          onGameEnd({ won: true, score: pts, summary: `Solved "${wgTarget}" in ${nextGuesses.length}/6 tries!` });
        } else if (nextGuesses.length >= 6) {
          sound.lose();
          onGameEnd({ won: false, score: 0, summary: `The word was ${wgTarget}` });
        }
        return;
      }
      if (/^[A-Z]$/.test(key) && wgCurrent.length < 5) {
        sound.tap();
        setWgCurrent((c) => c + key);
      }
    },
    [isPaused, wgCurrent, wgGuesses, wgTarget, onScoreChange, onGameEnd]
  );

  // Physical keyboard support for word games
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (game.id === 'word-guess') {
        const k = e.key.toUpperCase();
        if (k === 'ENTER' || k === 'BACKSPACE' || /^[A-Z]$/.test(k)) {
          e.preventDefault();
          handleWordGuessKey(k);
        }
      } else if (game.id === 'typing-blitz') {
        const k = e.key.toUpperCase();
        if (/^[A-Z]$/.test(k) && tbQueue.length > 0) {
          e.preventDefault();
          const target = tbQueue[0];
          if (target[tbTyped.length] === k) {
            sound.tap();
            const nextTyped = tbTyped + k;
            if (nextTyped === target) {
              sound.score();
              const nextScore = tbScore + 25;
              setTbScore(nextScore);
              onScoreChange(nextScore);
              setTbQueue((q) => q.slice(1));
              setTbTyped('');
            } else {
              setTbTyped(nextTyped);
            }
          } else {
            sound.error();
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game.id, handleWordGuessKey, tbQueue, tbTyped, tbScore]);

  // --- 1. Word Guess 5 ---
  if (game.id === 'word-guess') {
    const keyStates: Record<string, 'correct' | 'present' | 'absent'> = {};
    wgGuesses.forEach((g) => {
      const ev = evaluateWordGuess(g, wgTarget);
      g.split('').forEach((ch, idx) => {
        const cur = keyStates[ch];
        if (ev[idx] === 'correct') keyStates[ch] = 'correct';
        else if (ev[idx] === 'present' && cur !== 'correct') keyStates[ch] = 'present';
        else if (!cur) keyStates[ch] = 'absent';
      });
    });

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-2'} items-center justify-center p-2`}>
        <div className="flex flex-col items-center gap-1">
          {wgMsg && <div className="text-xs font-semibold text-orange-500">{wgMsg}</div>}
          <div className="grid grid-rows-6 gap-1">
            {Array.from({ length: 6 }, (_, r) => {
              const guess = wgGuesses[r] ?? (r === wgGuesses.length ? wgCurrent : '');
              const evaluated = r < wgGuesses.length ? evaluateWordGuess(guess, wgTarget) : null;
              return (
                <div key={r} className="grid grid-cols-5 gap-1">
                  {Array.from({ length: 5 }, (_, c) => {
                    const ch = guess[c] ?? '';
                    const st = evaluated?.[c];
                    return (
                      <div
                        key={c}
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border-2 font-display font-bold text-lg flex items-center justify-center ${
                          st === 'correct'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : st === 'present'
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : st === 'absent'
                            ? 'bg-zinc-500 border-zinc-500 text-white'
                            : ch
                            ? 'border-zinc-500 bg-white dark:bg-zinc-800'
                            : 'border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900'
                        }`}
                      >
                        {ch}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1 items-center">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((k) => {
                const st = keyStates[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleWordGuessKey(k)}
                    className={`min-h-[38px] ${k.length > 1 ? 'px-2.5 text-[10px]' : 'w-7 sm:w-8 text-xs'} rounded-md font-bold transition-colors ${
                      st === 'correct'
                        ? 'bg-emerald-600 text-white'
                        : st === 'present'
                        ? 'bg-amber-500 text-white'
                        : st === 'absent'
                        ? 'bg-zinc-600 text-zinc-200'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- 2. Hangman ---
  if (game.id === 'hangman') {
    const misses = Array.from(hmGuessed).filter((l) => !hmItem.word.includes(l)).length;
    const revealedAll = hmItem.word.split('').every((l) => hmGuessed.has(l));

    const pickLetter = (ch: string) => {
      if (isPaused || hmGuessed.has(ch)) return;
      const next = new Set(hmGuessed);
      next.add(ch);
      setHmGuessed(next);
      const nextMisses = Array.from(next).filter((l) => !hmItem.word.includes(l)).length;
      if (hmItem.word.includes(ch)) {
        sound.score();
        if (hmItem.word.split('').every((l) => next.has(l))) {
          sound.win();
          const ns = hmStreak + 1;
          setHmStreak(ns);
          onScoreChange(ns);
          setTimeout(() => {
            setHmItem(HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]);
            setHmGuessed(new Set());
          }, 700);
        }
      } else {
        sound.error();
        if (nextMisses >= 6) {
          sound.lose();
          onGameEnd({ won: false, score: hmStreak, summary: `Word was ${hmItem.word} · Streak: ${hmStreak}` });
        }
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-5' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div className="flex flex-col items-center gap-2">
          <svg viewBox="0 0 120 110" className="w-28 h-24 stroke-zinc-700 dark:stroke-zinc-200" fill="none" strokeWidth="4" strokeLinecap="round">
            <path d="M15 100h90M35 100V15h45v15" />
            {misses >= 1 && <circle cx="80" cy="40" r="10" />}
            {misses >= 2 && <path d="M80 50v26" />}
            {misses >= 3 && <path d="M80 56l-14 10" />}
            {misses >= 4 && <path d="M80 56l14 10" />}
            {misses >= 5 && <path d="M80 76l-12 16" />}
            {misses >= 6 && <path d="M80 76l12 16" />}
          </svg>
          <div className="text-xs font-semibold text-zinc-500">Topic: {hmItem.category} · Misses: {misses}/6</div>
          <div className="flex gap-1.5 flex-wrap justify-center">
            {hmItem.word.split('').map((ch, idx) => (
              <span key={idx} className="w-7 h-9 border-b-2 border-zinc-400 font-display font-bold text-xl flex items-center justify-center">
                {hmGuessed.has(ch) || revealedAll ? ch : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 max-w-xs">
          {ALPHA.map((ch) => (
            <button
              key={ch}
              type="button"
              disabled={hmGuessed.has(ch)}
              onClick={() => pickLetter(ch)}
              className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold text-xs disabled:opacity-30"
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- 3. Word Scramble ---
  if (game.id === 'word-scramble') {
    const pickTile = (idx: number) => {
      if (isPaused || wsTiles[idx].used) return;
      sound.tap();
      const nextTiles = wsTiles.map((t, i) => (i === idx ? { ...t, used: true } : t));
      const nextPicked = [...wsPicked, { ch: wsTiles[idx].ch, srcIdx: idx }];
      setWsTiles(nextTiles);
      setWsPicked(nextPicked);

      if (nextPicked.length === wsWord.length) {
        const guess = nextPicked.map((p) => p.ch).join('');
        if (guess === wsWord) {
          sound.win();
          const ns = wsScore + 50;
          setWsScore(ns);
          onScoreChange(ns);
          setTimeout(loadScramble, 450);
        } else {
          sound.error();
          setTimeout(() => {
            setWsTiles((prev) => prev.map((t) => ({ ...t, used: false })));
            setWsPicked([]);
          }, 400);
        }
      }
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-3">
        <div className="text-xs font-semibold text-zinc-500">Tap letters in order to unscramble</div>
        <div className="flex gap-1.5 min-h-[48px]">
          {wsWord.split('').map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (i < wsPicked.length) {
                  const removed = wsPicked[i];
                  setWsPicked((p) => p.filter((_, idx) => idx !== i));
                  setWsTiles((t) => t.map((tile, ti) => (ti === removed.srcIdx ? { ...tile, used: false } : tile)));
                }
              }}
              className="w-11 h-11 rounded-xl border-2 border-sky-500 bg-sky-50 dark:bg-sky-950/50 font-display font-bold text-xl flex items-center justify-center"
            >
              {wsPicked[i]?.ch ?? ''}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {wsTiles.map((t, idx) => (
            <button
              key={idx}
              type="button"
              disabled={t.used}
              onClick={() => pickTile(idx)}
              className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-display font-bold text-xl shadow-sm disabled:opacity-25"
            >
              {t.ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- 4. Word Search 10x10 ---
  if (game.id === 'word-search') {
    const foundCellSet = new Set<string>();
    wsFound.forEach((w) => {
      wsGridData.placements[w]?.forEach(([r, c]) => foundCellSet.add(`${r},${c}`));
    });

    const handleGridTap = (r: number, c: number) => {
      if (isPaused) return;
      if (!wsStartCell) {
        sound.tap();
        setWsStartCell([r, c]);
        return;
      }
      const [sr, sc] = wsStartCell;
      setWsStartCell(null);
      const dr = Math.sign(r - sr);
      const dc = Math.sign(c - sc);
      const lenR = Math.abs(r - sr);
      const lenC = Math.abs(c - sc);
      if (lenR !== 0 && lenC !== 0 && lenR !== lenC) return;
      const steps = Math.max(lenR, lenC);
      let word = '';
      for (let i = 0; i <= steps; i++) {
        word += wsGridData.grid[sr + dr * i][sc + dc * i];
      }
      const rev = word.split('').reverse().join('');
      const match = wsTargetWords.find((w) => (w === word || w === rev) && !wsFound.has(w));
      if (match) {
        sound.score();
        const next = new Set(wsFound);
        next.add(match);
        setWsFound(next);
        const pts = next.size * 50;
        onScoreChange(pts);
        if (next.size === wsTargetWords.length) {
          sound.win();
          onGameEnd({ won: true, score: pts, summary: 'Found every hidden word!' });
        }
      } else {
        sound.error();
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-2'} items-center justify-center p-2`}>
        <div
          className="grid grid-cols-10 gap-0.5 p-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-900 aspect-square"
          style={{ width: isLandscape ? 'min(78vh, 310px)' : 'min(92vw, 340px)' }}
        >
          {wsGridData.grid.map((row, r) =>
            row.map((ch, c) => {
              const isStart = wsStartCell?.[0] === r && wsStartCell?.[1] === c;
              const isFound = foundCellSet.has(`${r},${c}`);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleGridTap(r, c)}
                  className={`rounded-sm font-mono font-bold text-xs flex items-center justify-center ${
                    isStart
                      ? 'bg-orange-500 text-white'
                      : isFound
                      ? 'bg-teal-600 text-white'
                      : 'bg-white dark:bg-zinc-800'
                  }`}
                >
                  {ch}
                </button>
              );
            })
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-center max-w-[180px] text-xs font-mono">
          {wsTargetWords.map((w) => (
            <span key={w} className={wsFound.has(w) ? 'line-through text-teal-600 dark:text-teal-400' : 'font-bold'}>
              {w}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // --- 5. Boggle 4x4 ---
  if (game.id === 'boggle') {
    const currentWord = bogPath.map((idx) => bogDice[idx]).join('');
    const tapCube = (idx: number) => {
      if (isPaused) return;
      if (bogPath.includes(idx)) {
        if (bogPath[bogPath.length - 1] === idx) setBogPath((p) => p.slice(0, -1));
        return;
      }
      if (bogPath.length > 0) {
        const last = bogPath[bogPath.length - 1];
        const r1 = Math.floor(last / 4), c1 = last % 4;
        const r2 = Math.floor(idx / 4), c2 = idx % 4;
        if (Math.abs(r1 - r2) > 1 || Math.abs(c1 - c2) > 1) return;
      }
      sound.tap();
      setBogPath((p) => [...p, idx]);
    };

    const submitBoggle = () => {
      if (currentWord.length >= 3 && COMMON_DICTIONARY_SET.has(currentWord) && !bogWords.includes(currentWord)) {
        sound.score();
        const pts = bogScore + currentWord.length * 10;
        setBogWords((w) => [currentWord, ...w]);
        setBogScore(pts);
        onScoreChange(pts);
      } else {
        sound.error();
      }
      setBogPath([]);
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-5' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-amber-900/20 dark:bg-zinc-900 border border-amber-500/30">
          {bogDice.map((ch, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => tapCube(idx)}
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-xl font-display font-bold text-xl shadow ${
                bogPath.includes(idx)
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-mono">Time: {bogTime}s · Words: {bogWords.length}</div>
          <div className="h-8 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-mono font-bold flex items-center min-w-[120px] justify-center">
            {currentWord || '...'}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={submitBoggle} className="min-h-[42px] px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs">Submit</button>
            <button type="button" onClick={() => setBogPath([])} className="min-h-[42px] px-3 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold">Clear</button>
          </div>
        </div>
      </div>
    );
  }

  // --- 6. Typing Blitz ---
  if (game.id === 'typing-blitz') {
    const activeWord = tbQueue[0] ?? '';
    const tapBlitzLetter = (ch: string) => {
      if (isPaused || !activeWord) return;
      if (activeWord[tbTyped.length] === ch) {
        sound.tap();
        const nextTyped = tbTyped + ch;
        if (nextTyped === activeWord) {
          sound.score();
          const ns = tbScore + 25;
          setTbScore(ns);
          onScoreChange(ns);
          setTbQueue((q) => {
            const rem = q.slice(1);
            return rem.length === 0 ? [FIVE_LETTER_WORDS[Math.floor(Math.random() * FIVE_LETTER_WORDS.length)]] : rem;
          });
          setTbTyped('');
        } else {
          setTbTyped(nextTyped);
        }
      } else {
        sound.error();
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-4' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div className="flex flex-col gap-1.5 items-center min-w-[160px]">
          <div className="text-xs font-mono text-zinc-500">Queue ({tbQueue.length}/6)</div>
          {tbQueue.map((w, idx) => (
            <div
              key={w + idx}
              className={`px-4 py-1.5 rounded-xl font-mono font-bold tracking-widest ${
                idx === 0 ? 'bg-indigo-600 text-white text-lg' : 'bg-zinc-200 dark:bg-zinc-800 text-sm opacity-75'
              }`}
            >
              {idx === 0 ? (
                <>
                  <span className="text-amber-300">{tbTyped}</span>
                  <span>{w.slice(tbTyped.length)}</span>
                </>
              ) : (
                w
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 items-center">
          {KEYBOARD_ROWS.slice(0, 3).map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.filter((k) => k.length === 1).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => tapBlitzLetter(k)}
                  className="w-7 h-9 sm:w-8 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold text-xs active:scale-95"
                >
                  {k}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- 7. Offline Trivia ---
  if (game.id === 'trivia') {
    const q = trQuestions[trIdx];
    if (!q) return null;

    const answerTrivia = (choiceIdx: number) => {
      if (isPaused || trFeedback !== null) return;
      setTrFeedback(choiceIdx);
      let nextScore = trScore;
      if (choiceIdx === q.answer) {
        sound.score();
        nextScore += 100;
        setTrScore(nextScore);
        onScoreChange(nextScore);
      } else {
        sound.error();
      }
      setTimeout(() => {
        setTrFeedback(null);
        if (trIdx + 1 >= trQuestions.length) {
          onGameEnd({ won: nextScore >= 500, score: nextScore, summary: `Answered ${nextScore / 100}/${trQuestions.length} correctly!` });
        } else {
          setTrIdx((i) => i + 1);
        }
      }, 650);
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 max-w-lg mx-auto">
        <div className="text-xs font-mono text-zinc-500">
          Question {trIdx + 1}/{trQuestions.length} · {q.topic}
        </div>
        <h3 className="text-base sm:text-lg font-display font-bold text-center text-balance">{q.q}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {q.options.map((opt, idx) => {
            const isCorrect = trFeedback !== null && idx === q.answer;
            const isWrong = trFeedback === idx && idx !== q.answer;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => answerTrivia(idx)}
                className={`min-h-[46px] p-3 rounded-xl border text-left text-sm font-medium transition-colors ${
                  isCorrect
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : isWrong
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-violet-500'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- 8. Anagram Rack ---
  const wordBuilt = anaPick.map((idx) => anaRack[idx]).join('');
  const submitAnagram = () => {
    if (wordBuilt.length >= 3 && COMMON_DICTIONARY_SET.has(wordBuilt) && !anaFound.includes(wordBuilt)) {
      sound.score();
      const pts = anaScore + wordBuilt.length * 15;
      setAnaFound((f) => [wordBuilt, ...f]);
      setAnaScore(pts);
      onScoreChange(pts);
    } else {
      sound.error();
    }
    setAnaPick([]);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 max-w-md mx-auto">
      <div className="text-xs font-mono text-zinc-500">Time: {anaTime}s · Words: {anaFound.length}</div>
      <div className="h-11 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-display font-bold text-xl tracking-widest flex items-center justify-center min-w-[160px]">
        {wordBuilt || '...'}
      </div>
      <div className="flex gap-1.5 flex-wrap justify-center">
        {anaRack.map((ch, idx) => (
          <button
            key={idx}
            type="button"
            disabled={anaPick.includes(idx)}
            onClick={() => {
              sound.tap();
              setAnaPick((p) => [...p, idx]);
            }}
            className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-display font-bold text-lg disabled:opacity-25"
          >
            {ch}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={submitAnagram} className="min-h-[42px] px-5 rounded-xl bg-cyan-600 text-white font-bold text-sm">Submit</button>
        <button type="button" onClick={() => setAnaPick([])} className="min-h-[42px] px-4 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-sm">Clear</button>
      </div>
      {anaFound.length > 0 && (
        <div className="text-xs font-mono text-zinc-500 text-center max-w-xs truncate">
          {anaFound.join(' · ')}
        </div>
      )}
    </div>
  );
};
