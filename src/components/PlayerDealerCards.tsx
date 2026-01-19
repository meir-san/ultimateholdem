import type { Card } from '../types';
import { HandRank } from '../types';
import { CardDisplay } from './CardDisplay';
import { PHASES } from '../config/constants';
import type { Phase } from '../config/constants';
import { evaluateHand } from '../utils/pokerHands';

function rankToString(rank: number): string {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };
  return rankMap[rank] || '?';
}

/**
 * Gets hole card information for mid-game display
 * Shows what the player actually has from their hole cards, not the full board evaluation
 * If high card is on board, shows kicker instead
 */
function getHoleCardDescription(holeCards: Card[], communityCards: Card[]): string {
  if (holeCards.length === 0) {
    return '—';
  }

  if (holeCards.length === 1) {
    // If no board, show high card
    if (communityCards.length === 0) {
      return `${rankToString(holeCards[0].rank)} High`;
    }
    // If board exists, check if board has higher card
    const boardMax = Math.max(...communityCards.map(c => c.rank));
    if (holeCards[0].rank > boardMax) {
      return `${rankToString(holeCards[0].rank)} High`;
    } else {
      return `${rankToString(holeCards[0].rank)} Kicker`;
    }
  }

  const holeRanks = holeCards.map(c => c.rank);
  const sortedHole = [...holeCards].sort((a, b) => b.rank - a.rank);
  const sortedBoard = [...communityCards].sort((a, b) => b.rank - a.rank);

  // Build rank counts for all cards
  const allCards = [...holeCards, ...communityCards];
  const rankCounts = new Map<number, number>();
  for (const card of allCards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
  }

  // If we have 5+ cards, evaluate the actual hand first
  if (allCards.length >= 5) {
    try {
      const hand = evaluateHand(allCards);
      
      // Check what part of this hand involves hole cards
      switch (hand.rank) {
        case HandRank.ROYAL_FLUSH:
        case HandRank.STRAIGHT_FLUSH:
        case HandRank.FLUSH:
        case HandRank.STRAIGHT:
          // These hands use board cards, show highest hole card as kicker
          return `${rankToString(sortedHole[0].rank)} Kicker`;
        
        case HandRank.FOUR_OF_KIND:
          // Always show four of a kind - this is what the player actually has
          const quadRank = hand.kickers![0];
          return `Four of a Kind ${rankToString(quadRank)}`;
        
        case HandRank.FULL_HOUSE:
          // Always show full house - this is what the player actually has
          const tripsRank = hand.kickers![0];
          return `Full House ${rankToString(tripsRank)}`;
        
        case HandRank.THREE_OF_KIND:
          // Always show trips - this is what the player actually has
          const tripRank = hand.kickers![0];
          return `Three of a Kind ${rankToString(tripRank)}`;
        
        case HandRank.TWO_PAIR:
          // Always show two pair - this is what the player actually has
          const highPair = hand.kickers![0];
          return `Two Pair ${rankToString(highPair)}`;
        
        case HandRank.PAIR:
          // Always show the pair - this is what the player actually has
          // Even if the pair is on the board, the player still has that hand
          const pairRank2 = hand.kickers![0];
          return `Pair of ${rankToString(pairRank2)}`;
        
        case HandRank.HIGH_CARD:
        default:
          // Check if high card is from hole cards
          const highCardRank = hand.cards[0].rank;
          if (holeRanks.includes(highCardRank)) {
            return `${rankToString(highCardRank)} High`;
          }
          // High card is on board, show highest hole card as kicker
          return `${rankToString(sortedHole[0].rank)} Kicker`;
      }
    } catch (e) {
      // Fall through to manual checks if evaluation fails
    }
  }

  // For less than 5 cards, do manual checks
  // Check for trips/quads FIRST (before pairs) - prioritize higher hands
  const trips: number[] = [];
  const quads: number[] = [];
  for (const holeRank of holeRanks) {
    const count = rankCounts.get(holeRank) || 0;
    if (count === 4) {
      quads.push(holeRank);
    } else if (count === 3) {
      trips.push(holeRank);
    }
  }
  
  // Check for full house: trips + pair (both involving hole cards or one from hole)
  if (trips.length > 0 || quads.length > 0) {
    // Check if there's also a pair (for full house)
    const pairs: number[] = [];
    for (const [rank, count] of rankCounts.entries()) {
      if (count >= 2 && rank !== trips[0] && rank !== quads[0]) {
        pairs.push(rank);
      }
    }
    
    if (quads.length > 0) {
      const highestQuad = Math.max(...quads);
      return `Four of a Kind ${rankToString(highestQuad)}`;
    }
    
    if (trips.length > 0 && pairs.length > 0) {
      // Full house: trips from hole + pair (could be from board or hole)
      const highestTrip = Math.max(...trips);
      return `Full House ${rankToString(highestTrip)}`;
    }
    
    if (trips.length > 0) {
      const highestTrip = Math.max(...trips);
      return `Three of a Kind ${rankToString(highestTrip)}`;
    }
  }

  // Find all pairs
  const pairs: number[] = [];
  for (const [rank, count] of rankCounts.entries()) {
    if (count >= 2) {
      pairs.push(rank);
    }
  }

  // Check for two pair (at least 2 pairs total, and at least one involves a hole card)
  if (pairs.length >= 2) {
    const holePairs = pairs.filter(pairRank => holeRanks.includes(pairRank));
    if (holePairs.length > 0) {
      // Return the highest pair that involves a hole card
      const highestHolePair = Math.max(...holePairs);
      return `Two Pair ${rankToString(highestHolePair)}`;
    }
  }

  // Check for single pair - find ALL pairs involving hole cards and return the highest
  const holePairsWithBoard: number[] = [];
  for (const holeRank of holeRanks) {
    const count = rankCounts.get(holeRank) || 0;
    if (count >= 2) {
      holePairsWithBoard.push(holeRank);
    }
  }
  if (holePairsWithBoard.length > 0) {
    // Return the highest pair
    const highestPair = Math.max(...holePairsWithBoard);
    return `Pair of ${rankToString(highestPair)}`;
  }

  // No pairs - check if high card is on board or in hand
  if (communityCards.length === 0) {
    // No board yet, show high card from hole cards
    return `${rankToString(sortedHole[0].rank)} High`;
  }

  // Board exists - check if board has higher card than hole cards
  const highestBoard = sortedBoard[0].rank;
  const highestHole = sortedHole[0].rank;

  if (highestHole > highestBoard) {
    // Player's hole card is the high card
    return `${rankToString(highestHole)} High`;
  } else {
    // Board has the high card, show player's kicker (highest hole card)
    return `${rankToString(highestHole)} Kicker`;
  }
}

/**
 * Gets full hand description for resolution display
 * Shows the complete 5-card hand evaluation
 */
function getFullHandDescription(cards: Card[], communityCards: Card[]): string {
  // Single card only
  if (cards.length === 1 && communityCards.length === 0) {
    return `${rankToString(cards[0].rank)} High`;
  }

  const allCards = [...cards, ...communityCards];

  // For less than 5 cards, manually check for pairs/trips/quads
  if (allCards.length < 5) {
    const rankCounts = new Map<number, number>();
    for (const card of allCards) {
      rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    }

    // Sort by count (descending) then rank (descending)
    const sortedRanks = Array.from(rankCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count first
        return b[0] - a[0]; // Then by rank
      });

    const [topRank, topCount] = sortedRanks[0];
    const highestOther = sortedRanks.find(([r]) => r !== topRank)?.[0] || 0;

    if (topCount === 4) {
      return `Four of a Kind, ${rankToString(topRank)}, ${rankToString(highestOther)} High`;
    } else if (topCount === 3) {
      return `Three of a Kind, ${rankToString(topRank)}, ${rankToString(highestOther)} High`;
    } else if (topCount === 2) {
      // Check for two pair
      if (sortedRanks.length >= 2 && sortedRanks[1][1] === 2) {
        const secondPairRank = sortedRanks[1][0];
        const kicker = sortedRanks.find(([r]) => r !== topRank && r !== secondPairRank)?.[0] || 0;
        return `Two Pair, ${rankToString(topRank)} and ${rankToString(secondPairRank)}, ${rankToString(kicker)} High`;
      }
      return `Pair of ${rankToString(topRank)}, ${rankToString(highestOther)} High`;
    } else {
      // High card
      return `${rankToString(topRank)} High`;
    }
  }

  // 5+ cards: use full hand evaluator
  const hand = evaluateHand(allCards);

  switch (hand.rank) {
    case HandRank.ROYAL_FLUSH:
      return 'Royal Flush';

    case HandRank.STRAIGHT_FLUSH:
      return `Straight Flush, ${rankToString(hand.cards[0].rank)} High`;

    case HandRank.FOUR_OF_KIND:
      return `Four of a Kind, ${rankToString(hand.kickers![0])}, ${rankToString(hand.kickers![1])} High`;

    case HandRank.FULL_HOUSE:
      return `Full House, ${rankToString(hand.kickers![0])} over ${rankToString(hand.kickers![1])}`;

    case HandRank.FLUSH:
      return `Flush, ${rankToString(hand.cards[0].rank)} High`;

    case HandRank.STRAIGHT:
      return `Straight, ${rankToString(hand.cards[0].rank)} High`;

    case HandRank.THREE_OF_KIND:
      return `Three of a Kind, ${rankToString(hand.kickers![0])}, ${rankToString(hand.kickers![1])} High`;

    case HandRank.TWO_PAIR:
      return `Two Pair, ${rankToString(hand.kickers![0])} and ${rankToString(hand.kickers![1])}, ${rankToString(hand.kickers![2])} High`;

    case HandRank.PAIR:
      return `Pair of ${rankToString(hand.kickers![0])}, ${rankToString(hand.kickers![1])} High`;

    case HandRank.HIGH_CARD:
    default:
      return `${rankToString(hand.cards[0].rank)} High`;
  }
}

interface PlayerDealerCardsProps {
  phase: Phase;
  playerCards: Card[];
  dealerCards: Card[];
  communityCards: Card[];
  showDealerCards: boolean;
}

export function PlayerDealerCards({
  phase,
  playerCards,
  dealerCards,
  communityCards,
  showDealerCards,
}: PlayerDealerCardsProps) {
  const isPreDeal = phase === PHASES.PRE_DEAL;
  const isPlayerCards = phase === PHASES.PLAYER_CARDS;
  const isCommunityCards = phase === PHASES.FLOP || phase === PHASES.TURN || phase === PHASES.RIVER;
  const isDealerCards = phase === PHASES.DEALER_CARDS;
  const isResolution = phase === PHASES.RESOLUTION;

  const getPlayerStatus = () => {
    if (isPreDeal) return { label: 'WAITING', color: 'bg-slate-700 text-slate-400' };
    if (isPlayerCards || isCommunityCards) return { label: 'ACTIVE', color: 'bg-emerald-500/20 text-emerald-400' };
    return { label: 'HOLD', color: 'bg-slate-700 text-slate-400' };
  };

  const getDealerStatus = () => {
    if (isPreDeal || isPlayerCards || isCommunityCards) return { label: 'WAITING', color: 'bg-slate-700 text-slate-400' };
    if (isDealerCards || isResolution) return { label: 'ACTIVE', color: 'bg-amber-500/20 text-amber-400' };
    return { label: 'HOLD', color: 'bg-slate-700 text-slate-400' };
  };

  const playerStatus = getPlayerStatus();
  const dealerStatus = getDealerStatus();

  return (
    <div className="grid grid-cols-2 gap-4 mb-3">
      {/* Player Cards */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="font-semibold text-slate-300">PLAYER 1</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium min-w-[60px] text-center ${playerStatus.color}`}>
            {playerStatus.label}
          </span>
        </div>

        <div className="flex gap-2 mb-2 justify-center min-h-[96px] items-center">
          {isPreDeal || playerCards.length === 0 ? (
            <>
              <CardDisplay card={null} />
              <CardDisplay card={null} />
            </>
          ) : (
            <>
              {playerCards.map((card, i) => (
                <CardDisplay key={i} card={card} />
              ))}
            </>
          )}
        </div>

        {/* Player Hand Description */}
        <div className="text-center text-sm font-medium text-emerald-400">
          {playerCards.length > 0
            ? isResolution
              ? getFullHandDescription(playerCards, communityCards)
              : getHoleCardDescription(playerCards, communityCards)
            : '—'}
        </div>
      </div>

      {/* Dealer Cards */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
            <span className="font-semibold text-slate-300">PLAYER 2</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium min-w-[60px] text-center ${dealerStatus.color}`}>
            {dealerStatus.label}
          </span>
        </div>

        <div className="flex gap-2 mb-2 justify-center min-h-[96px] items-center">
          {isPreDeal || (!isDealerCards && !isResolution) || dealerCards.length === 0 ? (
            <>
              <CardDisplay card={null} />
              <CardDisplay card={null} />
            </>
          ) : (
            <>
              {dealerCards.map((card, i) => (
                <CardDisplay key={i} card={card} />
              ))}
              {dealerCards.length === 1 && <CardDisplay card={null} />}
            </>
          )}
        </div>

        {/* Dealer Hand Description */}
        <div className="text-center text-sm font-medium text-amber-400">
          {showDealerCards && dealerCards.length > 0
            ? isResolution
              ? getFullHandDescription(dealerCards, communityCards)
              : getHoleCardDescription(dealerCards, communityCards)
            : dealerCards.length > 0
              ? 'Hidden'
              : '—'}
        </div>
      </div>

      {/* Community Cards - Show slots, labels only after cards are dealt */}
      <div className="col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800 p-4">
        <div className="flex gap-2 justify-center items-end">
          {/* Flop - first 3 cards with single label centered above */}
          <div className="flex flex-col items-center gap-1">
            {communityCards.length >= 3 && (
              <div className="text-xs text-slate-300 uppercase tracking-wide mb-1">Flop</div>
            )}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <CardDisplay key={i} card={communityCards[i] || null} />
              ))}
            </div>
          </div>
          {/* Turn - 4th card */}
          <div className="flex flex-col items-center gap-1">
            {communityCards.length >= 4 && (
              <div className="text-xs text-slate-300 uppercase tracking-wide">Turn</div>
            )}
            <CardDisplay card={communityCards[3] || null} />
          </div>
          {/* River - 5th card */}
          <div className="flex flex-col items-center gap-1">
            {communityCards.length >= 5 && (
              <div className="text-xs text-slate-300 uppercase tracking-wide">River</div>
            )}
            <CardDisplay card={communityCards[4] || null} />
          </div>
        </div>
      </div>
    </div>
  );
}
