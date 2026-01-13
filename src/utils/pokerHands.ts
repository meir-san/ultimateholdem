import type { Card } from '../types';
import { HandRank, type EvaluatedHand } from '../types';

/**
 * Evaluates the best 5-card poker hand from up to 7 cards
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate a hand');
  }

  // Generate all possible 5-card combinations
  const combinations = getCombinations(cards, 5);
  let bestHand: EvaluatedHand | null = null;

  for (const combo of combinations) {
    const evaluated = evaluateFiveCards(combo);
    if (!bestHand || compareHands(evaluated, bestHand) > 0) {
      bestHand = evaluated;
    }
  }

  return bestHand!;
}

/**
 * Evaluates a 5-card hand
 */
function evaluateFiveCards(cards: Card[]): EvaluatedHand {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);

  // Check for flush
  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight
  const isStraight = checkStraight(ranks);

  // Count rank frequencies
  const rankCounts = new Map<number, number>();
  for (const rank of ranks) {
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
  }

  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const pairs = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 2)
    .map(([rank]) => rank)
    .sort((a, b) => b - a);
  const trips = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 3)
    .map(([rank]) => rank);
  const quads = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 4)
    .map(([rank]) => rank);

  // Royal flush
  if (isFlush && isStraight && ranks[0] === 14 && ranks[4] === 10) {
    return { rank: HandRank.ROYAL_FLUSH, cards: sorted };
  }

  // Straight flush
  if (isFlush && isStraight) {
    return { rank: HandRank.STRAIGHT_FLUSH, cards: sorted };
  }

  // Four of a kind
  if (quads.length > 0) {
    const quadRank = quads[0];
    const kicker = ranks.find(r => r !== quadRank)!;
    return {
      rank: HandRank.FOUR_OF_KIND,
      cards: sorted,
      kickers: [kicker],
    };
  }

  // Full house
  if (trips.length > 0 && pairs.length > 0) {
    return {
      rank: HandRank.FULL_HOUSE,
      cards: sorted,
      kickers: [trips[0], pairs[0]],
    };
  }

  // Flush
  if (isFlush) {
    return { rank: HandRank.FLUSH, cards: sorted };
  }

  // Straight
  if (isStraight) {
    return { rank: HandRank.STRAIGHT, cards: sorted };
  }

  // Three of a kind
  if (trips.length > 0) {
    const tripRank = trips[0];
    const kickers = ranks.filter(r => r !== tripRank).slice(0, 2);
    return {
      rank: HandRank.THREE_OF_KIND,
      cards: sorted,
      kickers,
    };
  }

  // Two pair
  if (pairs.length >= 2) {
    const kicker = ranks.find(r => !pairs.includes(r))!;
    return {
      rank: HandRank.TWO_PAIR,
      cards: sorted,
      kickers: [pairs[0], pairs[1], kicker],
    };
  }

  // Pair
  if (pairs.length === 1) {
    const pairRank = pairs[0];
    const kickers = ranks.filter(r => r !== pairRank).slice(0, 3);
    return {
      rank: HandRank.PAIR,
      cards: sorted,
      kickers,
    };
  }

  // High card
  return {
    rank: HandRank.HIGH_CARD,
    cards: sorted,
    kickers: ranks.slice(0, 5),
  };
}

/**
 * Checks if ranks form a straight (handles A-2-3-4-5 as low straight)
 */
function checkStraight(ranks: number[]): boolean {
  const unique = Array.from(new Set(ranks)).sort((a, b) => b - a);
  
  // Check for regular straight
  for (let i = 0; i <= unique.length - 5; i++) {
    let consecutive = true;
    for (let j = 1; j < 5; j++) {
      if (unique[i + j] !== unique[i] - j) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return true;
  }

  // Check for A-2-3-4-5 (wheel)
  if (unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
    return true;
  }

  return false;
}

/**
 * Compares two hands. Returns 1 if hand1 > hand2, -1 if hand1 < hand2, 0 if equal
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;

  // Same rank, compare kickers
  const kickers1 = hand1.kickers || hand1.cards.map(c => c.rank).slice(0, 5);
  const kickers2 = hand2.kickers || hand2.cards.map(c => c.rank).slice(0, 5);

  for (let i = 0; i < Math.max(kickers1.length, kickers2.length); i++) {
    const k1 = kickers1[i] || 0;
    const k2 = kickers2[i] || 0;
    if (k1 > k2) return 1;
    if (k1 < k2) return -1;
  }

  return 0;
}

/**
 * Generates all combinations of k elements from array
 */
function getCombinations<T>(array: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (array.length < k) return [];

  const result: T[][] = [];
  for (let i = 0; i <= array.length - k; i++) {
    const head = array[i];
    const tailCombos = getCombinations(array.slice(i + 1), k - 1);
    for (const combo of tailCombos) {
      result.push([head, ...combo]);
    }
  }
  return result;
}

/**
 * Determines the winner between player and dealer hands
 */
export function determineWinner(playerHand: EvaluatedHand, dealerHand: EvaluatedHand): 'player' | 'dealer' | 'push' {
  const comparison = compareHands(playerHand, dealerHand);
  if (comparison > 0) return 'player';
  if (comparison < 0) return 'dealer';
  return 'push';
}
