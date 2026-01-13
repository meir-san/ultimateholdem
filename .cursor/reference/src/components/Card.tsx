interface CardProps {
  value?: number;
  hidden?: boolean;
}

export function Card({ value = 0, hidden = false }: CardProps) {
  // Determine face card letter (J, Q, K)
  const getFaceCardLetter = (val: number): string | null => {
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return null;
  };

  const faceCardLetter = value ? getFaceCardLetter(value) : null;
  const displayValue = value === 1 ? 'A' : value === 11 || value === 12 || value === 13 ? 10 : value;

  return (
    <div
      className={`
        w-16 h-24 rounded-xl flex items-center justify-center transition-all duration-300 relative
        ${
          hidden
            ? 'bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-dashed border-slate-500'
            : 'bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 shadow-lg shadow-black/30'
        }
      `}
    >
      {hidden ? (
        <span className="text-slate-300 text-3xl font-bold">?</span>
      ) : (
        <>
          {/* Small letter in top-left corner for face cards */}
          {faceCardLetter && (
            <span className="absolute top-1 left-1.5 text-white text-xs font-bold opacity-80">
              {faceCardLetter}
            </span>
          )}
          {/* Large number in center */}
          <span className="text-white text-3xl font-bold tracking-tight tabular-nums">
            {displayValue}
          </span>
        </>
      )}
    </div>
  );
}
