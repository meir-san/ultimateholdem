import type { RoundHistoryItem } from '../types';

interface RoundHistoryProps {
  roundHistory: RoundHistoryItem[];
}

export function RoundHistory({ roundHistory }: RoundHistoryProps) {
  if (roundHistory.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-2">
      <div className="flex items-center gap-4 text-sm">
        {roundHistory.map((item, index) => {
          const isPlayer = item.winner === 'player';
          const isDealer = item.winner === 'dealer';
          
          return (
            <div key={index} className="flex items-center gap-2">
              <span
                className={`font-semibold ${
                  isPlayer
                    ? 'text-emerald-400'
                    : isDealer
                      ? 'text-amber-400'
                      : 'text-slate-400'
                }`}
              >
                {isPlayer ? 'Player' : isDealer ? 'Dealer' : 'Push'}
              </span>
              <span className="text-slate-500">-</span>
              <span className="text-slate-300">{item.handDescription}</span>
              {index < roundHistory.length - 1 && (
                <span className="text-slate-600 mx-1">•</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
