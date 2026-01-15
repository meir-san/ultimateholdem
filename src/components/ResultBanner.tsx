import type { Outcome, Pool } from '../types';
import { PLATFORM_FEE } from '../config/constants';

interface ResultBannerProps {
  roundResult: Outcome;
  pool: Pool;
  totalPool: number;
  totalMyBets: number;
  roundProfit: number | null;
  myBetTotal: number;
  payout: number;
}

export function ResultBanner({
  roundResult,
  pool,
  totalPool,
  totalMyBets,
  roundProfit,
  myBetTotal,
  payout,
}: ResultBannerProps) {
  const messages = {
    player: {
      text: 'PLAYER WINS',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
    },
    dealer: {
      text: 'DEALER WINS',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
    },
    push: {
      text: 'PUSH',
      color: 'text-slate-300',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
    },
  };

  const { text, color, bg, border } = messages[roundResult];
  const winningPool = pool[roundResult];

  return (
    <div className={`${bg} border ${border} rounded-2xl p-8 text-center backdrop-blur`}>
      <div className={`text-4xl font-black ${color} mb-2`}>{text}</div>
      <div className="text-base text-slate-300">
        ${winningPool.toLocaleString()} pool splits ${(totalPool * (1 - PLATFORM_FEE)).toFixed(0)} pot
      </div>
      {totalMyBets > 0 && (
        <div className={`text-3xl font-bold mt-6 ${roundProfit && roundProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {roundProfit && roundProfit >= 0 ? `+$${roundProfit.toFixed(2)}` : `-$${Math.abs(roundProfit || 0).toFixed(2)}`}
        </div>
      )}
      {myBetTotal > 0 && (
        <div className="text-base text-emerald-400 mt-2">
          Your ${myBetTotal} bet paid ${payout.toFixed(2)}!
        </div>
      )}
    </div>
  );
}
