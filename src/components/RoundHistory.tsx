import type { RoundHistoryItem } from '../types';

interface RoundHistoryProps {
  roundHistory: RoundHistoryItem[];
  onSelect: (item: RoundHistoryItem) => void;
}

export function RoundHistory({ roundHistory, onSelect }: RoundHistoryProps) {
  if (roundHistory.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-2">
      <div className="flex items-center gap-4 text-sm">
        {roundHistory.map((item, index) => {
          const isPlayer1 = item.winner === 'player1';
          const isPlayer2 = item.winner === 'player2';
          const isPlayer3 = item.winner === 'player3';
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(item)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-800/60"
              aria-label="View round resolution"
            >
              <span
                className={`font-semibold ${
                  isPlayer1
                    ? 'text-emerald-400'
                    : isPlayer2
                      ? 'text-amber-400'
                      : isPlayer3
                        ? 'text-purple-400'
                        : 'text-slate-400'
                }`}
              >
                {isPlayer1 ? 'Player 1' : isPlayer2 ? 'Player 2' : isPlayer3 ? 'Player 3' : 'Push'}
              </span>
              <span className="text-slate-500">-</span>
              <span className="text-slate-300">{item.handDescription}</span>
              {index < roundHistory.length - 1 && (
                <span className="text-slate-600 mx-1">•</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
