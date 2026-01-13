import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, calculateTotal, calculateBustProbability, getCardValue } from '../cardUtils';

describe('cardUtils', () => {
  describe('createDeck', () => {
    it('should create a deck with 52 cards', () => {
      const deck = createDeck();
      expect(deck.length).toBe(52);
    });

    it('should create a shuffled deck', () => {
      const deck1 = createDeck();
      const deck2 = createDeck();
      // Very unlikely to have same order after shuffle
      expect(deck1).not.toEqual(deck2);
    });

    it('should contain correct card values', () => {
      const deck = createDeck();
      
      // Count occurrences of each value
      const counts: Record<number, number> = {};
      deck.forEach(card => {
        counts[card] = (counts[card] || 0) + 1;
      });

      // Values 1-9 should appear 4 times each (one per suit)
      for (let i = 1; i <= 9; i++) {
        expect(counts[i]).toBe(4);
      }
      // Value 10 (Ten) should appear 4 times (one per suit)
      expect(counts[10]).toBe(4);
      // Value 11 (Jack) should appear 4 times (one per suit)
      expect(counts[11]).toBe(4);
      // Value 12 (Queen) should appear 4 times (one per suit)
      expect(counts[12]).toBe(4);
      // Value 13 (King) should appear 4 times (one per suit)
      expect(counts[13]).toBe(4);
    });
  });

  describe('shuffle', () => {
    it('should return array of same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled.length).toBe(arr.length);
    });

    it('should contain same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should not mutate original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      shuffle(arr);
      expect(arr).toEqual(original);
    });
  });

  describe('calculateTotal', () => {
    it('should sum card values correctly', () => {
      expect(calculateTotal([2, 3, 4])).toBe(9);
      expect(calculateTotal([10, 10])).toBe(20);
      // Face cards (11=Jack, 12=Queen, 13=King) all count as 10
      expect(calculateTotal([11, 12])).toBe(20); // Jack + Queen = 10 + 10
      expect(calculateTotal([13, 13])).toBe(20); // King + King = 10 + 10
      expect(calculateTotal([10, 11, 12, 13])).toBe(40); // All face cards = 10 each
    });

    it('should handle aces as 11 when beneficial', () => {
      expect(calculateTotal([1, 9])).toBe(20); // Ace = 11
      expect(calculateTotal([1, 10])).toBe(21); // Ace = 11
    });

    it('should handle aces as 1 when 11 would bust', () => {
      expect(calculateTotal([1, 10, 10])).toBe(21); // Ace = 1
      expect(calculateTotal([1, 9, 9])).toBe(19); // Ace = 1
    });

    it('should handle multiple aces correctly', () => {
      expect(calculateTotal([1, 1, 9])).toBe(21); // First ace = 11, second = 1
      expect(calculateTotal([1, 1, 1, 8])).toBe(21); // First ace = 11, others = 1
    });

    it('should handle bust scenarios', () => {
      expect(calculateTotal([10, 10, 10])).toBe(30);
      expect(calculateTotal([1, 10, 10, 10])).toBe(31); // All aces as 1
    });

    it('should handle empty hand', () => {
      expect(calculateTotal([])).toBe(0);
    });
  });

  describe('getCardValue', () => {
    it('should convert face cards to 10', () => {
      expect(getCardValue(11)).toBe(10); // Jack = 10
      expect(getCardValue(12)).toBe(10); // Queen = 10
      expect(getCardValue(13)).toBe(10); // King = 10
    });

    it('should return correct values for other cards', () => {
      expect(getCardValue(1)).toBe(1); // Ace = 1
      expect(getCardValue(2)).toBe(2);
      expect(getCardValue(10)).toBe(10); // Ten = 10
    });
  });

  describe('calculateBustProbability', () => {
    it('should return 0 if current total is 17 or higher', () => {
      const deck = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
      expect(calculateBustProbability(17, deck)).toBe(0);
      expect(calculateBustProbability(21, deck)).toBe(0);
    });

    it('should calculate correct bust probability', () => {
      // If total is 15, cards > 6 will bust (7, 8, 9, 10)
      const deck = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
      const total = 15;
      const bustThreshold = 21 - total; // 6
      const bustCards = deck.filter(c => c > bustThreshold).length; // Cards > 6: 7, 8, 9, 10, 10, 10, 10 = 7 cards
      const expected = (bustCards / deck.length) * 100;
      
      expect(calculateBustProbability(total, deck)).toBe(expected);
    });

    it('should handle empty deck', () => {
      expect(calculateBustProbability(15, [])).toBe(0);
    });

    it('should account for aces never causing bust', () => {
      // If total is 15, cards > 6 bust (7, 8, 9, 10), aces (1) never bust
      const deck = [1, 1, 1, 1, 7, 8, 9, 10]; // 4 aces, 4 high cards
      const total = 15;
      const bustThreshold = 21 - total; // 6
      const bustCards = deck.filter(c => c > bustThreshold).length; // 7, 8, 9, 10 = 4 cards
      const expected = (bustCards / deck.length) * 100; // 50%
      
      expect(calculateBustProbability(total, deck)).toBe(expected);
    });
  });
});
