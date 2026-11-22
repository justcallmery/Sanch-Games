import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES_REGISTRY } from '../registry';
import {
  move2048Board,
  canMove2048,
  createMineBoard,
  populateMines,
  revealMineCell,
  generateSudoku,
  isValidSudokuPlacement,
  toggleLightsOut,
  is15Solved,
  parseSokobanLevel,
  SOKOBAN_LEVELS,
  stepSokoban,
} from './puzzleLogic';
import {
  checkTTTWinner,
  bestTTTMove,
  createC4Board,
  dropC4Disc,
  checkC4Winner,
  createReversiBoard,
  applyReversiMove,
  createChessBoard,
  getLegalChessMoves,
  pickNimAIMove,
} from './boardLogic';
import {
  blackjackValue,
  evaluatePokerHand,
  scoreYachtCategory,
  evaluateWordGuess,
  evaluateMastermind,
  OFFLINE_TRIVIA,
} from './cardWordLogic';
import {
  applyDailyCompletion,
  DEFAULT_DAILY_STATE,
  getEffectiveStreak,
  getPreviousDateKey,
  getRecentWeekStreakDays,
  pickDailyGame,
} from './dailyChallenge';
import { recordGamePlay } from '../../utils/storage';

test('registry contains over 50 distinct games with valid metadata', () => {
  assert.ok(GAMES_REGISTRY.length > 50, `Expected >50 games, got ${GAMES_REGISTRY.length}`);
  const ids = new Set(GAMES_REGISTRY.map((g) => g.id));
  assert.equal(ids.size, GAMES_REGISTRY.length, 'Game IDs must be unique');
  for (const g of GAMES_REGISTRY) {
    assert.ok(g.title.length > 0);
    assert.ok(g.rules.length > 10);
    assert.ok(g.controlsHint.length > 0);
  }
});

test('2048 merges tiles correctly and detects game over', () => {
  const board = [
    [2, 2, 4, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const res = move2048Board(board, 'left', () => 0.5);
  assert.equal(res.moved, true);
  assert.equal(res.gained, 4);
  assert.equal(res.board[0][0], 4);
  assert.equal(res.board[0][1], 4);

  const locked = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ];
  assert.equal(canMove2048(locked), false);
});

test('Minesweeper safe first click and flood reveal work', () => {
  let b = createMineBoard(6, 6);
  b = populateMines(b, 5, 0, 0, () => 0.3);
  assert.equal(b[0][0].isMine, false);
  const res = revealMineCell(b, 0, 0);
  assert.equal(res.hitMine, false);
  assert.equal(res.board[0][0].revealed, true);
});

test('Sudoku 9x9 and 6x6 generate valid complete solutions', () => {
  const s9 = generateSudoku(9, 40, () => 0.42);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      assert.ok(isValidSudokuPlacement(s9.solution, r, c, s9.solution[r][c], 3, 3));
    }
  }
  const s6 = generateSudoku(6, 16, () => 0.25);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      assert.ok(isValidSudokuPlacement(s6.solution, r, c, s6.solution[r][c], 2, 3));
    }
  }
});

test('Lights Out, 15-puzzle, and Sokoban rules behave accurately', () => {
  const g = Array.from({ length: 3 }, () => Array(3).fill(false));
  const after = toggleLightsOut(g, 1, 1);
  assert.equal(after[1][1], true);
  assert.equal(after[0][1], true);
  assert.equal(after[0][0], false);

  assert.equal(is15Solved([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]), true);
  assert.equal(is15Solved([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0]), false);

  const sok = parseSokobanLevel(SOKOBAN_LEVELS[0]);
  const stepRes = stepSokoban(sok, 'right');
  assert.equal(typeof stepRes.moved, 'boolean');
});

test('Board games: Tic-Tac-Toe, Connect Four, Reversi, Chess, and Nim', () => {
  const ttt: ('X' | 'O' | null)[] = ['X', 'X', null, 'O', 'O', null, null, null, null];
  assert.equal(bestTTTMove(ttt, 'X'), 2);
  assert.equal(checkTTTWinner(['X', 'X', 'X', null, null, null, null, null, null]).winner, 'X');

  let c4 = createC4Board();
  for (let c = 0; c < 4; c++) {
    c4 = dropC4Disc(c4, c, 1)!.board;
  }
  assert.equal(checkC4Winner(c4).winner, 1);

  const rev = applyReversiMove(createReversiBoard(), 2, 3, 1);
  assert.equal(rev[3][3], 1);

  const chess = createChessBoard();
  assert.equal(getLegalChessMoves(chess, 6, 4).length, 2); // e2 pawn moves e3/e4
  assert.equal(getLegalChessMoves(chess, 7, 1).length, 2); // Nb1 moves Na3/Nc3

  const nimMove = pickNimAIMove([1, 3, 5]);
  assert.ok(nimMove.take >= 1);
});

test('Card, Word, and Brain evaluators produce exact scores', () => {
  assert.equal(
    blackjackValue([
      { suit: '♠', rank: 1, faceUp: true, id: '1' },
      { suit: '♥', rank: 13, faceUp: true, id: '2' },
    ]).total,
    21
  );

  const royal = evaluatePokerHand([
    { suit: '♠', rank: 1, faceUp: true, id: 'a' },
    { suit: '♠', rank: 10, faceUp: true, id: 'b' },
    { suit: '♠', rank: 11, faceUp: true, id: 'c' },
    { suit: '♠', rank: 12, faceUp: true, id: 'd' },
    { suit: '♠', rank: 13, faceUp: true, id: 'e' },
  ]);
  assert.equal(royal.name, 'Royal Flush');
  assert.equal(royal.multiplier, 250);

  assert.equal(scoreYachtCategory([6, 6, 6, 6, 6], 'yacht'), 50);
  assert.equal(scoreYachtCategory([2, 3, 4, 5, 6], 'lgStraight'), 40);

  assert.deepEqual(evaluateWordGuess('CRANE', 'CRATE'), [
    'correct',
    'correct',
    'correct',
    'absent',
    'correct',
  ]);

  assert.deepEqual(evaluateMastermind([0, 1, 2, 3], [0, 2, 4, 5]), { exact: 1, partial: 1 });
  assert.ok(OFFLINE_TRIVIA.length >= 35);
});

test('Daily Challenge selects deterministic varied games per date and tracks streaks accurately', () => {
  const day1 = '2026-11-20';
  const day2 = '2026-11-21';
  const day3 = '2026-11-22';
  const day5 = '2026-11-24';

  assert.equal(getPreviousDateKey(day2), day1);
  const g1 = pickDailyGame(day1, GAMES_REGISTRY);
  const g1Repeat = pickDailyGame(day1, GAMES_REGISTRY);
  const g2 = pickDailyGame(day2, GAMES_REGISTRY);
  const g3 = pickDailyGame(day3, GAMES_REGISTRY);

  assert.equal(g1.id, g1Repeat.id);
  assert.notEqual(g1.id, g2.id, 'Adjacent days should never repeat the exact same game');
  assert.notEqual(g2.id, g3.id, 'Adjacent days should never repeat the exact same game');

  // Playing a non-daily game does not complete the daily challenge
  const nonDailyId = GAMES_REGISTRY.find((g) => g.id !== g1.id)!.id;
  const ignored = applyDailyCompletion(DEFAULT_DAILY_STATE, day1, g1.id, nonDailyId, 100, true, true);
  assert.equal(ignored.newlyCompleted, false);
  assert.equal(ignored.next.currentStreak, 0);

  // Day 1 completion -> streak 1
  const r1 = applyDailyCompletion(DEFAULT_DAILY_STATE, day1, g1.id, g1.id, 120, false, true);
  assert.equal(r1.newlyCompleted, true);
  assert.equal(r1.next.currentStreak, 1);
  assert.equal(r1.next.bestStreak, 1);

  // Same-day replay keeps streak 1 and updates higher score
  const r1Again = applyDailyCompletion(r1.next, day1, g1.id, g1.id, 250, true, true);
  assert.equal(r1Again.newlyCompleted, false);
  assert.equal(r1Again.next.currentStreak, 1);
  assert.equal(r1Again.next.history[day1].score, 250);
  assert.equal(r1Again.next.history[day1].won, true);

  // Consecutive Day 2 completion via recordGamePlay -> streak 2
  const baseStorage = {
    records: {},
    favorites: [],
    recent: [],
    prefs: { theme: 'light' as const, muted: false },
    daily: r1Again.next,
  };
  const afterDay2 = recordGamePlay(baseStorage, g2.id, 80, true, true, undefined, g2.id, day2);
  assert.equal(afterDay2.daily.currentStreak, 2);
  assert.equal(afterDay2.daily.bestStreak, 2);
  assert.equal(getEffectiveStreak(afterDay2.daily, day2), 2);
  assert.equal(getEffectiveStreak(afterDay2.daily, day3), 2); // Still alive before midnight of day 3
  assert.equal(getEffectiveStreak(afterDay2.daily, day5), 0); // Reset if day 3 & 4 missed

  // Completing after a gap resets currentStreak to 1 while preserving bestStreak = 2
  const afterGap = applyDailyCompletion(afterDay2.daily, day5, pickDailyGame(day5, GAMES_REGISTRY).id, pickDailyGame(day5, GAMES_REGISTRY).id, 50, true, true);
  assert.equal(afterGap.next.currentStreak, 1);
  assert.equal(afterGap.next.bestStreak, 2);
  assert.equal(afterGap.next.totalCompleted, 3);

  const week = getRecentWeekStreakDays(afterGap.next, day5);
  assert.equal(week.length, 7);
  assert.equal(week[6].isToday, true);
  assert.equal(week[6].completed, true);
});
