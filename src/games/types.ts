export type GameCategory = 'arcade' | 'puzzle' | 'board' | 'cards' | 'word' | 'brain';

export type ControlScheme =
  | 'dpad'
  | 'dpad-action'
  | 'leftright'
  | 'tap'
  | 'board'
  | 'keyboard';

export interface GameDefinition {
  id: string;
  title: string;
  category: GameCategory;
  tagline: string;
  rules: string;
  controlsHint: string;
  controlScheme: ControlScheme;
  scoreUnit: 'pts' | 'wins' | 'ms' | 'moves' | 'streak';
  higherIsBetter: boolean;
  supports2P?: boolean;
  accent: string;
}

export interface GameRuntimeProps {
  game: GameDefinition;
  isLandscape: boolean;
  isPaused: boolean;
  restartNonce: number;
  twoPlayer: boolean;
  onScoreChange: (score: number, label?: string) => void;
  onGameEnd: (result: { won: boolean; score: number; summary: string }) => void;
  controlInputRef?: React.MutableRefObject<VirtualControlState>;
}

export interface VirtualControlState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
  justAction: boolean;
  justDir: 'up' | 'down' | 'left' | 'right' | null;
}

export const CATEGORY_LABELS: Record<GameCategory | 'all', string> = {
  all: 'All 54',
  arcade: 'Arcade',
  puzzle: 'Puzzles',
  board: 'Board',
  cards: 'Cards',
  word: 'Word & Trivia',
  brain: 'Brain & Math',
};
