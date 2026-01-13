import { useGameStore } from '../stores/gameStore';

export function DeckStats() {
  const deck = useGameStore((state) => state.deck);

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4">
      <div className="text-xs text-slate-300 uppercase tracking-wide mb-3">Deck Stats</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-white">{deck.length}</div>
          <div className="text-xs text-slate-300">remaining</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-white">{deck.filter((c) => c === 10).length}</div>
          <div className="text-xs text-slate-300">tens</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-white">{deck.filter((c) => c >= 2 && c <= 6).length}</div>
          <div className="text-xs text-slate-300">low (2-6)</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-white">{deck.filter((c) => c === 1).length}</div>
          <div className="text-xs text-slate-300">aces</div>
        </div>
      </div>
    </div>
  );
}
