import type { Card } from '../types';

interface CardDisplayProps {
  card: Card | null;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CardDisplay({ card, hidden = false, size = 'md' }: CardDisplayProps) {
  const sizeClasses = {
    sm: 'w-12 h-16',
    md: 'w-16 h-24',
    lg: 'w-20 h-28',
  };

  if (hidden || !card) {
    return (
      <div
        className={`
          ${sizeClasses[size]}
          rounded-xl flex items-center justify-center transition-all duration-300 relative
          bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-dashed border-slate-500
          shadow-lg shadow-black/30
        `}
      >
        <span className="text-slate-300 text-3xl font-bold">?</span>
      </div>
    );
  }

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitColor = isRed ? 'text-red-400' : 'text-white';

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-xl flex items-center justify-center transition-all duration-300 relative
        bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600
        shadow-lg shadow-black/30
      `}
    >
      {/* Small suit in top-left corner */}
      <span className={`absolute top-1 left-1.5 ${suitColor} text-xs font-bold opacity-80`}>
        {suitSymbols[card.suit]}
      </span>
      {/* Large rank in center */}
      <span className={`text-white text-3xl font-bold tracking-tight tabular-nums ${suitColor}`}>
        {rankMap[card.rank]}
      </span>
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
