import type { Card } from '../types';
import { CardDisplay, CardRow } from './CardDisplay';
import { PHASES } from '../config/constants';

interface GameBoardProps {
  player1Cards: Card[];
  player2Cards: Card[];
  player3Cards: Card[];
  communityCards: Card[];
  phase: string;
  playerFolded: boolean;
}

export function GameBoard({
  player1Cards,
  player2Cards,
  player3Cards,
  communityCards,
  phase,
  playerFolded,
}: GameBoardProps) {
  const showDealerCards = phase === PHASES.DEALER_CARDS || phase === PHASES.RESOLUTION;
  const showCommunity = communityCards.length > 0;

  const getPhaseLabel = () => {
    switch (phase) {
      case PHASES.PRE_DEAL:
        return 'Pre-Deal';
      case PHASES.PLAYER_CARDS:
        return 'Player 1 Cards';
      case PHASES.FLOP:
        return 'Flop';
      case PHASES.TURN:
        return 'Turn';
      case PHASES.RIVER:
        return 'River';
      case PHASES.DEALER_CARDS:
        return 'Player 2 / Player 3 Cards';
      case PHASES.RESOLUTION:
        return 'Resolution';
      default:
        return '';
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-6">
      <div className="text-center mb-6">
        <div className="text-lg font-bold text-white mb-1">{getPhaseLabel()}</div>
        {playerFolded && (
          <div className="text-red-400 text-sm font-semibold">Player 1 Folded</div>
        )}
      </div>

      <div className="flex flex-col items-center gap-8">
        {/* Player 2 Cards */}
        <CardRow
          cards={player2Cards}
          label="Player 2"
          hidden={!showDealerCards}
          size="md"
        />

        {/* Player 3 Cards */}
        <CardRow
          cards={player3Cards}
          label="Player 3"
          hidden={!showDealerCards}
          size="md"
        />

        {/* Community Cards */}
        {showCommunity && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Community Cards
            </div>
            <div className="flex gap-2">
              {communityCards.map((card, index) => (
                <CardDisplay key={index} card={card} size="md" />
              ))}
            </div>
          </div>
        )}

        {/* Player Cards */}
        <CardRow
          cards={player1Cards}
          label="Player 1"
          hidden={false}
          size="md"
        />
      </div>
    </div>
  );
}
