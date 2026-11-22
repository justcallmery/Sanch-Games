import React from 'react';
import { GameDefinition } from '../games/types';

export const GameArtwork: React.FC<{ game: GameDefinition; size?: 'sm' | 'lg' }> = ({
  game,
  size = 'sm',
}) => {
  const cls = size === 'lg' ? 'w-16 h-16' : 'w-11 h-11';

  const renderGlyph = () => {
    switch (game.id) {
      case 'snake':
        return (
          <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M5 16h6a2 2 0 002-2v-4a2 2 0 012-2h4" />
            <circle cx="19" cy="8" r="1.5" fill="currentColor" />
            <circle cx="7" cy="9" r="2" fill="currentColor" />
          </g>
        );
      case 'brick-breaker':
        return (
          <g stroke="currentColor" strokeWidth="1.8" fill="none">
            <rect x="4" y="5" width="7" height="3.5" rx="1" fill="currentColor" />
            <rect x="13" y="5" width="7" height="3.5" rx="1" fill="currentColor" />
            <circle cx="12" cy="13" r="2" fill="currentColor" />
            <rect x="7" y="18" width="10" height="2.5" rx="1.2" fill="currentColor" />
          </g>
        );
      case 'flappy-hop':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M5 13c3-5 10-5 13 0l2-1-2 3c-3 4-9 4-13-2z" />
            <circle cx="14" cy="11.5" r="1" fill="currentColor" />
          </g>
        );
      case 'space-blaster':
      case 'meteor-dodge':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M12 4l5 12-5-2-5 2 5-12z" />
            <path d="M12 18v2" />
          </g>
        );
      case 'pong-duel':
        return (
          <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M5 6v6M19 12v6" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </g>
        );
      case 'tap-target':
      case 'whack-critter':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          </g>
        );
      case 'game-2048':
      case 'sliding-15':
        return (
          <g stroke="currentColor" strokeWidth="1.8" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.25" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" />
          </g>
        );
      case 'minesweeper':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
            <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" />
          </g>
        );
      case 'sudoku-9':
      case 'sudoku-6':
      case 'kakuro':
      case 'kenken':
        return (
          <g stroke="currentColor" strokeWidth="1.8" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" />
          </g>
        );
      case 'lights-out':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M9 17h6M10 20h4M12 4a5 5 0 00-3 9v2h6v-2a5 5 0 00-3-9z" />
          </g>
        );
      case 'chess':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M7 19h10M8 16l1-6-2-2 2-3 3 1 3-1 2 3-2 2 1 6H8z" />
          </g>
        );
      case 'connect-four':
      case 'reversi':
      case 'checkers':
      case 'gomoku':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <circle cx="8.5" cy="8.5" r="3" fill="currentColor" />
            <circle cx="15.5" cy="15.5" r="3" />
            <circle cx="15.5" cy="8.5" r="2.5" />
          </g>
        );
      case 'tic-tac-toe':
      case 'ultimate-ttt':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M5 5l5 5M10 5l-5 5" />
            <circle cx="16.5" cy="16.5" r="3" />
          </g>
        );
      case 'yacht-dice':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
            <circle cx="9" cy="9" r="1.2" fill="currentColor" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
            <circle cx="15" cy="15" r="1.2" fill="currentColor" />
          </g>
        );
      case 'pipe-connect':
        return (
          <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M4 8h6a2 2 0 012 2v4a2 2 0 002 2h6" />
          </g>
        );
      case 'reaction-timer':
      case 'math-sprint':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M13 3L6 14h6l-1 7 7-11h-6l1-7z" />
          </g>
        );
      default:
        break;
    }

    switch (game.category) {
      case 'arcade':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <rect x="4" y="7" width="16" height="10" rx="3" />
            <path d="M8 10v4M6 12h4" />
            <circle cx="15.5" cy="11" r="1" fill="currentColor" />
            <circle cx="17.5" cy="13" r="1" fill="currentColor" />
          </g>
        );
      case 'puzzle':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1.5" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" />
            <path d="M13 16.5h7M16.5 13v7" />
          </g>
        );
      case 'board':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M9.5 4v16M14.5 4v16M4 9.5h16M4 14.5h16" />
          </g>
        );
      case 'cards':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <rect x="6" y="3.5" width="12" height="17" rx="2" />
            <path d="M12 8.5l2.5 3.5-2.5 3.5-2.5-3.5L12 8.5z" fill="currentColor" />
          </g>
        );
      case 'word':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <rect x="3.5" y="6" width="17" height="12" rx="2" />
            <path d="M7.5 15l2.2-6h.6l2.2 6M8.2 13h3M14.5 9.5v5.5" />
          </g>
        );
      case 'brain':
        return (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l3 2" />
          </g>
        );
    }
  };

  return (
    <div
      className={`${cls} rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm`}
      style={{ backgroundColor: game.accent }}
    >
      <svg viewBox="0 0 24 24" className="w-3/5 h-3/5" aria-hidden="true">
        {renderGlyph()}
      </svg>
    </div>
  );
};
