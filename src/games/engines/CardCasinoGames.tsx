import React, { useEffect, useState } from 'react';
import { GameRuntimeProps } from '../types';
import { sound } from '../../utils/sound';
import {
  blackjackValue,
  createShuffledDeck,
  evaluatePokerHand,
  isRedSuit,
  PlayingCard,
  rankLabel,
  SUITS,
} from '../logic/cardWordLogic';

const CardFace: React.FC<{
  card: PlayingCard;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}> = ({ card, selected, compact, onClick }) => {
  if (!card.faceUp) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${compact ? 'w-10 h-14' : 'w-14 h-20 sm:w-16 sm:h-24'} rounded-lg bg-indigo-800 border-2 border-white/80 shadow flex items-center justify-center shrink-0`}
      >
        <div className="w-4/5 h-4/5 rounded border border-indigo-400/50 bg-indigo-700/70" />
      </button>
    );
  }
  const red = isRedSuit(card.suit);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${compact ? 'w-10 h-14 text-xs' : 'w-14 h-20 sm:w-16 sm:h-24 text-base'} rounded-lg bg-white border ${
        selected ? 'border-orange-500 ring-2 ring-orange-400 -translate-y-1' : 'border-zinc-300'
      } shadow-sm flex flex-col justify-between p-1 font-bold transition-transform shrink-0 ${
        red ? 'text-red-600' : 'text-zinc-900'
      }`}
    >
      <span className="leading-none self-start">{rankLabel(card.rank)}</span>
      <span className={`${compact ? 'text-base' : 'text-xl'} leading-none self-center`}>{card.suit}</span>
      <span className="leading-none self-end rotate-180">{rankLabel(card.rank)}</span>
    </button>
  );
};

export const CardCasinoGames: React.FC<GameRuntimeProps> = ({
  game,
  isLandscape,
  isPaused,
  restartNonce,
  onScoreChange,
  onGameEnd,
}) => {
  // --- Klondike ---
  const [klondike, setKlondike] = useState<{
    stock: PlayingCard[];
    waste: PlayingCard[];
    foundations: PlayingCard[][];
    tableau: PlayingCard[][];
    selected: { zone: 'waste' | 'tab'; col?: number; idx?: number } | null;
    score: number;
  }>(() => initKlondike());

  function initKlondike() {
    const deck = createShuffledDeck(false);
    const tableau: PlayingCard[][] = Array.from({ length: 7 }, () => []);
    let ptr = 0;
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r <= c; r++) {
        const card = { ...deck[ptr++], faceUp: r === c };
        tableau[c].push(card);
      }
    }
    return {
      stock: deck.slice(ptr).map((c) => ({ ...c, faceUp: false })),
      waste: [],
      foundations: [[], [], [], []],
      tableau,
      selected: null,
      score: 0,
    };
  }

  // --- Spider 1-Suit ---
  const [spider, setSpider] = useState<{
    columns: PlayingCard[][];
    stock: PlayingCard[];
    cleared: number;
    selected: { col: number; idx: number } | null;
    score: number;
  }>(() => initSpider());

  function initSpider() {
    const cards: PlayingCard[] = [];
    for (let d = 0; d < 8; d++) {
      for (let r = 1; r <= 13; r++) {
        cards.push({ suit: '♠', rank: r, faceUp: false, id: `sp-${d}-${r}` });
      }
    }
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    const columns: PlayingCard[][] = Array.from({ length: 10 }, () => []);
    let p = 0;
    for (let i = 0; i < 54; i++) {
      const col = i % 10;
      const isTop = i >= 44;
      columns[col].push({ ...cards[p++], faceUp: isTop });
    }
    return {
      columns,
      stock: cards.slice(p),
      cleared: 0,
      selected: null,
      score: 0,
    };
  }

  // --- Blackjack ---
  const [bjChips, setBjChips] = useState(500);
  const [bjBet, setBjBet] = useState(25);
  const [bjDeck, setBjDeck] = useState<PlayingCard[]>(() => createShuffledDeck(true));
  const [bjPlayer, setBjPlayer] = useState<PlayingCard[]>([]);
  const [bjDealer, setBjDealer] = useState<PlayingCard[]>([]);
  const [bjPhase, setBjPhase] = useState<'bet' | 'play' | 'result'>('bet');
  const [bjMsg, setBjMsg] = useState('Place a bet to deal');

  // --- Video Poker ---
  const [vpCredits, setVpCredits] = useState(200);
  const [vpHand, setVpHand] = useState<PlayingCard[]>([]);
  const [vpDeck, setVpDeck] = useState<PlayingCard[]>([]);
  const [vpHeld, setVpHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [vpPhase, setVpPhase] = useState<'deal' | 'draw'>('deal');
  const [vpMsg, setVpMsg] = useState('Bet 10 credits & Deal');

  // --- High-Low ---
  const [hlDeck, setHlDeck] = useState<PlayingCard[]>(() => createShuffledDeck(true));
  const [hlCurrent, setHlCurrent] = useState<PlayingCard | null>(null);
  const [hlPot, setHlPot] = useState(20);
  const [hlBank, setHlBank] = useState(100);
  const [hlMsg, setHlMsg] = useState('Will the next card be Higher or Lower?');

  // --- War ---
  const [warPDeck, setWarPDeck] = useState<PlayingCard[]>([]);
  const [warADeck, setWarADeck] = useState<PlayingCard[]>([]);
  const [warCards, setWarCards] = useState<{ p: PlayingCard | null; a: PlayingCard | null }>({ p: null, a: null });
  const [warMsg, setWarMsg] = useState('Tap Battle to draw cards');

  // --- Memory Pairs ---
  const [memCards, setMemCards] = useState<{ card: PlayingCard; matched: boolean; flipped: boolean }[]>([]);
  const [memFirst, setMemFirst] = useState<number | null>(null);
  const [memMoves, setMemMoves] = useState(0);
  const [memLock, setMemLock] = useState(false);

  // --- TriPeaks ---
  const [triPeaks, setTriPeaks] = useState<{
    cards: (PlayingCard | null)[];
    stock: PlayingCard[];
    waste: PlayingCard[];
    streak: number;
    score: number;
  }>(() => initTriPeaks());

  function initTriPeaks() {
    const deck = createShuffledDeck(true);
    // 18 cards in 3 small peaks (row0: 3, row1: 6, row2: 9)
    const peakCards = deck.slice(0, 18).map((c, idx) => ({ ...c, faceUp: idx >= 9 }));
    return {
      cards: peakCards as (PlayingCard | null)[],
      stock: deck.slice(19),
      waste: [deck[18]],
      streak: 0,
      score: 0,
    };
  }

  useEffect(() => {
    if (game.id === 'klondike') {
      setKlondike(initKlondike());
      onScoreChange(0);
    } else if (game.id === 'spider') {
      setSpider(initSpider());
      onScoreChange(0);
    } else if (game.id === 'blackjack') {
      setBjChips(500);
      setBjBet(25);
      setBjDeck(createShuffledDeck(true));
      setBjPlayer([]);
      setBjDealer([]);
      setBjPhase('bet');
      setBjMsg('Place a bet to deal');
      onScoreChange(500);
    } else if (game.id === 'video-poker') {
      setVpCredits(200);
      setVpHand([]);
      setVpHeld([false, false, false, false, false]);
      setVpPhase('deal');
      setVpMsg('Bet 10 credits & Deal');
      onScoreChange(200);
    } else if (game.id === 'high-low') {
      const d = createShuffledDeck(true);
      setHlCurrent(d[0]);
      setHlDeck(d.slice(1));
      setHlPot(20);
      setHlBank(100);
      setHlMsg('Higher or Lower than current card?');
      onScoreChange(100);
    } else if (game.id === 'war') {
      const d = createShuffledDeck(true);
      setWarPDeck(d.slice(0, 26));
      setWarADeck(d.slice(26));
      setWarCards({ p: null, a: null });
      setWarMsg('Tap Battle to flip top cards');
      onScoreChange(26);
    } else if (game.id === 'memory-pairs') {
      const d = createShuffledDeck(true).slice(0, 8);
      const pairs = [...d, ...d.map((c, i) => ({ ...c, id: c.id + '-b' + i }))];
      for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
      }
      setMemCards(pairs.map((card) => ({ card, matched: false, flipped: false })));
      setMemFirst(null);
      setMemMoves(0);
      setMemLock(false);
      onScoreChange(0);
    } else if (game.id === 'tripeaks') {
      setTriPeaks(initTriPeaks());
      onScoreChange(0);
    }
  }, [game.id, restartNonce]);

  // --- 1. Klondike Solitaire ---
  if (game.id === 'klondike') {
    const drawStock = () => {
      if (isPaused) return;
      sound.flip();
      setKlondike((prev) => {
        if (prev.stock.length === 0) {
          return {
            ...prev,
            stock: [...prev.waste].reverse().map((c) => ({ ...c, faceUp: false })),
            waste: [],
            selected: null,
          };
        }
        const top = { ...prev.stock[prev.stock.length - 1], faceUp: true };
        return {
          ...prev,
          stock: prev.stock.slice(0, -1),
          waste: [...prev.waste, top],
          selected: null,
        };
      });
    };

    const tryMoveToFoundation = (card: PlayingCard, fIdx: number, prev: typeof klondike) => {
      const pile = prev.foundations[fIdx];
      const expectedRank = pile.length + 1;
      if (card.rank !== expectedRank) return false;
      if (pile.length > 0 && pile[0].suit !== card.suit) return false;
      if (pile.length === 0 && prev.foundations.some((p) => p[0]?.suit === card.suit)) return false;
      return true;
    };

    const handleFoundationClick = (fIdx: number) => {
      if (!klondike.selected || isPaused) return;
      const sel = klondike.selected;
      let movingCard: PlayingCard | undefined;
      if (sel.zone === 'waste') movingCard = klondike.waste[klondike.waste.length - 1];
      else if (sel.zone === 'tab' && sel.col !== undefined && sel.idx === klondike.tableau[sel.col].length - 1) {
        movingCard = klondike.tableau[sel.col][sel.idx];
      }
      if (!movingCard || !tryMoveToFoundation(movingCard, fIdx, klondike)) return;

      sound.score();
      const nextFoundations = klondike.foundations.map((f, i) => (i === fIdx ? [...f, movingCard!] : f));
      const nextWaste = sel.zone === 'waste' ? klondike.waste.slice(0, -1) : klondike.waste;
      const nextTab = klondike.tableau.map((col, ci) => {
        if (sel.zone === 'tab' && ci === sel.col) {
          const sliced = col.slice(0, -1);
          if (sliced.length > 0) sliced[sliced.length - 1] = { ...sliced[sliced.length - 1], faceUp: true };
          return sliced;
        }
        return col;
      });
      const nextScore = klondike.score + 15;
      setKlondike({
        ...klondike,
        foundations: nextFoundations,
        waste: nextWaste,
        tableau: nextTab,
        selected: null,
        score: nextScore,
      });
      onScoreChange(nextScore);
      if (nextFoundations.every((f) => f.length === 13)) {
        sound.win();
        onGameEnd({ won: true, score: nextScore, summary: 'Completed all 4 Klondike foundations!' });
      }
    };

    const handleTableauClick = (colIdx: number, cardIdx?: number) => {
      if (isPaused) return;
      const sel = klondike.selected;
      if (!sel) {
        if (cardIdx === undefined) return;
        const card = klondike.tableau[colIdx][cardIdx];
        if (!card.faceUp) return;
        setKlondike({ ...klondike, selected: { zone: 'tab', col: colIdx, idx: cardIdx } });
        return;
      }

      if (sel.zone === 'tab' && sel.col === colIdx) {
        setKlondike({ ...klondike, selected: null });
        return;
      }

      let movingCards: PlayingCard[] = [];
      if (sel.zone === 'waste') {
        const w = klondike.waste[klondike.waste.length - 1];
        if (w) movingCards = [w];
      } else if (sel.zone === 'tab' && sel.col !== undefined && sel.idx !== undefined) {
        movingCards = klondike.tableau[sel.col].slice(sel.idx);
      }
      if (movingCards.length === 0) return;

      const lead = movingCards[0];
      const destCol = klondike.tableau[colIdx];
      const destTop = destCol[destCol.length - 1];
      const valid = !destTop
        ? lead.rank === 13
        : destTop.faceUp && isRedSuit(destTop.suit) !== isRedSuit(lead.suit) && destTop.rank === lead.rank + 1;

      if (!valid) {
        setKlondike({ ...klondike, selected: null });
        return;
      }

      sound.tap();
      const nextWaste = sel.zone === 'waste' ? klondike.waste.slice(0, -1) : klondike.waste;
      const nextTab = klondike.tableau.map((col, ci) => {
        if (sel.zone === 'tab' && ci === sel.col && sel.idx !== undefined) {
          const sliced = col.slice(0, sel.idx);
          if (sliced.length > 0) sliced[sliced.length - 1] = { ...sliced[sliced.length - 1], faceUp: true };
          return sliced;
        }
        if (ci === colIdx) return [...col, ...movingCards];
        return col;
      });
      const nextScore = klondike.score + 5;
      setKlondike({ ...klondike, waste: nextWaste, tableau: nextTab, selected: null, score: nextScore });
      onScoreChange(nextScore);
    };

    return (
      <div className="w-full h-full flex flex-col gap-2 p-2 rounded-2xl bg-emerald-900 text-white overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={drawStock}
              className="w-10 h-14 rounded-lg bg-indigo-800 border border-white/70 text-[10px] font-bold flex items-center justify-center"
            >
              {klondike.stock.length > 0 ? `Draw (${klondike.stock.length})` : 'Reset'}
            </button>
            {klondike.waste.length > 0 ? (
              <CardFace
                compact
                card={klondike.waste[klondike.waste.length - 1]}
                selected={klondike.selected?.zone === 'waste'}
                onClick={() =>
                  setKlondike({
                    ...klondike,
                    selected: klondike.selected?.zone === 'waste' ? null : { zone: 'waste' },
                  })
                }
              />
            ) : (
              <div className="w-10 h-14 rounded-lg border border-dashed border-emerald-500/50" />
            )}
          </div>

          <div className="flex gap-1">
            {klondike.foundations.map((pile, fIdx) =>
              pile.length > 0 ? (
                <CardFace key={fIdx} compact card={pile[pile.length - 1]} onClick={() => handleFoundationClick(fIdx)} />
              ) : (
                <button
                  key={fIdx}
                  type="button"
                  onClick={() => handleFoundationClick(fIdx)}
                  className="w-10 h-14 rounded-lg border border-dashed border-emerald-400/60 text-xs text-emerald-300 flex items-center justify-center"
                >
                  {SUITS[fIdx]}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1 items-start pt-1">
          {klondike.tableau.map((col, ci) => (
            <div key={ci} className="flex flex-col items-center">
              {col.length === 0 ? (
                <button
                  type="button"
                  onClick={() => handleTableauClick(ci)}
                  className="w-10 h-14 rounded-lg border border-dashed border-emerald-500/40 text-[10px] text-emerald-400"
                >
                  K
                </button>
              ) : (
                col.map((card, idx) => (
                  <div key={card.id} className={idx > 0 ? '-mt-9' : ''}>
                    <CardFace
                      compact
                      card={card}
                      selected={klondike.selected?.zone === 'tab' && klondike.selected.col === ci && idx >= (klondike.selected.idx ?? 99)}
                      onClick={() => handleTableauClick(ci, idx)}
                    />
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- 2. Spider Solitaire ---
  if (game.id === 'spider') {
    const dealSpiderRow = () => {
      if (isPaused || spider.stock.length < 10) return;
      sound.flip();
      const nextCols = spider.columns.map((col, i) => [...col, { ...spider.stock[i], faceUp: true }]);
      setSpider({ ...spider, columns: nextCols, stock: spider.stock.slice(10), selected: null });
    };

    const handleSpiderTap = (colIdx: number, cardIdx?: number) => {
      if (isPaused) return;
      const sel = spider.selected;
      if (!sel) {
        if (cardIdx === undefined) return;
        const col = spider.columns[colIdx];
        if (!col[cardIdx].faceUp) return;
        // Verify contiguous descending sequence from cardIdx to top
        for (let i = cardIdx; i < col.length - 1; i++) {
          if (col[i].rank !== col[i + 1].rank + 1) return;
        }
        setSpider({ ...spider, selected: { col: colIdx, idx: cardIdx } });
        return;
      }
      if (sel.col === colIdx) {
        setSpider({ ...spider, selected: null });
        return;
      }
      const moving = spider.columns[sel.col].slice(sel.idx);
      const dest = spider.columns[colIdx];
      const destTop = dest[dest.length - 1];
      if (destTop && destTop.rank !== moving[0].rank + 1) {
        setSpider({ ...spider, selected: null });
        return;
      }

      sound.tap();
      let nextCols = spider.columns.map((col, ci) => {
        if (ci === sel.col) {
          const sliced = col.slice(0, sel.idx);
          if (sliced.length > 0) sliced[sliced.length - 1] = { ...sliced[sliced.length - 1], faceUp: true };
          return sliced;
        }
        if (ci === colIdx) return [...col, ...moving];
        return col;
      });

      // Check for K..A sequence in dest column
      let clearedGain = 0;
      const destCol = nextCols[colIdx];
      if (destCol.length >= 13) {
        const tail = destCol.slice(-13);
        const isRun = tail.every((c, idx) => c.faceUp && c.rank === 13 - idx);
        if (isRun) {
          clearedGain = 1;
          sound.score();
          const trimmed = destCol.slice(0, -13);
          if (trimmed.length > 0) trimmed[trimmed.length - 1] = { ...trimmed[trimmed.length - 1], faceUp: true };
          nextCols = nextCols.map((c, i) => (i === colIdx ? trimmed : c));
        }
      }

      const nextCleared = spider.cleared + clearedGain;
      const nextScore = spider.score + 5 + clearedGain * 100;
      setSpider({ ...spider, columns: nextCols, cleared: nextCleared, selected: null, score: nextScore });
      onScoreChange(nextScore);
      if (nextCleared >= 8) {
        sound.win();
        onGameEnd({ won: true, score: nextScore, summary: 'Cleared all 8 Spider sequences!' });
      }
    };

    return (
      <div className="w-full h-full flex flex-col gap-2 p-2 rounded-2xl bg-emerald-900 text-white overflow-y-auto">
        <div className="flex items-center justify-between text-xs">
          <span>Runs Cleared: {spider.cleared}/8</span>
          <button
            type="button"
            disabled={spider.stock.length < 10}
            onClick={dealSpiderRow}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold disabled:opacity-40"
          >
            Deal Row ({Math.floor(spider.stock.length / 10)})
          </button>
        </div>
        <div className="grid grid-cols-10 gap-0.5 flex-1 items-start">
          {spider.columns.map((col, ci) => (
            <div key={ci} className="flex flex-col items-center">
              {col.length === 0 ? (
                <button
                  type="button"
                  onClick={() => handleSpiderTap(ci)}
                  className="w-8 h-12 rounded border border-dashed border-emerald-400/50 text-[10px]"
                >
                  +
                </button>
              ) : (
                col.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSpiderTap(ci, idx)}
                    className={`${idx > 0 ? '-mt-7' : ''} w-8 h-11 rounded border text-[10px] font-bold flex flex-col justify-between p-0.5 ${
                      c.faceUp
                        ? spider.selected?.col === ci && idx >= spider.selected.idx
                          ? 'bg-amber-100 text-zinc-950 border-orange-500 ring-1 ring-orange-500'
                          : 'bg-white text-zinc-900 border-zinc-300'
                        : 'bg-indigo-800 border-white/60 text-transparent'
                    }`}
                  >
                    <span>{c.faceUp ? rankLabel(c.rank) : ''}</span>
                    <span className="self-center">{c.faceUp ? '♠' : ''}</span>
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- 3. Blackjack 21 ---
  if (game.id === 'blackjack') {
    const dealHand = (bet: number) => {
      if (isPaused || bjChips < bet) return;
      sound.flip();
      let deck = bjDeck.length < 12 ? createShuffledDeck(true) : [...bjDeck];
      const p = [deck.pop()!, deck.pop()!];
      const d = [deck.pop()!, { ...deck.pop()!, faceUp: false }];
      setBjDeck(deck);
      setBjChips(bjChips - bet);
      setBjBet(bet);
      setBjPlayer(p);
      setBjDealer(d);

      const pv = blackjackValue(p).total;
      if (pv === 21) {
        const revealedDealer = d.map((c) => ({ ...c, faceUp: true }));
        setBjDealer(revealedDealer);
        const payout = Math.floor(bet * 2.5);
        const nextChips = bjChips - bet + payout;
        setBjChips(nextChips);
        setBjPhase('result');
        setBjMsg(`Blackjack! Won +${payout - bet}`);
        sound.win();
        onScoreChange(nextChips);
      } else {
        setBjPhase('play');
        setBjMsg('Hit, Stand, or Double Down');
      }
    };

    const resolveDealer = (pCards: PlayingCard[], dCards: PlayingCard[], deck: PlayingCard[], bet: number, chipsAfterBet: number) => {
      const revealed = dCards.map((c) => ({ ...c, faceUp: true }));
      const nextDeck = [...deck];
      while (blackjackValue(revealed).total < 17 && nextDeck.length > 0) {
        revealed.push(nextDeck.pop()!);
      }
      setBjDealer(revealed);
      setBjDeck(nextDeck);

      const pv = blackjackValue(pCards).total;
      const dv = blackjackValue(revealed).total;
      let winAmount = 0;
      let msg = '';
      if (pv > 21) {
        msg = 'Bust! Dealer wins.';
        sound.lose();
      } else if (dv > 21 || pv > dv) {
        winAmount = bet * 2;
        msg = `You win ${pv} vs ${dv}! (+${bet})`;
        sound.win();
      } else if (pv === dv) {
        winAmount = bet;
        msg = `Push at ${pv}. Bet returned.`;
        sound.tap();
      } else {
        msg = `Dealer wins ${dv} vs ${pv}.`;
        sound.lose();
      }
      const finalChips = chipsAfterBet + winAmount;
      setBjChips(finalChips);
      setBjPhase('result');
      setBjMsg(msg);
      onScoreChange(finalChips);
      if (finalChips <= 0) {
        onGameEnd({ won: false, score: 0, summary: 'Out of chips at the Blackjack table!' });
      }
    };

    const hit = () => {
      if (bjPhase !== 'play' || isPaused) return;
      sound.flip();
      const deck = [...bjDeck];
      const nextP = [...bjPlayer, deck.pop()!];
      setBjPlayer(nextP);
      setBjDeck(deck);
      if (blackjackValue(nextP).total > 21) {
        resolveDealer(nextP, bjDealer, deck, bjBet, bjChips);
      }
    };

    return (
      <div className="w-full h-full flex flex-col justify-between items-center p-3 rounded-2xl bg-emerald-900 text-white">
        <div className="flex items-center justify-between w-full max-w-md text-xs font-mono">
          <span>Chips: ${bjChips}</span>
          <span>Bet: ${bjBet}</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="text-xs text-emerald-200">
            Dealer {bjPhase === 'result' ? `(${blackjackValue(bjDealer).total})` : ''}
          </div>
          <div className="flex gap-2 justify-center min-h-[82px]">
            {bjDealer.map((c) => <CardFace key={c.id} card={c} compact={isLandscape} />)}
          </div>
          <div className="text-sm font-semibold text-amber-300 text-center">{bjMsg}</div>
          <div className="flex gap-2 justify-center min-h-[82px]">
            {bjPlayer.map((c) => <CardFace key={c.id} card={c} compact={isLandscape} />)}
          </div>
          <div className="text-xs text-emerald-200">
            You {bjPlayer.length > 0 ? `(${blackjackValue(bjPlayer).total})` : ''}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          {bjPhase === 'play' ? (
            <>
              <button type="button" onClick={hit} className="min-h-[44px] px-5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">Hit</button>
              <button type="button" onClick={() => resolveDealer(bjPlayer, bjDealer, bjDeck, bjBet, bjChips)} className="min-h-[44px] px-5 rounded-xl bg-white text-zinc-900 font-bold text-sm">Stand</button>
              {bjChips >= bjBet && bjPlayer.length === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const deck = [...bjDeck];
                    const nextP = [...bjPlayer, deck.pop()!];
                    const nextChips = bjChips - bjBet;
                    setBjChips(nextChips);
                    setBjPlayer(nextP);
                    resolveDealer(nextP, bjDealer, deck, bjBet * 2, nextChips);
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-orange-600 text-white font-bold text-sm"
                >
                  Double
                </button>
              )}
            </>
          ) : (
            [10, 25, 50].map((amt) => (
              <button
                key={amt}
                type="button"
                disabled={bjChips < amt}
                onClick={() => dealHand(amt)}
                className="min-h-[44px] px-4 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm disabled:opacity-40"
              >
                Deal ${amt}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- 4. Video Poker ---
  if (game.id === 'video-poker') {
    const handleDealDraw = () => {
      if (isPaused) return;
      if (vpPhase === 'deal') {
        if (vpCredits < 10) {
          onGameEnd({ won: false, score: vpCredits, summary: 'Out of credits!' });
          return;
        }
        sound.flip();
        const deck = createShuffledDeck(true);
        setVpCredits(vpCredits - 10);
        setVpHand(deck.slice(0, 5));
        setVpDeck(deck.slice(5));
        setVpHeld([false, false, false, false, false]);
        setVpPhase('draw');
        setVpMsg('Tap cards to HOLD, then tap Draw');
      } else {
        sound.flip();
        let ptr = 0;
        const nextHand = vpHand.map((c, idx) => (vpHeld[idx] ? c : vpDeck[ptr++]));
        setVpHand(nextHand);
        const res = evaluatePokerHand(nextHand);
        const payout = res.multiplier * 10;
        const nextCreds = vpCredits + payout;
        setVpCredits(nextCreds);
        setVpPhase('deal');
        if (payout > 0) {
          sound.win();
          setVpMsg(`${res.name}! Won +${payout} credits`);
        } else {
          setVpMsg('No winning pair — Deal again');
        }
        onScoreChange(nextCreds);
      }
    };

    return (
      <div className="w-full h-full flex flex-col justify-between items-center p-3 rounded-2xl bg-blue-950 text-white">
        <div className="text-sm font-mono">Credits: {vpCredits} · Bet: 10</div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5 sm:gap-2 justify-center flex-wrap">
            {vpHand.map((c, i) => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <CardFace
                  card={c}
                  compact={isLandscape}
                  selected={vpHeld[i]}
                  onClick={() => {
                    if (vpPhase !== 'draw') return;
                    sound.tap();
                    setVpHeld((h) => h.map((v, idx) => (idx === i ? !v : v)));
                  }}
                />
                {vpHeld[i] && <span className="text-[10px] font-bold text-amber-400">HOLD</span>}
              </div>
            ))}
          </div>
          <div className="text-sm font-semibold text-sky-200 text-center">{vpMsg}</div>
        </div>
        <button
          type="button"
          onClick={handleDealDraw}
          className="min-h-[46px] px-8 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm"
        >
          {vpPhase === 'deal' ? 'Deal (10)' : 'Draw Replacements'}
        </button>
      </div>
    );
  }

  // --- 5. High-Low Streak ---
  if (game.id === 'high-low') {
    const guessHL = (dir: 'hi' | 'lo') => {
      if (isPaused || !hlCurrent || hlDeck.length === 0) return;
      const nextCard = hlDeck[0];
      const rem = hlDeck.slice(1);
      const correct =
        dir === 'hi' ? nextCard.rank >= hlCurrent.rank : nextCard.rank <= hlCurrent.rank;
      setHlCurrent(nextCard);
      setHlDeck(rem.length > 0 ? rem : createShuffledDeck(true));
      if (correct) {
        sound.score();
        const nextPot = Math.floor(hlPot * 1.5);
        setHlPot(nextPot);
        setHlMsg(`Correct! Pot is now ${nextPot}`);
      } else {
        sound.error();
        setHlPot(10);
        setHlMsg('Wrong call! Pot reset to 10');
      }
    };

    const cashOut = () => {
      if (isPaused || hlPot <= 0) return;
      sound.win();
      const nextBank = hlBank + hlPot;
      setHlBank(nextBank);
      setHlPot(10);
      setHlMsg(`Banked pot! Total: ${nextBank}`);
      onScoreChange(nextBank);
    };

    return (
      <div className="w-full h-full flex flex-col justify-between items-center p-4 rounded-2xl bg-zinc-900 text-white">
        <div className="text-sm font-mono">Bank: {hlBank} · Active Pot: {hlPot}</div>
        <div className="flex flex-col items-center gap-3">
          {hlCurrent && <CardFace card={hlCurrent} />}
          <div className="text-xs text-zinc-300 text-center">{hlMsg}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => guessHL('hi')} className="min-h-[44px] px-5 rounded-xl bg-emerald-600 font-bold text-sm">Higher</button>
          <button type="button" onClick={() => guessHL('lo')} className="min-h-[44px] px-5 rounded-xl bg-rose-600 font-bold text-sm">Lower</button>
          <button type="button" onClick={cashOut} className="min-h-[44px] px-4 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">Cash Out</button>
        </div>
      </div>
    );
  }

  // --- 6. War Card Battle ---
  if (game.id === 'war') {
    const battle = () => {
      if (isPaused) return;
      if (warPDeck.length === 0 || warADeck.length === 0) {
        onGameEnd({
          won: warPDeck.length > warADeck.length,
          score: warPDeck.length,
          summary: warPDeck.length > warADeck.length ? 'Captured entire deck!' : 'Opponent captured your deck!',
        });
        return;
      }
      sound.flip();
      const pTop = warPDeck[0];
      const aTop = warADeck[0];
      const pRest = warPDeck.slice(1);
      const aRest = warADeck.slice(1);
      setWarCards({ p: pTop, a: aTop });

      if (pTop.rank > aTop.rank) {
        sound.score();
        const nextP = [...pRest, pTop, aTop];
        setWarPDeck(nextP);
        setWarADeck(aRest);
        setWarMsg(`You win the clash! (${nextP.length} vs ${aRest.length})`);
        onScoreChange(nextP.length);
      } else if (aTop.rank > pTop.rank) {
        const nextA = [...aRest, aTop, pTop];
        setWarPDeck(pRest);
        setWarADeck(nextA);
        setWarMsg(`Opponent takes the clash (${pRest.length} vs ${nextA.length})`);
        onScoreChange(pRest.length);
      } else {
        // Tie War: winner takes up to 3 cards from each
        const pBonus = pRest.slice(0, 2);
        const aBonus = aRest.slice(0, 2);
        const pDecider = pRest[2] ?? pTop;
        const aDecider = aRest[2] ?? aTop;
        const pool = [pTop, aTop, ...pBonus, ...aBonus];
        const pLeft = pRest.slice(Math.min(3, pRest.length));
        const aLeft = aRest.slice(Math.min(3, aRest.length));
        if (pDecider.rank >= aDecider.rank) {
          sound.win();
          const nextP = [...pLeft, ...pool, pDecider, aDecider];
          setWarPDeck(nextP);
          setWarADeck(aLeft);
          setWarMsg(`WAR! You won the tie-breaker (+${pool.length + 2} cards)!`);
          onScoreChange(nextP.length);
        } else {
          const nextA = [...aLeft, ...pool, pDecider, aDecider];
          setWarPDeck(pLeft);
          setWarADeck(nextA);
          setWarMsg('WAR! Opponent took the tie-breaker.');
          onScoreChange(pLeft.length);
        }
      }
    };

    return (
      <div className="w-full h-full flex flex-col justify-between items-center p-4 rounded-2xl bg-red-950 text-white">
        <div className="text-xs font-mono">Your Deck: {warPDeck.length} · Opponent: {warADeck.length}</div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-red-200">You</span>
            {warCards.p ? <CardFace card={warCards.p} /> : <div className="w-14 h-20 rounded-lg border border-dashed border-red-400/50" />}
          </div>
          <span className="font-display font-bold text-lg text-amber-400">VS</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-red-200">Bot</span>
            {warCards.a ? <CardFace card={warCards.a} /> : <div className="w-14 h-20 rounded-lg border border-dashed border-red-400/50" />}
          </div>
        </div>
        <div className="text-xs text-center text-red-100">{warMsg}</div>
        <button type="button" onClick={battle} className="min-h-[46px] px-8 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">
          Battle!
        </button>
      </div>
    );
  }

  // --- 7. Memory Pairs ---
  if (game.id === 'memory-pairs') {
    const flipCard = (idx: number) => {
      if (isPaused || memLock || memCards[idx].flipped || memCards[idx].matched) return;
      sound.flip();
      const next = memCards.map((m, i) => (i === idx ? { ...m, flipped: true } : m));
      setMemCards(next);

      if (memFirst === null) {
        setMemFirst(idx);
      } else {
        const firstIdx = memFirst;
        setMemFirst(null);
        const moves = memMoves + 1;
        setMemMoves(moves);

        if (next[firstIdx].card.rank === next[idx].card.rank && next[firstIdx].card.suit === next[idx].card.suit) {
          sound.score();
          const matchedNext = next.map((m, i) => (i === firstIdx || i === idx ? { ...m, matched: true } : m));
          setMemCards(matchedNext);
          const pts = matchedNext.filter((m) => m.matched).length * 25;
          onScoreChange(pts);
          if (matchedNext.every((m) => m.matched)) {
            sound.win();
            const finalScore = Math.max(100, 400 - moves * 10);
            onScoreChange(finalScore);
            onGameEnd({ won: true, score: finalScore, summary: `Matched all 8 pairs in ${moves} turns!` });
          }
        } else {
          setMemLock(true);
          setTimeout(() => {
            setMemCards((curr) =>
              curr.map((m, i) => (i === firstIdx || i === idx ? { ...m, flipped: false } : m))
            );
            setMemLock(false);
          }, 650);
        }
      }
    };

    return (
      <div className={`w-full h-full flex ${isLandscape ? 'flex-row gap-5' : 'flex-col gap-3'} items-center justify-center p-2`}>
        <div className="grid grid-cols-4 gap-2">
          {memCards.map((item, idx) => (
            <CardFace
              key={item.card.id + idx}
              compact={isLandscape}
              card={{ ...item.card, faceUp: item.flipped || item.matched }}
              onClick={() => flipCard(idx)}
            />
          ))}
        </div>
        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-300">Turns: {memMoves}</div>
      </div>
    );
  }

  // --- 8. TriPeaks Solitaire ---
  const wasteTop = triPeaks.waste[triPeaks.waste.length - 1];
  const isExposed = (idx: number): boolean => {
    if (idx >= 9) return true; // bottom row of 9
    // Row 1 (indices 3..8) covered by bottom row pairs
    if (idx >= 3) {
      const base = idx === 3 || idx === 4 ? 9 + (idx - 3) : idx === 5 || idx === 6 ? 12 + (idx - 5) : 15 + (idx - 7);
      return !triPeaks.cards[base] && !triPeaks.cards[base + 1];
    }
    // Row 0 (indices 0,1,2) covered by row 1 pairs
    const leftChild = 3 + idx * 2;
    return !triPeaks.cards[leftChild] && !triPeaks.cards[leftChild + 1];
  };

  const handlePeakTap = (idx: number) => {
    if (isPaused || !isExposed(idx)) return;
    const card = triPeaks.cards[idx];
    if (!card || !wasteTop) return;
    const diff = Math.abs(card.rank - wasteTop.rank);
    const adj = diff === 1 || diff === 12; // A <-> K wrap
    if (!adj) {
      sound.error();
      return;
    }
    sound.score();
    const nextCards = triPeaks.cards.map((c, i) => (i === idx ? null : c));
    const nextStreak = triPeaks.streak + 1;
    const nextScore = triPeaks.score + 10 * nextStreak;
    setTriPeaks({
      ...triPeaks,
      cards: nextCards,
      waste: [...triPeaks.waste, card],
      streak: nextStreak,
      score: nextScore,
    });
    onScoreChange(nextScore);
    if (nextCards.every((c) => c === null)) {
      sound.win();
      onGameEnd({ won: true, score: nextScore, summary: `Cleared all Three Peaks! Score: ${nextScore}` });
    }
  };

  const drawTriStock = () => {
    if (isPaused || triPeaks.stock.length === 0) return;
    sound.flip();
    const top = triPeaks.stock[triPeaks.stock.length - 1];
    setTriPeaks({
      ...triPeaks,
      stock: triPeaks.stock.slice(0, -1),
      waste: [...triPeaks.waste, top],
      streak: 0,
    });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between items-center p-3 rounded-2xl bg-emerald-900 text-white">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex gap-8">
          {[0, 1, 2].map((i) =>
            triPeaks.cards[i] ? (
              <CardFace key={i} compact card={{ ...triPeaks.cards[i]!, faceUp: isExposed(i) }} onClick={() => handlePeakTap(i)} />
            ) : <div key={i} className="w-10 h-14" />
          )}
        </div>
        <div className="flex gap-2">
          {[3, 4, 5, 6, 7, 8].map((i) =>
            triPeaks.cards[i] ? (
              <CardFace key={i} compact card={{ ...triPeaks.cards[i]!, faceUp: isExposed(i) }} onClick={() => handlePeakTap(i)} />
            ) : <div key={i} className="w-10 h-14" />
          )}
        </div>
        <div className="flex gap-1">
          {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((i) =>
            triPeaks.cards[i] ? (
              <CardFace key={i} compact card={triPeaks.cards[i]!} onClick={() => handlePeakTap(i)} />
            ) : <div key={i} className="w-10 h-14" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={triPeaks.stock.length === 0}
          onClick={drawTriStock}
          className="px-4 py-2 rounded-xl bg-indigo-700 border border-white/60 text-xs font-bold disabled:opacity-40"
        >
          Stock ({triPeaks.stock.length})
        </button>
        {wasteTop && <CardFace compact card={wasteTop} />}
      </div>
    </div>
  );
};
