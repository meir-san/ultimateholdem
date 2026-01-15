import type { Card, EvaluatedHand } from '../types';
import { HandRank } from '../types';
import { evaluateHand } from './pokerHands';

function rankToString(rank: number): string {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };
  return rankMap[rank] || '?';
}

/**
 * Gets a short hand description for display in round history
 * Examples: "Pair of K", "4 of a kind A", "High Card 8", "Flush"
 */
export function getShortHandDescription(cards: Card[], communityCards: Card[]): string {
  const allCards = [...cards, ...communityCards];
  
  if (allCards.length < 5) {
    // For incomplete hands, just show high card
    const sorted = [...allCards].sort((a, b) => b.rank - a.rank);
    return `High Card ${rankToString(sorted[0].rank)}`;
  }

  const hand = evaluateHand(allCards);

  switch (hand.rank) {
    case HandRank.ROYAL_FLUSH:
      return 'Royal Flush';

    case HandRank.STRAIGHT_FLUSH:
      return `Straight Flush ${rankToString(hand.cards[0].rank)}`;

    case HandRank.FOUR_OF_KIND:
      return `4 of a kind ${rankToString(hand.kickers![0])}`;

    case HandRank.FULL_HOUSE:
      return `Full House ${rankToString(hand.kickers![0])}`;

    case HandRank.FLUSH:
      return `Flush ${rankToString(hand.cards[0].rank)}`;

    case HandRank.STRAIGHT:
      return `Straight ${rankToString(hand.cards[0].rank)}`;

    case HandRank.THREE_OF_KIND:
      return `3 of a kind ${rankToString(hand.kickers![0])}`;

    case HandRank.TWO_PAIR:
      return `Two Pair ${rankToString(hand.kickers![0])}`;

    case HandRank.PAIR:
      return `Pair of ${rankToString(hand.kickers![0])}`;

    case HandRank.HIGH_CARD:
    default:
      return `High Card ${rankToString(hand.cards[0].rank)}`;
  }
}
