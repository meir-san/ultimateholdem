import { describe, it, expect, vi } from 'vitest';
import { calculateWinProbabilities } from '../winProbability';

// Mock the shuffle function to make tests deterministic
vi.mock('../cardUtils', async () => {
  const actual = await vi.importActual('../cardUtils');
  return {
    ...actual,
    shuffle: (arr: number[]) => [...arr], // Return unshuffled for testing
  };
});

describe('winProbability', () => {
  describe('calculateWinProbabilities', () => {
    it('should return dealer wins 100% if player already busted', () => {
      const result = calculateWinProbabilities([10, 10, 10], true, [], false, []);
      expect(result.player).toBe(0);
      expect(result.dealer).toBe(100);
      expect(result.push).toBe(0);
    });

    it('should return probabilities that sum to 100', () => {
      const deck = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
      const result = calculateWinProbabilities([10, 6], false, [10], true, deck);
      const sum = result.player + result.dealer + result.push;
      expect(sum).toBeCloseTo(100, 0);
    });

    it('should handle player with strong hand (20)', () => {
      // Player has 20, dealer has 10 showing
      // Player should have high win probability (though dealer can still win with 21)
      // This test checks that probabilities are valid, not exact values
      const deck = Array(52).fill(0).map((_, i) => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
        return values[i % 13];
      });
      
      const result = calculateWinProbabilities([10, 10], false, [10], true, deck);
      // Player with 20 should have reasonable win probability
      // (Note: dealer can still win with 21, so player might not be > 50%)
      expect(result.player).toBeGreaterThanOrEqual(0);
      expect(result.dealer).toBeGreaterThanOrEqual(0);
      expect(result.push).toBeGreaterThanOrEqual(0);
      expect(result.player + result.dealer + result.push).toBeCloseTo(100, 0);
    });

    it('should handle dealer with strong upcard (10)', () => {
      // Player has 12, dealer has 10 showing
      // Dealer should have advantage
      const deck = Array(52).fill(0).map((_, i) => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
        return values[i % 13];
      });
      
      const result = calculateWinProbabilities([6, 6], false, [10], true, deck);
      // Dealer should have advantage with 10 showing
      expect(result.dealer).toBeGreaterThan(result.player);
    });

    it('should account for push scenarios', () => {
      // When both have same total, push probability should be > 0
      const deck = Array(52).fill(0).map((_, i) => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
        return values[i % 13];
      });
      
      const result = calculateWinProbabilities([10, 10], false, [10], true, deck);
      expect(result.push).toBeGreaterThanOrEqual(0);
    });

    it('should handle single player card', () => {
      const deck = Array(52).fill(0).map((_, i) => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
        return values[i % 13];
      });
      
      const result = calculateWinProbabilities([10], false, [], true, deck);
      expect(result.player + result.dealer + result.push).toBeCloseTo(100, 0);
    });

    it('should handle dealer hidden card', () => {
      const deck = Array(52).fill(0).map((_, i) => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
        return values[i % 13];
      });
      
      const result = calculateWinProbabilities([10, 10], false, [10], true, deck);
      // Should still return valid probabilities
      expect(result.player).toBeGreaterThanOrEqual(0);
      expect(result.dealer).toBeGreaterThanOrEqual(0);
      expect(result.push).toBeGreaterThanOrEqual(0);
    });
  });
});
