import type { PriceHistoryPoint } from '../types';

interface PriceChartProps {
  priceHistory: PriceHistoryPoint[];
  hasPlayerPosition: boolean;
  hasDealerPosition: boolean;
  hasPushPosition: boolean;
}

export function PriceChart({
  priceHistory,
  hasPlayerPosition,
  hasDealerPosition,
  hasPushPosition,
}: PriceChartProps) {
  if (priceHistory.length < 2) {
    return (
      <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-5">
        <div className="text-xs text-slate-300 uppercase tracking-wide mb-4">Live Market Price</div>
        <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
          Waiting for market activity...
        </div>
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const padding = { top: 15, right: 55, bottom: 25, left: 15 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minY = 0;
  const maxY = 100;

  const generatePath = (key: 'player' | 'dealer' | 'push') => {
    return priceHistory
      .map((point, i) => {
        const x = padding.left + (i / (priceHistory.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((point[key] - minY) / (maxY - minY)) * chartHeight;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const currentPrices = priceHistory[priceHistory.length - 1];

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-4 flex-1">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold text-white">Live Market Price</span>
          <span className="text-xs text-slate-300 ml-2">Share price over time</span>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-4 h-1 rounded-full bg-emerald-400 ${
                hasPlayerPosition ? 'ring-2 ring-emerald-400/50' : ''
              }`}
            />
            <span className={hasPlayerPosition ? 'text-emerald-300 font-semibold' : 'text-emerald-400'}>
              Player 1 {hasPlayerPosition && '●'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-4 h-1 rounded-full bg-amber-400 ${
                hasDealerPosition ? 'ring-2 ring-amber-400/50' : ''
              }`}
            />
            <span className={hasDealerPosition ? 'text-amber-300 font-semibold' : 'text-amber-400'}>
              Player 2 {hasDealerPosition && '●'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-4 h-1 rounded-full bg-slate-400 ${
                hasPushPosition ? 'ring-2 ring-slate-400/50' : ''
              }`}
            />
            <span className={hasPushPosition ? 'text-slate-200 font-semibold' : 'text-slate-400'}>
              Push {hasPushPosition && '●'}
            </span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
        <defs>
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-slate" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((val) => {
          const y = padding.top + chartHeight - ((val * 100 - minY) / (maxY - minY)) * chartHeight;
          return (
            <g key={val}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray={val === 0.5 ? '4' : '2'}
              />
              <text x={padding.left - 5} y={y + 3} fill="#64748b" fontSize="8" textAnchor="end">
                {(val * 100).toFixed(0)}¢
              </text>
            </g>
          );
        })}

        {/* Player line */}
        <path
          d={generatePath('player')}
          fill="none"
          stroke="#34d399"
          strokeWidth={hasPlayerPosition ? '4' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={hasPlayerPosition ? 'url(#glow-green)' : undefined}
          opacity={hasPlayerPosition ? 1 : 0.7}
        />

        {/* Dealer line */}
        <path
          d={generatePath('dealer')}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={hasDealerPosition ? '4' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={hasDealerPosition ? 'url(#glow-amber)' : undefined}
          opacity={hasDealerPosition ? 1 : 0.7}
        />

        {/* Push line */}
        <path
          d={generatePath('push')}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={hasPushPosition ? '4' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={hasPushPosition ? 'url(#glow-slate)' : undefined}
          opacity={hasPushPosition ? 1 : 0.7}
        />

        {/* Current value dots and labels */}
        {currentPrices && (
          <>
            <circle
              cx={width - padding.right}
              cy={padding.top + chartHeight - ((currentPrices.player - minY) / (maxY - minY)) * chartHeight}
              r={hasPlayerPosition ? '6' : '4'}
              fill="#34d399"
              filter={hasPlayerPosition ? 'url(#glow-green)' : undefined}
            />
            <text
              x={width - padding.right + 8}
              y={padding.top + chartHeight - ((currentPrices.player - minY) / (maxY - minY)) * chartHeight + 3}
              fill="#34d399"
              fontSize={hasPlayerPosition ? '11' : '10'}
              fontWeight="bold"
            >
              {currentPrices.player.toFixed(0)}¢
            </text>

            <circle
              cx={width - padding.right}
              cy={padding.top + chartHeight - ((currentPrices.dealer - minY) / (maxY - minY)) * chartHeight}
              r={hasDealerPosition ? '6' : '4'}
              fill="#fbbf24"
              filter={hasDealerPosition ? 'url(#glow-amber)' : undefined}
            />
            <text
              x={width - padding.right + 8}
              y={padding.top + chartHeight - ((currentPrices.dealer - minY) / (maxY - minY)) * chartHeight + 3}
              fill="#fbbf24"
              fontSize={hasDealerPosition ? '11' : '10'}
              fontWeight="bold"
            >
              {currentPrices.dealer.toFixed(0)}¢
            </text>

            <circle
              cx={width - padding.right}
              cy={padding.top + chartHeight - ((currentPrices.push - minY) / (maxY - minY)) * chartHeight}
              r={hasPushPosition ? '6' : '4'}
              fill="#94a3b8"
              filter={hasPushPosition ? 'url(#glow-slate)' : undefined}
            />
            <text
              x={width - padding.right + 8}
              y={padding.top + chartHeight - ((currentPrices.push - minY) / (maxY - minY)) * chartHeight + 3}
              fill="#94a3b8"
              fontSize={hasPushPosition ? '11' : '10'}
              fontWeight="bold"
            >
              {currentPrices.push.toFixed(0)}¢
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
