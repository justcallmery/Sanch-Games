// Pure logic & curated offline dictionaries for Card, Word, Trivia, and Brain games

export type Suit = '♠' | '♥' | '♦' | '♣';
export interface PlayingCard {
  suit: Suit;
  rank: number; // 1 (Ace) .. 13 (King)
  faceUp: boolean;
  id: string;
}

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

export function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}

export function createShuffledDeck(faceUp = false, rng: () => number = Math.random): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp, id: `${suit}-${rank}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function blackjackValue(cards: PlayingCard[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 1) {
      aces++;
      total += 11;
    } else if (c.rank >= 10) {
      total += 10;
    } else {
      total += c.rank;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function evaluatePokerHand(cards: PlayingCard[]): { name: string; multiplier: number } {
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const suits = cards.map((c) => c.suit);
  const flush = suits.every((s) => s === suits[0]);

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const freq = Array.from(counts.values()).sort((a, b) => b - a);

  const uniqueRanks = Array.from(new Set(ranks));
  let straight = false;
  let royal = false;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[4] - uniqueRanks[0] === 4) straight = true;
    if (
      uniqueRanks[0] === 1 &&
      uniqueRanks[1] === 10 &&
      uniqueRanks[2] === 11 &&
      uniqueRanks[3] === 12 &&
      uniqueRanks[4] === 13
    ) {
      straight = true;
      royal = true;
    }
  }

  if (flush && royal) return { name: 'Royal Flush', multiplier: 250 };
  if (flush && straight) return { name: 'Straight Flush', multiplier: 50 };
  if (freq[0] === 4) return { name: 'Four of a Kind', multiplier: 25 };
  if (freq[0] === 3 && freq[1] === 2) return { name: 'Full House', multiplier: 9 };
  if (flush) return { name: 'Flush', multiplier: 6 };
  if (straight) return { name: 'Straight', multiplier: 4 };
  if (freq[0] === 3) return { name: 'Three of a Kind', multiplier: 3 };
  if (freq[0] === 2 && freq[1] === 2) return { name: 'Two Pair', multiplier: 2 };
  for (const [r, cnt] of counts.entries()) {
    if (cnt === 2 && (r === 1 || r >= 11)) return { name: 'Jacks or Better', multiplier: 1 };
  }
  return { name: 'No Pair', multiplier: 0 };
}

// --- Yahtzee / Dice Yacht Scoring ---
export type YachtCategory =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'threeKind' | 'fourKind' | 'fullHouse' | 'smStraight' | 'lgStraight' | 'yacht' | 'chance';

export function scoreYachtCategory(dice: number[], cat: YachtCategory): number {
  const sum = dice.reduce((a, b) => a + b, 0);
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  const maxFreq = Math.max(...counts);

  switch (cat) {
    case 'ones': return counts[1] * 1;
    case 'twos': return counts[2] * 2;
    case 'threes': return counts[3] * 3;
    case 'fours': return counts[4] * 4;
    case 'fives': return counts[5] * 5;
    case 'sixes': return counts[6] * 6;
    case 'threeKind': return maxFreq >= 3 ? sum : 0;
    case 'fourKind': return maxFreq >= 4 ? sum : 0;
    case 'fullHouse': {
      const has3 = counts.includes(3);
      const has2 = counts.includes(2);
      return (has3 && has2) || maxFreq === 5 ? 25 : 0;
    }
    case 'smStraight': {
      const uniq = new Set(dice);
      const hasSeq =
        [1, 2, 3, 4].every((n) => uniq.has(n)) ||
        [2, 3, 4, 5].every((n) => uniq.has(n)) ||
        [3, 4, 5, 6].every((n) => uniq.has(n));
      return hasSeq ? 30 : 0;
    }
    case 'lgStraight': {
      const sorted = [...dice].sort((a, b) => a - b).join('');
      return sorted === '12345' || sorted === '23456' ? 40 : 0;
    }
    case 'yacht': return maxFreq === 5 ? 50 : 0;
    case 'chance': return sum;
  }
}

// --- Word Guess 5 Evaluation ---
export type LetterState = 'correct' | 'present' | 'absent';

export function evaluateWordGuess(guess: string, target: string): LetterState[] {
  const g = guess.toUpperCase().split('');
  const t = target.toUpperCase().split('');
  const res: LetterState[] = Array(5).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < 5; i++) {
    if (g[i] === t[i]) {
      res[i] = 'correct';
    } else {
      remaining[t[i]] = (remaining[t[i]] ?? 0) + 1;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === 'correct') continue;
    if ((remaining[g[i]] ?? 0) > 0) {
      res[i] = 'present';
      remaining[g[i]]--;
    }
  }
  return res;
}

// --- Mastermind Evaluation ---
export function evaluateMastermind(guess: number[], secret: number[]): { exact: number; partial: number } {
  let exact = 0;
  const gRem: number[] = [];
  const sRem: number[] = [];
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) exact++;
    else {
      gRem.push(guess[i]);
      sRem.push(secret[i]);
    }
  }
  let partial = 0;
  for (const c of gRem) {
    const idx = sRem.indexOf(c);
    if (idx !== -1) {
      partial++;
      sRem.splice(idx, 1);
    }
  }
  return { exact, partial };
}

// --- Offline Word Lists ---
export const FIVE_LETTER_WORDS = [
  'APPLE', 'BRAVE', 'CRANE', 'DRIVE', 'EAGLE', 'FLAME', 'GRAPE', 'HOUSE', 'INDEX', 'JOKER',
  'KNIFE', 'LEMON', 'MANGO', 'NIGHT', 'OCEAN', 'PIANO', 'QUEST', 'RIVER', 'SOLAR', 'TIGER',
  'ULTRA', 'VIVID', 'WHALE', 'XENON', 'YACHT', 'ZEBRA', 'AMBER', 'BRICK', 'CHESS', 'DELTA',
  'EMBER', 'FROST', 'GLIDE', 'HEART', 'IVORY', 'JOLLY', 'KARMA', 'LIGHT', 'MAGIC', 'NOBLE',
  'ORBIT', 'PEARL', 'QUIET', 'RADAR', 'SHINE', 'TRAIN', 'URBAN', 'VALVE', 'WORLD', 'YOUTH',
  'ALIGN', 'BLOOM', 'CLOUD', 'DANCE', 'EARTH', 'FEAST', 'GIANT', 'HONEY', 'IMAGE', 'JUICE',
  'KOALA', 'LASER', 'METAL', 'NORTH', 'OLIVE', 'PLANT', 'QUICK', 'ROBOT', 'STONE', 'TOWER',
  'UNITY', 'VAULT', 'WATER', 'PIXEL', 'PRISM', 'SPARK', 'STORM', 'TRACK', 'SMART', 'FLASH',
  'SWIFT', 'BLAZE', 'CROWN', 'DRIFT', 'FLINT', 'GHOST', 'HOVER', 'LUNAR', 'MAPLE', 'NERVE',
  'OPERA', 'PULSE', 'QUART', 'RALLY', 'SCALE', 'TEMPO', 'VAPOR', 'WHEAT', 'ZESTY', 'CHIME',
  'BREAD', 'CHAIR', 'DREAM', 'ELITE', 'FOCUS', 'GLOBE', 'HAPPY', 'INPUT', 'JEWEL', 'KITES',
  'LEVEL', 'MUSIC', 'NOVEL', 'OASIS', 'POWER', 'ROAST', 'SHORE', 'THORN', 'VOICE', 'WINDS',
];

export const HANGMAN_WORDS: { word: string; category: string }[] = [
  { word: 'ELEPHANT', category: 'Animals' },
  { word: 'KANGAROO', category: 'Animals' },
  { word: 'DOLPHIN', category: 'Animals' },
  { word: 'PENGUIN', category: 'Animals' },
  { word: 'CHAMELEON', category: 'Animals' },
  { word: 'VOLCANO', category: 'Nature' },
  { word: 'GLACIER', category: 'Nature' },
  { word: 'WATERFALL', category: 'Nature' },
  { word: 'HURRICANE', category: 'Nature' },
  { word: 'ASTEROID', category: 'Space' },
  { word: 'TELESCOPE', category: 'Space' },
  { word: 'SATELLITE', category: 'Space' },
  { word: 'NEBULA', category: 'Space' },
  { word: 'GRAVITY', category: 'Science' },
  { word: 'MOLECULE', category: 'Science' },
  { word: 'PENDULUM', category: 'Science' },
  { word: 'COMPASS', category: 'Explorer' },
  { word: 'PYRAMID', category: 'History' },
  { word: 'LABYRINTH', category: 'Myth' },
  { word: 'SAXOPHONE', category: 'Music' },
  { word: 'SYMPHONY', category: 'Music' },
  { word: 'AVOCADO', category: 'Food' },
  { word: 'CROISSANT', category: 'Food' },
  { word: 'PINEAPPLE', category: 'Food' },
];

export const SCRAMBLE_WORDS = [
  'PLANET', 'ROCKET', 'BRIDGE', 'CASTLE', 'GARDEN', 'SILVER', 'ORANGE', 'PUZZLE',
  'WINDOW', 'FOREST', 'GALAXY', 'ISLAND', 'MARKET', 'MIRROR', 'PENCIL', 'BUTTON',
  'CIRCLE', 'DRAGON', 'ENERGY', 'FLIGHT', 'HAMMER', 'JUNGLE', 'KNIGHT', 'LANTERN',
  'MAGNET', 'NEUTRON', 'ORCHID', 'PRISON', 'QUARTZ', 'RIBBON', 'SHADOW', 'TUNNEL',
];

export const COMMON_DICTIONARY_SET = new Set<string>([
  ...FIVE_LETTER_WORDS,
  ...SCRAMBLE_WORDS,
  'CAT', 'DOG', 'SUN', 'CAR', 'BUS', 'MAP', 'PEN', 'CUP', 'HAT', 'BOX', 'FOX', 'OWL', 'ANT', 'BEE',
  'ACE', 'ACT', 'ADD', 'AGE', 'AID', 'AIM', 'AIR', 'ALE', 'ALL', 'AND', 'ARC', 'ARE', 'ARM', 'ART',
  'ASH', 'ASK', 'ATE', 'AWE', 'AXE', 'BAD', 'BAG', 'BAN', 'BAR', 'BAT', 'BAY', 'BED', 'BET', 'BIG',
  'BIN', 'BIT', 'BOW', 'BOY', 'BUD', 'BUG', 'BUN', 'BUY', 'CAB', 'CAD', 'CAM', 'CAN', 'CAP', 'COB',
  'COD', 'COG', 'COP', 'COT', 'COW', 'CRY', 'CUB', 'CUD', 'CUE', 'CUT', 'DAB', 'DAD', 'DAM', 'DAN',
  'DAY', 'DEN', 'DEW', 'DID', 'DIE', 'DIG', 'DIM', 'DIN', 'DIP', 'DOE', 'DOT', 'DRY', 'DUB', 'DUD',
  'DUE', 'DUG', 'DUO', 'EAR', 'EAT', 'EBB', 'EGG', 'EGO', 'ELK', 'ELM', 'END', 'ERA', 'EVE', 'EYE',
  'FAB', 'FAD', 'FAN', 'FAR', 'FAT', 'FAX', 'FED', 'FEE', 'FEN', 'FEW', 'FIB', 'FIG', 'FIN', 'FIR',
  'FIT', 'FIX', 'FLU', 'FLY', 'FOB', 'FOE', 'FOG', 'FOR', 'FRY', 'FUN', 'FUR', 'GAB', 'GAG', 'GAL',
  'GAP', 'GAS', 'GAY', 'GEL', 'GEM', 'GET', 'GIG', 'GIN', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY',
  'GYM', 'HAD', 'HAG', 'HAM', 'HAS', 'HAY', 'HEM', 'HEN', 'HER', 'HEW', 'HEX', 'HEY', 'HID', 'HIM',
  'HIP', 'HIS', 'HIT', 'HOB', 'HOD', 'HOG', 'HOP', 'HOT', 'HOW', 'HUB', 'HUE', 'HUG', 'HUM', 'HUT',
  'ICE', 'ICY', 'ILL', 'IMP', 'INK', 'INN', 'ION', 'IRE', 'IRK', 'IVY', 'JAB', 'JAG', 'JAM', 'JAR',
  'JAW', 'JAY', 'JET', 'JIG', 'JOB', 'JOG', 'JOT', 'JOY', 'JUG', 'KEG', 'KEN', 'KEY', 'KID', 'KIN',
  'KIT', 'LAB', 'LAC', 'LAD', 'LAG', 'LAP', 'LAW', 'LAX', 'LAY', 'LEA', 'LED', 'LEG', 'LET', 'LID',
  'LIE', 'LIP', 'LIT', 'LOB', 'LOG', 'LOP', 'LOT', 'LOW', 'LUG', 'MAD', 'MAN', 'MAR', 'MAT', 'MAW',
  'MAX', 'MAY', 'MEN', 'MET', 'MEW', 'MID', 'MIX', 'MOB', 'MOD', 'MOM', 'MOP', 'MOW', 'MUD', 'MUG',
  'MUM', 'NAB', 'NAG', 'NAP', 'NAY', 'NET', 'NEW', 'NIB', 'NIL', 'NIP', 'NIT', 'NOD', 'NOR', 'NOT',
  'NOW', 'NUB', 'NUN', 'NUT', 'OAF', 'OAK', 'OAR', 'OAT', 'ODD', 'ODE', 'OFF', 'OFT', 'OIL', 'OLD',
  'ONE', 'OPT', 'ORB', 'ORE', 'OUR', 'OUT', 'OVA', 'OWE', 'OWN', 'PAD', 'PAL', 'PAN', 'PAP', 'PAR',
  'PAT', 'PAW', 'PAY', 'PEA', 'PEG', 'PEP', 'PER', 'PET', 'PEW', 'PIE', 'PIG', 'PIN', 'PIT', 'PLY',
  'POD', 'POP', 'POT', 'POW', 'PRO', 'PRY', 'PUB', 'PUG', 'PUN', 'PUP', 'PUS', 'PUT', 'RAD', 'RAG',
  'RAM', 'RAN', 'RAP', 'RAT', 'RAW', 'RAY', 'RED', 'REF', 'REP', 'RIB', 'RID', 'RIG', 'RIM', 'RIP',
  'ROB', 'ROD', 'ROE', 'ROT', 'ROW', 'RUB', 'RUG', 'RUM', 'RUN', 'RUT', 'RYE', 'SAC', 'SAD', 'SAG',
  'SAP', 'SAT', 'SAW', 'SAX', 'SAY', 'SEA', 'SEE', 'SET', 'SEW', 'SHE', 'SHY', 'SIN', 'SIP', 'SIR',
  'SIS', 'SIT', 'SIX', 'SKI', 'SKY', 'SLY', 'SOB', 'SOD', 'SON', 'SOP', 'SOW', 'SOY', 'SPA', 'SPY',
  'STY', 'SUB', 'SUD', 'SUE', 'SUM', 'SUP', 'TAB', 'TAD', 'TAG', 'TAN', 'TAP', 'TAR', 'TAT', 'TAX',
  'TEA', 'TED', 'TEE', 'TEN', 'THE', 'THY', 'TIC', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOO', 'TOP',
  'TOT', 'TOW', 'TOY', 'TRY', 'TUB', 'TUG', 'TUN', 'TWO', 'URN', 'USE', 'VAN', 'VAT', 'VET', 'VEX',
  'VIA', 'VIE', 'VOW', 'WAD', 'WAG', 'WAN', 'WAR', 'WAS', 'WAX', 'WAY', 'WEB', 'WED', 'WEE', 'WET',
  'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WOE', 'WOK', 'WON', 'WOO', 'WOW', 'WRY', 'YAK', 'YAM', 'YAP',
  'YAW', 'YEA', 'YES', 'YET', 'YEW', 'YIN', 'YIP', 'YOU', 'ZAP', 'ZED', 'ZEE', 'ZEN', 'ZIG', 'ZIP',
  'ZIT', 'ZOO',
  'GAME', 'PLAY', 'STAR', 'MOON', 'TREE', 'BOOK', 'CODE', 'DATA', 'FIRE', 'WIND', 'RAIN', 'SNOW',
  'GOLD', 'TIME', 'LINE', 'RING', 'SONG', 'WORD', 'HAND', 'FOOT', 'HEAD', 'DOOR', 'ROOM', 'WALL',
  'ROAD', 'PATH', 'SHIP', 'BOAT', 'FISH', 'BIRD', 'BEAR', 'WOLF', 'DEER', 'LION', 'FROG', 'DUCK',
  'CAKE', 'MILK', 'SALT', 'CORN', 'RICE', 'BEAN', 'PEAR', 'PLUM', 'KIWI', 'LIME', 'BLUE', 'PINK',
  'GRAY', 'DARK', 'FAST', 'SLOW', 'HIGH', 'DEEP', 'WIDE', 'LONG', 'NEAR', 'GOOD', 'BEST', 'TRUE',
  'FAIR', 'KIND', 'CALM', 'BOLD', 'PURE', 'WARM', 'COOL', 'SOFT', 'HARD', 'OPEN', 'SHUT', 'MAKE',
  'TAKE', 'GIVE', 'HOLD', 'KEEP', 'FIND', 'SHOW', 'TELL', 'KNOW', 'FEEL', 'READ', 'SEND', 'WAIT',
  'WORK', 'REST', 'JUMP', 'SWIM', 'RIDE', 'WALK', 'TALK', 'SING', 'DRAW', 'GROW', 'LOVE', 'HOPE',
  'AREA', 'ARMY', 'ARTS', 'ATOM', 'BABY', 'BACK', 'BALL', 'BAND', 'BANK', 'BASE', 'BATH', 'BELL',
  'BELT', 'BEND', 'BIKE', 'BILL', 'BITE', 'BLOW', 'BONE', 'BOOM', 'BOOT', 'BORN', 'BOSS', 'BOTH',
  'BOWL', 'BULK', 'BURN', 'BURY', 'BUSH', 'BUSY', 'BYTE', 'CAFE', 'CAGE', 'CALL', 'CAMP', 'CARD',
  'CARE', 'CART', 'CASE', 'CASH', 'CAST', 'CAVE', 'CELL', 'CENT', 'CHAT', 'CHEF', 'CHIP', 'CITY',
  'CLAY', 'CLIP', 'CLUB', 'CLUE', 'COAL', 'COAT', 'COIN', 'COLD', 'COME', 'COOK', 'COPY', 'CORE',
  'COST', 'CREW', 'CROP', 'CROW', 'CUBE', 'CURE', 'CUTE', 'DARE', 'DART', 'DASH', 'DATE', 'DAWN',
  'DEAD', 'DEAL', 'DEAR', 'DEBT', 'DECK', 'DEED', 'DESK', 'DIAL', 'DICE', 'DIET', 'DIME', 'DINE',
  'DIRT', 'DISC', 'DISH', 'DISK', 'DIVE', 'DOCK', 'DOES', 'DOLL', 'DOME', 'DONE', 'DOSE', 'DOWN',
  'DRAG', 'DROP', 'DRUM', 'DUAL', 'DUST', 'DUTY', 'EACH', 'EARN', 'EASE', 'EAST', 'EASY', 'ECHO',
  'EDGE', 'EDIT', 'ELSE', 'ENVY', 'EPIC', 'EURO', 'EVEN', 'EVER', 'EVIL', 'EXAM', 'EXIT', 'FACE',
  'FACT', 'FADE', 'FAIL', 'FAKE', 'FALL', 'FAME', 'FARM', 'FATE', 'FEAR', 'FEED', 'FEET', 'FELL',
  'FELT', 'FILE', 'FILL', 'FILM', 'FINE', 'FIRM', 'FIST', 'FIVE', 'FLAG', 'FLAT', 'FLEE', 'FLEW',
  'FLIP', 'FLOW', 'FOAM', 'FOLD', 'FOLK', 'FOND', 'FONT', 'FOOD', 'FOOL', 'FORD', 'FORK', 'FORM',
  'FORT', 'FOUR', 'FREE', 'FROM', 'FUEL', 'FULL', 'FUND', 'FUSE', 'GAIN', 'GALE', 'GANG', 'GATE',
  'GAVE', 'GAZE', 'GEAR', 'GENE', 'GIFT', 'GIRL', 'GLAD', 'GLOW', 'GLUE', 'GOAL', 'GOAT', 'GOES',
  'GONE', 'GOLF', 'GRAB', 'GRAM', 'GRID', 'GRIN', 'GRIP', 'GULF', 'GURU', 'GUST', 'HACK', 'HAIL',
  'HAIR', 'HALF', 'HALL', 'HALT', 'HANG', 'HARM', 'HARP', 'HATE', 'HAUL', 'HAVE', 'HAWK', 'HAZE',
  'HEAL', 'HEAP', 'HEAR', 'HEAT', 'HEEL', 'HEIR', 'HELD', 'HELL', 'HELP', 'HERB', 'HERD', 'HERE',
  'HERO', 'HIDE', 'HIKE', 'HILL', 'HINT', 'HIRE', 'HOLE', 'HOLY', 'HOME', 'HOOD', 'HOOK', 'HORN',
  'HOST', 'HOUR', 'HUGE', 'HULL', 'HUNT', 'HURT', 'ICON', 'IDEA', 'IDLE', 'INCH', 'INFO', 'INTO',
  'IRON', 'ISLE', 'ITEM', 'JAIL', 'JAZZ', 'JEAN', 'JERK', 'JEST', 'JOIN', 'JOKE', 'JOLT', 'JULY',
  'JUNE', 'JURY', 'JUST', 'KEEN', 'KICK', 'KILL', 'KING', 'KISS', 'KITE', 'KNEE', 'KNEW', 'KNIT',
  'KNOT', 'LACE', 'LACK', 'LADY', 'LAID', 'LAKE', 'LAMB', 'LAMP', 'LAND', 'LANE', 'LAST', 'LATE',
  'LAVA', 'LAWN', 'LAZY', 'LEAD', 'LEAF', 'LEAK', 'LEAN', 'LEAP', 'LEFT', 'LEND', 'LENS', 'LESS',
  'LIAR', 'LICE', 'LICK', 'LIFE', 'LIFT', 'LIKE', 'LIMB', 'LINK', 'LINT', 'LIST', 'LIVE', 'LOAD',
  'LOAF', 'LOAN', 'LOCK', 'LOFT', 'LOGO', 'LONE', 'LOOK', 'LOOP', 'LORD', 'LORE', 'LOSE', 'LOSS',
  'LOST', 'LOTS', 'LOUD', 'LUCK', 'LUMP', 'LUNG', 'LURE', 'LUSH', 'MACE', 'MADE', 'MAID', 'MAIL',
  'MAIN', 'MALE', 'MALL', 'MALT', 'MANE', 'MANY', 'MARK', 'MARS', 'MASK', 'MASS', 'MATE', 'MATH',
  'MAZE', 'MEAL', 'MEAN', 'MEAT', 'MEEK', 'MEET', 'MELT', 'MEMO', 'MEND', 'MENU', 'MERE', 'MESH',
  'MESS', 'MILD', 'MILE', 'MILL', 'MIND', 'MINE', 'MINT', 'MISS', 'MIST', 'MOAN', 'MOAT', 'MOCK',
  'MODE', 'MOLD', 'MOLE', 'MONK', 'MOOD', 'MORE', 'MOSS', 'MOST', 'MOTH', 'MOVE', 'MUCH', 'MULE',
  'MUSE', 'MUST', 'MUTE', 'MYTH', 'NAIL', 'NAME', 'NAVY', 'NEAT', 'NECK', 'NEED', 'NEST', 'NEWS',
  'NEXT', 'NICE', 'NINE', 'NODE', 'NONE', 'NOON', 'NORM', 'NOSE', 'NOTE', 'NOUN', 'NUDE', 'NULL',
  'NUMB', 'OATH', 'OBEY', 'ODDS', 'ODOR', 'OKAY', 'OMEN', 'OMIT', 'ONCE', 'ONLY', 'ONTO', 'OOZE',
  'OPAL', 'ORAL', 'ORCA', 'OVEN', 'OVER', 'PACE', 'PACK', 'PACT', 'PAGE', 'PAID', 'PAIL', 'PAIN',
  'PAIR', 'PALE', 'PALM', 'PANE', 'PANG', 'PANT', 'PARK', 'PART', 'PASS', 'PAST', 'PAVE', 'PEAK',
  'PEEL', 'PEER', 'PELT', 'PEND', 'PERK', 'PEST', 'PICK', 'PIER', 'PIKE', 'PILE', 'PILL', 'PINE',
  'PINT', 'PIPE', 'PITY', 'PLAN', 'PLEA', 'PLOT', 'PLOW', 'PLUG', 'PLUS', 'POEM', 'POET', 'POKE',
  'POLE', 'POLL', 'POLO', 'POND', 'PONY', 'POOL', 'POOR', 'POPE', 'PORK', 'PORT', 'POSE', 'POST',
  'POUR', 'PRAY', 'PREY', 'PROP', 'PROW', 'PULL', 'PULP', 'PUMP', 'PUNK', 'PUSH', 'QUIT', 'QUIZ',
  'RACE', 'RACK', 'RAFT', 'RAGE', 'RAID', 'RAIL', 'RAKE', 'RAMP', 'RANG', 'RANK', 'RANT', 'RARE',
  'RASH', 'RATE', 'RAVE', 'RAYS', 'REAL', 'REAM', 'REAP', 'REAR', 'REED', 'REEF', 'REEL', 'RELY',
  'RENT', 'RICE', 'RICH', 'RIFT', 'RIND', 'RIOT', 'RIPE', 'RISE', 'RISK', 'ROAM', 'ROAR', 'ROBE',
  'ROCK', 'RODE', 'ROLE', 'ROLL', 'ROOF', 'ROOK', 'ROOT', 'ROPE', 'ROSE', 'ROSY', 'ROUT', 'ROVE',
  'RUDE', 'RUIN', 'RULE', 'RUMP', 'RUNG', 'RUSH', 'RUST', 'RUTH', 'SACK', 'SAFE', 'SAGE', 'SAID',
  'SAIL', 'SAKE', 'SALE', 'SAME', 'SAND', 'SANE', 'SANG', 'SANK', 'SASH', 'SAVE', 'SAWN', 'SCAN',
  'SCAR', 'SEAL', 'SEAM', 'SEAT', 'SECT', 'SEED', 'SEEK', 'SEEM', 'SEEN', 'SELF', 'SELL', 'SEMI',
  'SENT', 'SERF', 'SHED', 'SHIN', 'SHOE', 'SHOP', 'SHOT', 'SILK', 'SILL', 'SILO', 'SILT', 'SINK',
  'SITE', 'SIZE', 'SKID', 'SKIM', 'SKIN', 'SKIP', 'SKIS', 'SLAB', 'SLAM', 'SLAP', 'SLAT', 'SLED',
  'SLEW', 'SLID', 'SLIM', 'SLIP', 'SLIT', 'SLOB', 'SLOT', 'SLUG', 'SLUM', 'SMOG', 'SNAP', 'SNIP',
  'SNOB', 'SOAK', 'SOAP', 'SOAR', 'SOCK', 'SODA', 'SOFA', 'SOIL', 'SOLD', 'SOLE', 'SOLO', 'SOME',
  'SOON', 'SOOT', 'SORE', 'SORT', 'SOUL', 'SOUP', 'SOUR', 'SPAN', 'SPAR', 'SPAT', 'SPEC', 'SPED',
  'SPIN', 'SPIT', 'SPOT', 'SPRY', 'SPUD', 'SPUN', 'SPUR', 'STAB', 'STAG', 'STAY', 'STEM', 'STEP',
  'STEW', 'STIR', 'STOP', 'STOW', 'STUB', 'STUD', 'STUN', 'SUCH', 'SUDS', 'SUIT', 'SULK', 'SUNG',
  'SUNK', 'SURE', 'SURF', 'SWAN', 'SWAP', 'SWAY', 'SWOB', 'SWUM', 'SYNC', 'TACK', 'TACT', 'TAIL',
  'TALE', 'TALL', 'TAME', 'TANK', 'TAPE', 'TAPS', 'TART', 'TASK', 'TAXI', 'TEAK', 'TEAL', 'TEAM',
  'TEAR', 'TEAS', 'TECH', 'TEEN', 'TEND', 'TENT', 'TERM', 'TEST', 'TEXT', 'THAN', 'THAT', 'THEM',
  'THEN', 'THEY', 'THIN', 'THIS', 'THUD', 'THUG', 'THUS', 'TICK', 'TIDE', 'TIDY', 'TIED', 'TIER',
  'TILE', 'TILL', 'TILT', 'TINT', 'TINY', 'TIRE', 'TOAD', 'TOIL', 'TOLD', 'TOLL', 'TOMB', 'TOME',
  'TONE', 'TOOK', 'TOOL', 'TOOT', 'TORE', 'TORN', 'TORT', 'TOSS', 'TOUR', 'TOWN', 'TRAM', 'TRAP',
  'TRAY', 'TREK', 'TRIM', 'TRIO', 'TRIP', 'TROD', 'TROT', 'TUBE', 'TUCK', 'TUFT', 'TUNA', 'TUNE',
  'TURF', 'TURN', 'TUSK', 'TUTU', 'TWIG', 'TWIN', 'TYPE', 'UGLY', 'UNDO', 'UNIT', 'UNTO', 'UPON',
  'URGE', 'USED', 'USER', 'VAIN', 'VALE', 'VANE', 'VARY', 'VASE', 'VAST', 'VEIL', 'VEIN', 'VENT',
  'VERB', 'VERY', 'VEST', 'VETO', 'VIAL', 'VICE', 'VIEW', 'VILE', 'VINE', 'VISA', 'VOID', 'VOLT',
  'VOTE', 'WADE', 'WAGE', 'WAIL', 'WAKE', 'WAND', 'WANE', 'WANT', 'WARD', 'WARE', 'WARN', 'WARP',
  'WART', 'WARY', 'WASH', 'WASP', 'WAVE', 'WAVY', 'WAXY', 'WEAK', 'WEAL', 'WEAR', 'WEED', 'WEEK',
  'WEEP', 'WELD', 'WELL', 'WELT', 'WENT', 'WEPT', 'WERE', 'WEST', 'WHAT', 'WHEN', 'WHET', 'WHIM',
  'WHIP', 'WHIR', 'WHOM', 'WICK', 'WIFE', 'WILD', 'WILL', 'WILT', 'WILY', 'WIMP', 'WINE', 'WING',
  'WINK', 'WIPE', 'WIRE', 'WIRY', 'WISE', 'WISH', 'WISP', 'WITH', 'WOKE', 'WOMB', 'WONT', 'WOOD',
  'WOOF', 'WOOL', 'WORE', 'WORM', 'WORN', 'WOVE', 'WRAP', 'WREN', 'WRIT', 'YANK', 'YARD', 'YARN',
  'YAWN', 'YEAR', 'YELL', 'YELP', 'YOGA', 'YOKE', 'YOLK', 'YOUR', 'ZEAL', 'ZERO', 'ZEST', 'ZINC',
  'ZONE', 'ZOOM',
]);

export interface TriviaQuestion {
  q: string;
  options: [string, string, string, string];
  answer: number;
  topic: string;
}

export const OFFLINE_TRIVIA: TriviaQuestion[] = [
  { topic: 'Science', q: 'Which planet in our solar system has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
  { topic: 'Science', q: 'What is the chemical symbol for Tungsten?', options: ['Tu', 'Tg', 'W', 'Tn'], answer: 2 },
  { topic: 'Science', q: 'Roughly how long does light take to travel from the Sun to Earth?', options: ['8 seconds', '8 minutes', '8 hours', '8 days'], answer: 1 },
  { topic: 'Science', q: 'Which blood cells are primarily responsible for carrying oxygen?', options: ['White cells', 'Platelets', 'Red blood cells', 'Plasma'], answer: 2 },
  { topic: 'Science', q: 'What is the hardest naturally occurring mineral on the Mohs scale?', options: ['Quartz', 'Topaz', 'Corundum', 'Diamond'], answer: 3 },
  { topic: 'Science', q: 'Which gas makes up about 78% of Earth’s atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Argon'], answer: 1 },
  { topic: 'Science', q: 'At what temperature are Celsius and Fahrenheit equal?', options: ['-40°', '0°', '-32°', '-18°'], answer: 0 },
  { topic: 'Science', q: 'What organelle is known as the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], answer: 2 },
  { topic: 'Geography', q: 'Which country has the longest coastline in the world?', options: ['Russia', 'Indonesia', 'Australia', 'Canada'], answer: 3 },
  { topic: 'Geography', q: 'What is the capital city of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], answer: 2 },
  { topic: 'Geography', q: 'Which river flows through Cairo, Egypt?', options: ['Tigris', 'Nile', 'Euphrates', 'Congo'], answer: 1 },
  { topic: 'Geography', q: 'Mount Kilimanjaro is located in which country?', options: ['Kenya', 'Tanzania', 'Ethiopia', 'Uganda'], answer: 1 },
  { topic: 'Geography', q: 'Which ocean is the smallest and shallowest of the world’s five oceans?', options: ['Indian', 'Southern', 'Arctic', 'Atlantic'], answer: 2 },
  { topic: 'Geography', q: 'Reykjavik is the capital of which island nation?', options: ['Greenland', 'Iceland', 'Ireland', 'Faroe Islands'], answer: 1 },
  { topic: 'Geography', q: 'Which desert is the largest hot desert on Earth?', options: ['Gobi', 'Kalahari', 'Sahara', 'Arabian'], answer: 2 },
  { topic: 'Geography', q: 'Which South American country speaks Portuguese as its official language?', options: ['Argentina', 'Colombia', 'Peru', 'Brazil'], answer: 3 },
  { topic: 'History', q: 'In which year did the Apollo 11 mission first land humans on the Moon?', options: ['1965', '1969', '1971', '1973'], answer: 1 },
  { topic: 'History', q: 'The ancient city of Machu Picchu was built by which civilization?', options: ['Aztec', 'Maya', 'Inca', 'Olmec'], answer: 2 },
  { topic: 'History', q: 'Who invented the movable-type printing press in Europe around 1440?', options: ['Johannes Gutenberg', 'Galileo Galilei', 'Leonardo da Vinci', 'Isaac Newton'], answer: 0 },
  { topic: 'History', q: 'Which ship famously sank on its maiden voyage in April 1912?', options: ['Lusitania', 'Britannic', 'Titanic', 'Olympic'], answer: 2 },
  { topic: 'History', q: 'The Rosetta Stone helped scholars decipher which ancient script?', options: ['Cuneiform', 'Linear B', 'Egyptian Hieroglyphs', 'Sanskrit'], answer: 2 },
  { topic: 'History', q: 'Which empire was ruled by Augustus as its first emperor?', options: ['Greek', 'Persian', 'Roman', 'Byzantine'], answer: 2 },
  { topic: 'Tech', q: 'How many bits are in a single byte?', options: ['4', '8', '16', '32'], answer: 1 },
  { topic: 'Tech', q: 'What does HTTP stand for on the web?', options: ['HyperText Transfer Protocol', 'High Transmission Text Process', 'Host Terminal Transfer Path', 'Hyperlink Transport Protocol'], answer: 0 },
  { topic: 'Tech', q: 'Who is widely credited as the world’s first computer programmer?', options: ['Alan Turing', 'Grace Hopper', 'Ada Lovelace', 'Charles Babbage'], answer: 2 },
  { topic: 'Tech', q: 'In binary, what decimal number does 1010 represent?', options: ['8', '10', '12', '14'], answer: 1 },
  { topic: 'Nature', q: 'How many hearts does an octopus have?', options: ['1', '2', '3', '4'], answer: 2 },
  { topic: 'Nature', q: 'What is the fastest land animal in short bursts?', options: ['Pronghorn', 'Cheetah', 'Springbok', 'Greyhound'], answer: 1 },
  { topic: 'Nature', q: 'Which mammal is capable of true sustained flight?', options: ['Flying Squirrel', 'Sugar Glider', 'Bat', 'Colugo'], answer: 2 },
  { topic: 'Nature', q: 'What process do plants use to convert sunlight into chemical energy?', options: ['Respiration', 'Photosynthesis', 'Transpiration', 'Fermentation'], answer: 1 },
  { topic: 'Games', q: 'On a standard 6-sided die, what do opposite faces always add up to?', options: ['6', '7', '8', '9'], answer: 1 },
  { topic: 'Games', q: 'How many squares are on a standard chessboard?', options: ['48', '56', '64', '72'], answer: 2 },
  { topic: 'Games', q: 'In chess, which piece is the only one that can jump over other pieces?', options: ['Bishop', 'Rook', 'Queen', 'Knight'], answer: 3 },
  { topic: 'Games', q: 'How many cards are in a standard deck without jokers?', options: ['48', '50', '52', '54'], answer: 2 },
  { topic: 'Culture', q: 'How many strings does a standard concert violin have?', options: ['4', '5', '6', '8'], answer: 0 },
  { topic: 'Culture', q: 'Who painted The Starry Night in 1889?', options: ['Claude Monet', 'Pablo Picasso', 'Vincent van Gogh', 'Paul Cézanne'], answer: 2 },
  { topic: 'Culture', q: 'What Japanese art involves folding paper into decorative shapes?', options: ['Ikebana', 'Origami', 'Kintsugi', 'Bonsai'], answer: 1 },
  { topic: 'Culture', q: 'Which instrument has 88 keys on a standard modern model?', options: ['Harpsichord', 'Accordion', 'Piano', 'Celesta'], answer: 2 },
];
