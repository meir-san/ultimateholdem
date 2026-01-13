import type { Phase } from '../config/constants';

export interface Card {
  value: number;
}

export interface Position {
  amountPaid: number;
  shares: number;
  entryOdds: number; // decimal (e.g., 0.38)
}

export interface Positions {
  player: Position[];
  dealer: Position[];
  push: Position[];
}

export interface Pool {
  player: number;
  dealer: number;
  push: number;
}

export interface TrueOdds {
  player: number;
  dealer: number;
  push: number;
}

export interface ActivityFeedItem {
  id: number;
  username: string;
  type: 'player' | 'dealer' | 'push' | 'rebalance';
  typeLabel: string;
  amount: number | string;
  isYou?: boolean;
  isSystem?: boolean;
  isSell?: boolean;
}

export interface PriceHistoryPoint {
  time: number;
  player: number;
  dealer: number;
  push: number;
}

export interface GameState {
  // Deck and cards
  deck: number[];
  playerCards: number[];
  dealerCards: number[];
  dealerHiddenCard: number | null;
  
  // Game phase
  phase: Phase;
  timer: number;
  
  // Odds and probabilities
  trueOdds: TrueOdds;
  bustRisk: number;
  history: TrueOdds[];
  
  // Round state
  roundResult: 'player' | 'dealer' | 'push' | null;
  roundNumber: number;
  roundProfit: number | null;
  
  // Player state
  balance: number;
  myPositions: Positions;
  selectedBetAmount: number;
  
  // Market state
  pool: Pool;
  crowdBets: Pool;
  activityFeed: ActivityFeedItem[];
  priceHistory: PriceHistoryPoint[];
  showReferences: boolean;
}

export type Outcome = 'player' | 'dealer' | 'push';
