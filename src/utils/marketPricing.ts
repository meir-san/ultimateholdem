import type { Pool, Position } from '../types';
import { PLATFORM_FEE } from '../config/constants';

/**
 * Calculates implied probability from pool distribution
 */
export function getImpliedOdds(type: 'player1' | 'player2' | 'player3' | 'push', pool: Pool): number {
  const totalPool = pool.player1 + pool.player2 + pool.player3 + pool.push;
  if (totalPool === 0) return 25;
  return (pool[type] / totalPool) * 100;
}

/**
 * Calculates pool odds (what you'd get if you won)
 */
export function getPoolOdds(type: 'player1' | 'player2' | 'player3' | 'push', pool: Pool): number {
  const totalPool = pool.player1 + pool.player2 + pool.player3 + pool.push;
  if (totalPool === 0 || pool[type] === 0) return 0;
  return ((totalPool * (1 - PLATFORM_FEE)) / pool[type]) * 100;
}

/**
 * Calculates shares purchased for a given bet amount at current market price
 */
export function calculateShares(amount: number, entryOdds: number): number {
  // Apply fee at purchase - only 96.5% of your money buys shares
  // entryOdds is a DECIMAL (0-1), not a percentage
  if (!Number.isFinite(entryOdds) || entryOdds <= 0) {
    return 0;
  }
  const effectiveAmount = amount * (1 - PLATFORM_FEE);
  return effectiveAmount / entryOdds;
}

/**
 * Calculates the current market value of a position
 */
export function getPositionValue(
  positions: Position[],
  currentOdds: number
): number {
  if (positions.length === 0) return 0;
  const totalShares = positions.reduce((sum, pos) => sum + pos.shares, 0);
  return totalShares * (currentOdds / 100);
}

/**
 * Calculates total amount paid for positions
 */
export function getTotalAmountPaid(positions: Position[]): number {
  return positions.reduce((sum, pos) => sum + pos.amountPaid, 0);
}

/**
 * Calculates total shares owned
 */
export function getTotalShares(positions: Position[]): number {
  return positions.reduce((sum, pos) => sum + pos.shares, 0);
}

/**
 * Calculates potential payout if outcome wins (each share pays $1)
 */
export function getPotentialPayout(positions: Position[]): number {
  return positions.reduce((sum, pos) => sum + pos.shares, 0);
}
