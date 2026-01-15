/**
 * Game configuration constants for Ultimate Texas Hold'em
 */

export const PHASES = {
  PRE_DEAL: 'PRE_DEAL',
  PLAYER_CARDS: 'PLAYER_CARDS',
  FLOP: 'FLOP',
  TURN: 'TURN',
  RIVER: 'RIVER',
  DEALER_CARDS: 'DEALER_CARDS',
  RESOLUTION: 'RESOLUTION',
} as const;

export type Phase = typeof PHASES[keyof typeof PHASES];

export const PREDICTION_WINDOW = 15; // seconds
export const CARD_DEAL_DELAY = 1500; // milliseconds between cards in the same phase (1.5 seconds)
export const PLATFORM_FEE = 0.035; // 3.5% rake
export const INITIAL_BALANCE = 100;
export const INITIAL_POOL_BASE = 1000;
export const MONTE_CARLO_SIMULATIONS = 500;

// Betting amounts
export const QUICK_BET_AMOUNTS = [5, 10, 25, 50];
export const MAX_BET_AMOUNT = 100;

// Card ranks: 2-14 (14 = Ace)
export const CARD_RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const SUITS: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
export const CARDS_PER_DECK = 52;

// Market rebalancing
export const REBALANCE_THRESHOLD = 3; // percentage change to trigger rebalance
export const REBALANCE_FACTOR = 0.9; // how aggressively to rebalance
export const CROWD_BET_NOISE = 6; // noise range for crowd betting
export const CROWD_BET_MIN = 5; // minimum bet amount
export const CROWD_BET_MAX = 80; // maximum bet amount
export const CROWD_BET_DELAY_MIN = 500; // milliseconds
export const CROWD_BET_DELAY_MAX = 2000; // milliseconds

// Initial odds (roughly equal, slight edge to dealer)
export const INITIAL_ODDS = {
  player: 45,
  dealer: 48,
  push: 7,
} as const;

// Price history
export const MAX_PRICE_HISTORY_POINTS = 100;
export const MAX_ACTIVITY_FEED_ITEMS = 10;
