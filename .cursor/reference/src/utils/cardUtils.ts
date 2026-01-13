import { CARD_VALUES, SUITS_PER_DECK } from '../config/constants';

/**
 * Creates a shuffled deck of cards
 */
export function createDeck(): number[] {
  const deck: number[] = [];
  for (let suit = 0; suit < SUITS_PER_DECK; suit++) {
    CARD_VALUES.forEach(v => deck.push(v));
  }
  return shuffle([...deck]);
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Gets the blackjack value of a card (face cards count as 10)
 * IMPORTANT: Face cards (11=Jack, 12=Queen, 13=King) all count as 10
 */
export function getCardValue(card: number): number {
  if (card === 1) return 1; // Ace
  if (card >= 11 && card <= 13) return 10; // Jack, Queen, King all count as 10
  return card; // 2-10
}

/**
 * Calculates the total value of a hand, handling aces optimally
 */
export function calculateTotal(cards: number[]): number {
  let total = cards.reduce((sum, c) => sum + getCardValue(c), 0);
  let aces = cards.filter(c => c === 1).length;
  
  // Convert aces from 1 to 11 if it doesn't bust
  while (aces > 0 && total + 10 <= 21) {
    total += 10;
    aces--;
  }
  
  return total;
}

/**
 * Calculates the probability of busting on the next card
 */
export function calculateBustProbability(currentTotal: number, deck: number[]): number {
  if (currentTotal >= 17) return 0;
  
  const bustThreshold = 21 - currentTotal;
  // Aces (value 1) can always count as 1, so they never cause a bust
  // Only cards with blackjack value > bustThreshold cause a bust
  const bustCards = deck.filter(c => getCardValue(c) > bustThreshold).length;
  
  return deck.length > 0 ? (bustCards / deck.length) * 100 : 0;
}
