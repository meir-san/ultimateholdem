import { PHASES } from '../config/constants';
import { PREDICTION_WINDOW } from '../config/constants';
import type { Phase } from '../config/constants';

interface PhaseTimerProps {
  phase: Phase;
  timer: number;
  marketLocked: boolean;
  getPhaseLabel: () => string;
  getNextAction: () => string;
}

export function PhaseTimer({
  phase,
  timer,
  marketLocked,
  getPhaseLabel,
  getNextAction,
}: PhaseTimerProps) {
  const getTimerLabel = () => {
    if (phase === PHASES.RESOLUTION) return 'Round Complete';
    if (marketLocked) return '🔒 Market Locked';
    if (phase === PHASES.PRE_DEAL) return 'Cards Dealing Soon';
    if (phase === PHASES.PLAYER_CARD_1) return 'Dealer Card Coming';
    if (phase === PHASES.DEALER_CARD_1) return 'Player Card Coming';
    return 'Bets Lock In';
  };

  const getTimerColor = () => {
    if (phase === PHASES.RESOLUTION) return 'text-slate-400';
    if (marketLocked) return 'text-purple-400';
    if (timer <= 5) return 'text-red-400';
    if (timer <= 10) return 'text-amber-400';
    return 'text-white';
  };

  const getProgressBarColor = () => {
    if (marketLocked) return 'bg-purple-500';
    if (timer <= 5) return 'bg-red-500';
    if (timer <= 10) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div
      className={`bg-slate-900/80 rounded-2xl border p-4 mb-3 transition-all ${
        marketLocked ? 'border-purple-500/50 ring-1 ring-purple-500/20' : 'border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-300 uppercase tracking-wide">Current Phase</div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            {getPhaseLabel()}
            {marketLocked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                LOCKED
              </span>
            )}
          </div>
          {phase !== PHASES.RESOLUTION && !marketLocked && (
            <div className="text-xs text-slate-300">Next: {getNextAction()}</div>
          )}
          {marketLocked && (
            <div className="text-xs text-purple-300">Outcome determined • Resolving...</div>
          )}
        </div>
        <div className="text-right min-w-[100px]">
          <div
            className={`text-xs uppercase tracking-wide ${
              marketLocked
                ? 'text-purple-400'
                : timer <= 10 && phase !== PHASES.RESOLUTION
                  ? timer <= 5
                    ? 'text-red-400'
                    : 'text-amber-400'
                  : 'text-slate-300'
            }`}
          >
            {getTimerLabel()}
          </div>
          <div className={`text-4xl font-black tabular-nums ${getTimerColor()}`}>
            {phase === PHASES.RESOLUTION ? '—' : marketLocked ? '🔒' : timer}
          </div>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${getProgressBarColor()}`}
          style={{
            width: phase === PHASES.RESOLUTION ? '0%' : `${(timer / PREDICTION_WINDOW) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
