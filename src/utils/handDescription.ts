import type { Card, EvaluatedHand } from '../types';
import { HandRank } from '../types';
import { compareHands, evaluateHand } from './pokerHands';

function rankToString(rank: number): string {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };
  return rankMap[rank] || '?';
}

function formatKickers(ranks: number[] | undefined): string {
  if (!ranks || ranks.length === 0) return '';
  return ranks.map((rank) => rankToString(rank)).join(' ');
}

function formatShortHandDescription(hand: EvaluatedHand): string {
  switch (hand.rank) {
    case HandRank.ROYAL_FLUSH:
      return 'Royal Flush';
    case HandRank.STRAIGHT_FLUSH:
      return `Straight Flush ${rankToString(hand.kickers?.[0] ?? hand.cards[0].rank)}`;
    case HandRank.FOUR_OF_KIND:
      return `4 of a kind ${rankToString(hand.kickers?.[0] ?? hand.cards[0].rank)}${hand.kickers?.[1] ? `, ${rankToString(hand.kickers[1])} kicker` : ''}`;
    case HandRank.FULL_HOUSE:
      return `Full House ${rankToString(hand.kickers?.[0] ?? hand.cards[0].rank)}`;
    case HandRank.FLUSH:
      return `Flush ${rankToString(hand.cards[0].rank)} High`;
    case HandRank.STRAIGHT:
      return `Straight ${rankToString(hand.kickers?.[0] ?? hand.cards[0].rank)}`;
    case HandRank.THREE_OF_KIND:
      return `3 of a kind ${rankToString(hand.kickers?.[0] ?? hand.cards[0].rank)}${hand.kickers?.[1] ? `, ${formatKickers(hand.kickers.slice(1))} kickers` : ''}`;
    case HandRank.TWO_PAIR: {
      const highPair = hand.kickers?.[0];
      const lowPair = hand.kickers?.[1];
      const kicker = hand.kickers?.[2];
      if (highPair && lowPair && kicker) {
        return `Two Pair ${rankToString(highPair)} & ${rankToString(lowPair)}, ${rankToString(kicker)} kicker`;
      }
      return 'Two Pair';
    }
    case HandRank.PAIR: {
      const pairRank = hand.kickers?.[0];
      const kickers = hand.kickers?.slice(1);
      if (pairRank && kickers && kickers.length > 0) {
        return `Pair of ${rankToString(pairRank)}, ${formatKickers(kickers)} kickers`;
      }
      return `Pair of ${rankToString(pairRank ?? hand.cards[0].rank)}`;
    }
    case HandRank.HIGH_CARD:
    default:
      return `High Card ${formatKickers(hand.kickers) || rankToString(hand.cards[0].rank)}`;
  }
}

/**
 * Gets a short hand description for display in round history
 * Examples: "Pair of K, A kicker", "4 of a kind A", "High Card 8", "Flush K High"
 */
export function getShortHandDescription(cards: Card[], communityCards: Card[]): string {
  const allCards = [...cards, ...communityCards];

  if (allCards.length < 5) {
    // For incomplete hands, just show high card
    const sorted = [...allCards].sort((a, b) => b.rank - a.rank);
    return `High Card ${rankToString(sorted[0].rank)}`;
  }

  const hand = evaluateHand(allCards);
  const description = formatShortHandDescription(hand);

  if (communityCards.length >= 5) {
    const boardHand = evaluateHand(communityCards);
    if (compareHands(hand, boardHand) === 0) {
      return `Board: ${formatShortHandDescription(boardHand)}`;
    }
  }

  return description;
}
