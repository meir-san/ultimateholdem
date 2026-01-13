import { describe, it, expect } from 'vitest';
import {
  getImpliedOdds,
  getPoolOdds,
  calculateShares,
  getPositionValue,
  getTotalAmountPaid,
  getTotalShares,
  getPotentialPayout,
} from '../marketPricing';
import type { Pool, Position } from '../../types';
import { PLATFORM_FEE } from '../../config/constants';

describe('marketPricing', () => {
  describe('getImpliedOdds', () => {
    it('should return equal odds for equal pools', () => {
      const pool: Pool = { player: 100, dealer: 100, push: 100 };
      expect(getImpliedOdds('player', pool)).toBeCloseTo(33.33, 1);
      expect(getImpliedOdds('dealer', pool)).toBeCloseTo(33.33, 1);
      expect(getImpliedOdds('push', pool)).toBeCloseTo(33.33, 1);
    });

    it('should return correct odds for weighted pools', () => {
      const pool: Pool = { player: 200, dealer: 100, push: 100 };
      expect(getImpliedOdds('player', pool)).toBe(50);
      expect(getImpliedOdds('dealer', pool)).toBe(25);
      expect(getImpliedOdds('push', pool)).toBe(25);
    });

    it('should return default 33.33 for empty pool', () => {
      const pool: Pool = { player: 0, dealer: 0, push: 0 };
      expect(getImpliedOdds('player', pool)).toBe(33.33);
    });

    it('should handle single outcome pool', () => {
      const pool: Pool = { player: 100, dealer: 0, push: 0 };
      expect(getImpliedOdds('player', pool)).toBe(100);
      expect(getImpliedOdds('dealer', pool)).toBe(0);
    });
  });

  describe('getPoolOdds', () => {
    it('should calculate correct pool odds', () => {
      const pool: Pool = { player: 100, dealer: 100, push: 100 };
      const totalPool = 300;
      const expected = ((totalPool * (1 - PLATFORM_FEE)) / pool.player) * 100;
      expect(getPoolOdds('player', pool)).toBe(expected);
    });

    it('should return 0 for empty pool', () => {
      const pool: Pool = { player: 0, dealer: 0, push: 0 };
      expect(getPoolOdds('player', pool)).toBe(0);
    });

    it('should account for platform fee', () => {
      const pool: Pool = { player: 100, dealer: 0, push: 0 };
      const result = getPoolOdds('player', pool);
      // Should be less than 100% due to fee
      expect(result).toBeLessThan(100);
    });
  });

  describe('calculateShares', () => {
    it('should calculate shares correctly', () => {
      const amount = 100;
      const entryOdds = 0.50; // 50% as decimal (0-1)
      const expectedEffectiveAmount = amount * (1 - PLATFORM_FEE);
      const expectedShares = expectedEffectiveAmount / entryOdds;
      
      expect(calculateShares(amount, entryOdds)).toBeCloseTo(expectedShares, 2);
    });

    it('should account for platform fee', () => {
      const amount = 100;
      const entryOdds = 0.50; // 50% as decimal
      const shares = calculateShares(amount, entryOdds);
      // Shares should be less than if there was no fee
      const sharesWithoutFee = amount / entryOdds;
      expect(shares).toBeLessThan(sharesWithoutFee);
    });

    it('should handle different entry odds', () => {
      const amount = 100;
      const shares50 = calculateShares(amount, 0.50); // 50% as decimal
      const shares25 = calculateShares(amount, 0.25); // 25% as decimal
      // Lower odds should give more shares
      expect(shares25).toBeGreaterThan(shares50);
    });
  });

  describe('getPositionValue', () => {
    it('should calculate current market value', () => {
      const positions: Position[] = [
        { amountPaid: 100, shares: 200, entryOdds: 0.5 },
      ];
      const currentOdds = 60; // 60%
      const expected = 200 * (60 / 100); // 120
      expect(getPositionValue(positions, currentOdds)).toBe(expected);
    });

    it('should handle multiple positions', () => {
      const positions: Position[] = [
        { amountPaid: 50, shares: 100, entryOdds: 0.5 },
        { amountPaid: 50, shares: 100, entryOdds: 0.5 },
      ];
      const currentOdds = 60;
      const expected = 200 * (60 / 100); // 120
      expect(getPositionValue(positions, currentOdds)).toBe(expected);
    });

    it('should return 0 for empty positions', () => {
      expect(getPositionValue([], 50)).toBe(0);
    });
  });

  describe('getTotalAmountPaid', () => {
    it('should sum all amounts paid', () => {
      const positions: Position[] = [
        { amountPaid: 50, shares: 100, entryOdds: 0.5 },
        { amountPaid: 75, shares: 150, entryOdds: 0.5 },
      ];
      expect(getTotalAmountPaid(positions)).toBe(125);
    });

    it('should return 0 for empty positions', () => {
      expect(getTotalAmountPaid([])).toBe(0);
    });
  });

  describe('getTotalShares', () => {
    it('should sum all shares', () => {
      const positions: Position[] = [
        { amountPaid: 50, shares: 100, entryOdds: 0.5 },
        { amountPaid: 75, shares: 150, entryOdds: 0.5 },
      ];
      expect(getTotalShares(positions)).toBe(250);
    });

    it('should return 0 for empty positions', () => {
      expect(getTotalShares([])).toBe(0);
    });
  });

  describe('getPotentialPayout', () => {
    it('should return total shares (each share pays $1)', () => {
      const positions: Position[] = [
        { amountPaid: 50, shares: 100, entryOdds: 0.5 },
        { amountPaid: 75, shares: 150, entryOdds: 0.5 },
      ];
      expect(getPotentialPayout(positions)).toBe(250);
    });

    it('should return 0 for empty positions', () => {
      expect(getPotentialPayout([])).toBe(0);
    });
  });
});
