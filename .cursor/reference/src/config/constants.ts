/**
 * Game configuration constants
 */

export const PHASES = {
  PRE_DEAL: 'PRE_DEAL',
  PLAYER_CARD_1: 'PLAYER_CARD_1',
  DEALER_CARD_1: 'DEALER_CARD_1',
  PLAYER_CARD_2: 'PLAYER_CARD_2',
  PLAYER_HITTING: 'PLAYER_HITTING',
  DEALER_REVEAL: 'DEALER_REVEAL',
  DEALER_HITTING: 'DEALER_HITTING',
  RESOLUTION: 'RESOLUTION',
} as const;

export type Phase = typeof PHASES[keyof typeof PHASES];

export const PREDICTION_WINDOW = 15; // seconds
export const PLATFORM_FEE = 0.035; // 3.5% rake
export const INITIAL_BALANCE = 100;
export const INITIAL_POOL_BASE = 1000;
export const MONTE_CARLO_SIMULATIONS = 500;

// Betting amounts
export const QUICK_BET_AMOUNTS = [5, 10, 25, 50];
export const MAX_BET_AMOUNT = 100;

// Card values (standard blackjack deck)
// Values: 1=Ace, 2-9=numbered, 10=Ten, 11=Jack, 12=Queen, 13=King
// Note: 11, 12, 13 count as 10 for blackjack calculations
export const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const SUITS_PER_DECK = 4;
export const CARDS_PER_DECK = 52;

// Dealer rules
export const DEALER_STAND_VALUE = 17;

// Market rebalancing
export const REBALANCE_THRESHOLD = 3; // percentage change to trigger rebalance
export const REBALANCE_FACTOR = 0.9; // how aggressively to rebalance
export const CROWD_BET_NOISE = 6; // noise range for crowd betting
export const CROWD_BET_MIN = 5; // minimum bet amount
export const CROWD_BET_MAX = 80; // maximum bet amount
export const CROWD_BET_DELAY_MIN = 500; // milliseconds
export const CROWD_BET_DELAY_MAX = 2000; // milliseconds

// Initial odds (dealer has slight edge in blackjack)
export const INITIAL_ODDS = {
  player: 42,
  dealer: 50,
  push: 8,
} as const;

// Price history
export const MAX_PRICE_HISTORY_POINTS = 100;
export const MAX_ACTIVITY_FEED_ITEMS = 10;
