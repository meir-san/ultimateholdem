import type { Card } from '../types';
import { cardToString } from '../utils/cardUtils';

interface CardDisplayProps {
  card: Card | null;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CardDisplay({ card, hidden = false, size = 'md' }: CardDisplayProps) {
  const sizeClasses = {
    sm: 'w-12 h-16 text-lg',
    md: 'w-16 h-24 text-xl',
    lg: 'w-20 h-28 text-2xl',
  };

  if (hidden || !card) {
    return (
      <div
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-br from-slate-700 to-slate-900
          border-2 border-slate-600 rounded-lg
          flex items-center justify-center
          shadow-lg
        `}
      >
        <div className="text-slate-500 text-2xl">🂠</div>
      </div>
    );
  }

  const suitColors = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-slate-800',
    spades: 'text-slate-800',
  };

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <div
      className={`
        ${sizeClasses[size]}
        bg-white border-2 ${isRed ? 'border-red-500' : 'border-slate-800'} rounded-lg
        flex flex-col items-center justify-center
        shadow-lg font-bold
        ${suitColors[card.suit]}
      `}
    >
      <div className="text-center">
        <div className="leading-tight">{rankMap[card.rank]}</div>
        <div className="text-2xl">{suitSymbols[card.suit]}</div>
      </div>
    </div>
  );
}

interface CardRowProps {
  cards: Card[];
  label?: string;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CardRow({ cards, label, hidden = false, size = 'md' }: CardRowProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          {label}
        </div>
      )}
      <div className="flex gap-2">
        {cards.map((card, index) => (
          <CardDisplay key={index} card={card} hidden={hidden} size={size} />
        ))}
      </div>
    </div>
  );
}
