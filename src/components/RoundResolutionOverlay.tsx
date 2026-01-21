import type { RoundHistoryItem } from '../types';
import { CardDisplay } from './CardDisplay';

const winnerLabel: Record<RoundHistoryItem['winner'], string> = {
  player1: 'Player 1',
  player2: 'Player 2',
  player3: 'Player 3',
  push: 'Push',
};

interface RoundResolutionOverlayProps {
  item: RoundHistoryItem;
  onClose: () => void;
}

export function RoundResolutionOverlay({ item, onClose }: RoundResolutionOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <div className="text-sm uppercase tracking-wide text-slate-400">Round Resolution</div>
            <div className="text-lg font-semibold text-white">
              {winnerLabel[item.winner]} — {item.handDescription}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 px-6 py-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">Player 1</div>
              <div className="flex justify-center gap-2">
                {item.player1Cards.map((card, index) => (
                  <CardDisplay key={index} card={card} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">Player 2</div>
              <div className="flex justify-center gap-2">
                {item.player2Cards.map((card, index) => (
                  <CardDisplay key={index} card={card} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-400">Player 3</div>
              <div className="flex justify-center gap-2">
                {item.player3Cards.map((card, index) => (
                  <CardDisplay key={index} card={card} />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Community Cards</div>
            <div className="flex justify-center gap-2">
              {item.communityCards.map((card, index) => (
                <CardDisplay key={index} card={card} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
