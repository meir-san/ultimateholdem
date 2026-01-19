import type { Phase } from '../config/constants';

export interface Card {
  rank: number; // 2-14 (14 = Ace)
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

export const HandRank = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10,
} as const;

export type HandRank = typeof HandRank[keyof typeof HandRank];

export interface EvaluatedHand {
  rank: HandRank;
  cards: Card[]; // Best 5 cards
  kickers?: number[]; // For tie-breaking
}

export interface Position {
  amountPaid: number;
  shares: number;
  entryOdds: number; // decimal (e.g., 0.38)
}

export interface Positions {
  player: Position[];
  dealer: Position[];
  player3: Position[];
  push: Position[];
}

export interface Pool {
  player: number;
  dealer: number;
  player3: number;
  push: number;
}

export interface TrueOdds {
  player: number;
  dealer: number;
  player3: number;
  push: number;
}

export interface ActivityFeedItem {
  id: number;
  username: string;
  type: 'player' | 'dealer' | 'player3' | 'push' | 'rebalance';
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
  player3: number;
  push: number;
}

export interface RoundHistoryItem {
  winner: 'player' | 'dealer' | 'player3' | 'push';
  handDescription: string; // e.g., "Pair of K", "4 of a kind A", "High Card 8"
}

export interface GameState {
  // Deck and cards
  deck: Card[];
  playerCards: Card[];
  dealerCards: Card[];
  player3Cards: Card[];
  communityCards: Card[];
  pendingFlop: Card[] | null;
  pendingTurn: Card | null;
  pendingRiver: Card | null;
  pendingOdds: TrueOdds | null;
  pendingOddsPhase: Phase | null;
  pendingOddsKey: string | null;
  
  // Game phase
  phase: Phase;
  timer: number;
  
  // Player action tracking
  playerRaisedPreflop: boolean;
  playerRaisedPostflop: boolean;
  playerRaisedTurnRiver: boolean;
  playerFolded: boolean;
  
  // Odds and probabilities
  trueOdds: TrueOdds;
  history: TrueOdds[];
  
  // Round state
  roundResult: 'player' | 'dealer' | 'player3' | 'push' | null;
  roundNumber: number;
  roundProfit: number | null;
  
  // Player state
  balance: number;
  myPositions: Positions;
  selectedBetAmount: number;
  lifetimeVolume: number; // Cumulative total of all bets placed (never resets)
  
  // Market state
  pool: Pool;
  crowdBets: Pool;
  activityFeed: ActivityFeedItem[];
  priceHistory: PriceHistoryPoint[];
  showReferences: boolean;
  revealedPlayer: 'player' | 'dealer' | 'player3';
  
  // Round history
  roundHistory: RoundHistoryItem[];
}

export type Outcome = 'player' | 'dealer' | 'player3' | 'push';
