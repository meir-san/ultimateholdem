import type { Card } from '../types';
import { evaluateHand } from './pokerHands';
import { HandRank } from '../types';

/**
 * Determines if player should raise 4x pre-flop
 */
export function shouldRaise4x(holeCards: Card[]): boolean {
  if (holeCards.length !== 2) return false;

  const [card1, card2] = holeCards;
  const rank1 = card1.rank;
  const rank2 = card2.rank;
  const suited = card1.suit === card2.suit;

  // Any pair 3s or higher
  if (rank1 === rank2 && rank1 >= 3) {
    return true;
  }

  // Any Ace (A-x)
  if (rank1 === 14 || rank2 === 14) {
    return true;
  }

  // K5+ suited, K-Q offsuit
  if (rank1 === 13 || rank2 === 13) {
    const otherRank = rank1 === 13 ? rank2 : rank1;
    if (suited && otherRank >= 5) return true;
    if (!suited && otherRank === 12) return true; // K-Q offsuit
  }

  // Q8+ suited or offsuit
  if (rank1 === 12 || rank2 === 12) {
    const otherRank = rank1 === 12 ? rank2 : rank1;
    if (otherRank >= 8) return true;
  }

  // J8+ suited, T8+ suited
  if (suited) {
    if ((rank1 === 11 || rank2 === 11) && (rank1 >= 8 || rank2 >= 8)) {
      return true;
    }
    if ((rank1 === 10 || rank2 === 10) && (rank1 >= 8 || rank2 >= 8)) {
      return true;
    }
  }

  return false;
}

/**
 * Determines if player should raise 2x post-flop
 */
export function shouldRaise2x(holeCards: Card[], community: Card[]): boolean {
  if (holeCards.length !== 2 || community.length < 3) return false;

  const allCards = [...holeCards, ...community];
  const hand = evaluateHand(allCards);

  // Two pair or better
  if (hand.rank >= HandRank.TWO_PAIR) {
    return true;
  }

  // Hidden pair (hole card pairs with board)
  const holeRanks = holeCards.map(c => c.rank);
  const boardRanks = community.map(c => c.rank);
  
  for (const holeRank of holeRanks) {
    if (boardRanks.includes(holeRank)) {
      return true; // Hidden pair
    }
  }

  // 4 to a flush with 10+ high card
  const suits = allCards.map(c => c.suit);
  const suitCounts = new Map<string, number>();
  for (const suit of suits) {
    suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1);
  }

  for (const [suit, count] of suitCounts.entries()) {
    if (count >= 4) {
      // Check if we have 10+ high card in that suit
      const suitedCards = allCards.filter(c => c.suit === suit);
      const hasHighCard = suitedCards.some(c => c.rank >= 10);
      if (hasHighCard) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines if player should raise 1x on turn/river
 */
export function shouldRaise1x(holeCards: Card[], community: Card[]): boolean {
  if (holeCards.length !== 2 || community.length < 5) return false;

  const allCards = [...holeCards, ...community];
  const hand = evaluateHand(allCards);

  // Hidden pair or better
  if (hand.rank >= HandRank.PAIR) {
    // Check if it's a hidden pair (hole card pairs with board)
    const holeRanks = holeCards.map(c => c.rank);
    const boardRanks = community.map(c => c.rank);
    
    for (const holeRank of holeRanks) {
      if (boardRanks.includes(holeRank)) {
        return true; // Hidden pair
      }
    }

    // Or if we have a pair or better from board + hole cards
    if (hand.rank >= HandRank.PAIR) {
      return true;
    }
  }

  return false;
}
