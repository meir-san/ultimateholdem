import type { Pool } from '../types';

interface BettingRowProps {
  type: 'player1' | 'player2' | 'player3' | 'push';
  label: string;
  impliedOdds: number;
  pool: Pool;
  canBet: boolean;
  marketLocked: boolean;
  selectedBetAmount: number;
  hasPosition: boolean;
  isProcessing?: boolean;
  shares: number;
  amountPaid: number;
  winPayout: number;
  currentValue: number;
  pnl: number;
  onPlaceBet: () => void;
  onSellPosition: () => void;
}

export function BettingRow({
  type,
  label,
  impliedOdds,
  pool,
  canBet,
  marketLocked,
  selectedBetAmount,
  hasPosition,
  isProcessing,
  shares,
  amountPaid,
  winPayout,
  currentValue,
  pnl,
  onPlaceBet,
  onSellPosition,
}: BettingRowProps) {
  const colors = {
    player1: {
      dot: 'bg-emerald-500',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      btn: 'bg-emerald-600 hover:bg-emerald-500',
      ring: 'ring-emerald-500',
    },
    player2: {
      dot: 'bg-amber-500',
      text: 'text-amber-400',
      bg: 'bg-amber-500/15',
      btn: 'bg-amber-600 hover:bg-amber-500',
      ring: 'ring-amber-500',
    },
    player3: {
      dot: 'bg-purple-500',
      text: 'text-purple-400',
      bg: 'bg-purple-500/15',
      btn: 'bg-purple-600 hover:bg-purple-500',
      ring: 'ring-purple-500',
    },
    push: {
      dot: 'bg-slate-400',
      text: 'text-slate-300',
      bg: 'bg-slate-400/15',
      btn: 'bg-slate-600 hover:bg-slate-500',
      ring: 'ring-slate-400',
    },
  };

  const c = colors[type];
  const outline = hasPosition;
  const canPlaceBet = canBet && !isProcessing && impliedOdds > 0;

  return (
    <div
      className={`
        py-4 px-4 transition-colors rounded-lg mx-1 my-1.5
        ${outline ? `ring-2 ${c.ring} bg-slate-800/60` : 'bg-slate-900/60 hover:bg-slate-800/60'}
      `}
    >
      {/* Row 1: Outcome, Price, Volume, Buy Button */}
      <div className="flex items-center justify-between">
        {/* Outcome name */}
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${c.dot}`} />
          <span className="font-semibold text-white text-sm">{label}</span>
        </div>

        {/* Pills: Price + Volume */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-full ${c.bg} flex items-center gap-2 ring-1 ring-inset ring-white/10`}>
            <span className={`text-xl font-black ${c.text} tabular-nums`}>{impliedOdds.toFixed(1)}¢</span>
            <span className="text-xs text-slate-300">price</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-slate-600/50 flex items-center gap-1.5">
            <span className="text-sm text-white font-medium">${pool[type].toLocaleString()}</span>
            <span className="text-xs text-slate-300">vol</span>
          </div>
        </div>

        {/* Buy Button */}
        <button
          onClick={onPlaceBet}
          disabled={!canPlaceBet}
          aria-disabled={!canPlaceBet}
          aria-label={marketLocked ? 'Market locked' : `Buy $${selectedBetAmount} on ${label} at ${impliedOdds.toFixed(1)} cents`}
          className={`
            px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
            ${
              canPlaceBet
                ? `${c.btn} text-white focus:ring-current`
                : marketLocked
                  ? 'bg-purple-900/50 text-purple-400 cursor-not-allowed focus:ring-purple-600'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed focus:ring-slate-600'
            }
          `}
        >
          {marketLocked ? '🔒 LOCKED' : isProcessing ? '⏳ PROCESSING' : `BUY $${selectedBetAmount}`}
        </button>
      </div>

      {/* Row 2: Position Details (only if has position) */}
      {hasPosition && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-600/50">
          {/* Position Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 rounded-md bg-slate-600/60 text-xs">
              <span className="text-slate-300">Shares:</span>
              <span className="text-white font-medium ml-1">{shares.toFixed(1)}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-slate-600/60 text-xs">
              <span className="text-slate-300">Paid:</span>
              <span className="text-white font-medium ml-1">${amountPaid}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-blue-500/20 text-xs">
              <span className="text-slate-300">Win:</span>
              <span className="text-blue-400 font-medium ml-1">${winPayout.toFixed(0)}</span>
            </div>
          </div>

          {/* Sell Button with P&L */}
          <button
            onClick={onSellPosition}
            aria-label={`Sell ${label} position for $${currentValue.toFixed(0)}, ${pnl >= 0 ? 'profit' : 'loss'} of $${Math.abs(pnl).toFixed(0)}`}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
              ${
                pnl >= 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-400'
                  : 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-400'
              }
            `}
          >
            Sell ${currentValue.toFixed(0)} <span className="opacity-80">({pnl >= 0 ? '+$' : '-$'}{Math.abs(pnl).toFixed(0)})</span>
          </button>
        </div>
      )}
    </div>
  );
}
