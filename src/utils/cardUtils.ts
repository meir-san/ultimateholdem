import type { Card } from '../types';
import { CARD_RANKS, SUITS } from '../config/constants';

/**
 * Creates a shuffled deck of 52 cards
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of CARD_RANKS) {
      deck.push({ rank, suit });
    }
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
 * Removes cards from deck (used when dealing)
 */
export function removeCards(deck: Card[], cards: Card[]): Card[] {
  const deckCopy = [...deck];
  for (const card of cards) {
    const index = deckCopy.findIndex(
      c => c.rank === card.rank && c.suit === card.suit
    );
    if (index !== -1) {
      deckCopy.splice(index, 1);
    }
  }
  return deckCopy;
}

/**
 * Gets a string representation of a card
 */
export function cardToString(card: Card): string {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };
  const suitMap: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return `${rankMap[card.rank]}${suitMap[card.suit]}`;
}
