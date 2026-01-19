import type { ActivityFeedItem } from '../types';

interface ActivityFeedProps {
  items: ActivityFeedItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'player':
        return 'text-emerald-400';
      case 'dealer':
        return 'text-amber-400';
      case 'player3':
        return 'text-purple-400';
      case 'push':
        return 'text-slate-300';
      case 'rebalance':
        return 'text-purple-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-4">
      <div className="text-xs text-slate-300 uppercase tracking-wide mb-3">Activity Feed</div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-slate-600 text-sm text-center py-4">No activity yet</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`
                flex items-center justify-between text-sm py-1.5 px-2 rounded
                ${item.isYou ? 'bg-blue-500/10' : item.isSystem ? 'bg-purple-500/10' : 'bg-slate-800/30'}
              `}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`
                    font-semibold
                    ${item.isYou ? 'text-blue-400' : item.isSystem ? 'text-purple-400' : 'text-slate-300'}
                  `}
                >
                  {item.username}
                </span>
                {!item.isSystem && (
                  <>
                    <span className="text-slate-500">bought</span>
                    <span className={getTypeColor(item.type)}>{item.typeLabel}</span>
                    {item.isSell && <span className="text-slate-500">(sold)</span>}
                  </>
                )}
              </div>
              {!item.isSystem && (
                <span className="text-white font-medium">
                  ${typeof item.amount === 'number' ? item.amount.toFixed(0) : item.amount}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
