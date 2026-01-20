import { create } from 'zustand';
import type { GameState, Outcome, ActivityFeedItem, PriceHistoryPoint, Position, TrueOdds, Card } from '../types';
import { PHASES, INITIAL_BALANCE, INITIAL_POOL_BASE, INITIAL_ODDS, PREDICTION_WINDOW, PLATFORM_FEE } from '../config/constants';
import { createDeck } from '../utils/cardUtils';
import { calculateWinProbabilities } from '../utils/winProbability';
import { evaluateHand, determineWinnerThree } from '../utils/pokerHands';
import { calculateShares, getTotalAmountPaid, getTotalShares, getPotentialPayout } from '../utils/marketPricing';
import { getShortHandDescription } from '../utils/handDescription';

interface GameStore extends GameState {
  // Actions
  startNewRound: () => void;
  advancePhase: () => void;
  placeBet: (type: 'player1' | 'player2' | 'player3' | 'push') => void;
  sellPosition: (type: 'player1' | 'player2' | 'player3' | 'push') => void;
  setSelectedBetAmount: (amount: number) => void;
  setTimer: (time: number) => void;
  decrementTimer: () => void;
  simulateCrowdBet: () => void;
  revealCard: (player: 'player1' | 'player2' | 'player3', index: 0 | 1) => void;
  rebalanceMarket: (prevTrueOdds: { player1: number; player2: number; player3: number; push: number }) => void;
  addActivityFeedItem: (item: Omit<ActivityFeedItem, 'id'>) => void;
  updatePriceHistory: () => void;
  resolveRound: (result: Outcome) => void;
  nextRound: () => void;
  
  // Computed getters
  getMyBetTotal: (type: 'player1' | 'player2' | 'player3' | 'push') => number;
  getTotalMyBets: () => number;
  getPositionValue: (type: 'player1' | 'player2' | 'player3' | 'push') => number;
  getTotalShares: (type: 'player1' | 'player2' | 'player3' | 'push') => number;
  getPotentialPayout: (type: 'player1' | 'player2' | 'player3' | 'push') => number;
  getUnrealizedPnL: (type: 'player1' | 'player2' | 'player3' | 'push') => number;
  getImpliedOdds: (type: 'player1' | 'player2' | 'player3' | 'push') => number;
  isMarketLocked: () => boolean;
}

const generateUsername = (): string => {
  const adjectives = ['Lucky', 'Smart', 'Bold', 'Quick', 'Wise', 'Sharp', 'Slick', 'Hot', 'Cool', 'Big'];
  const nouns = ['Trader', 'Shark', 'Wolf', 'Bull', 'Bear', 'Whale', 'Fish', 'Cat', 'Dog', 'Fox'];
  const num = Math.floor(Math.random() * 99);
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
};

const cardKey = (card: Card): string => `${card.rank}${card.suit}`;
const cardsKey = (cards: Card[]): string => cards.map(cardKey).sort().join('|');

let oddsWorker: Worker | null = null;
let oddsRequestId = 0;
const oddsResolvers = new Map<number, (odds: TrueOdds) => void>();

const getOddsWorker = (): Worker => {
  if (!oddsWorker) {
    oddsWorker = new Worker(new URL('../workers/oddsWorker.ts', import.meta.url), { type: 'module' });
    oddsWorker.onmessage = (event: MessageEvent<{ requestId: number; odds: TrueOdds }>) => {
      const { requestId, odds } = event.data;
      const resolve = oddsResolvers.get(requestId);
      if (resolve) {
        oddsResolvers.delete(requestId);
        resolve(odds);
      }
    };
  }
  return oddsWorker;
};

const computeOddsAsync = (
  player1HoleCards: Card[],
  player2HoleCards: Card[],
  player3HoleCards: Card[],
  communityCards: Card[],
  deck: Card[],
  phase: typeof PHASES[keyof typeof PHASES]
): Promise<TrueOdds> => {
  const requestId = oddsRequestId++;
  const worker = getOddsWorker();
  return new Promise((resolve) => {
    oddsResolvers.set(requestId, resolve);
    worker.postMessage({
      requestId,
      player1HoleCards,
      player2HoleCards,
      player3HoleCards,
      communityCards,
      deck,
      phase,
    });
  });
};

const getRevealedHoleCards = (state: GameState) => {
  return {
    player1: state.player1Cards.filter((_, index) => state.revealedCards.player1[index]),
    player2: state.player2Cards.filter((_, index) => state.revealedCards.player2[index]),
    player3: state.player3Cards.filter((_, index) => state.revealedCards.player3[index]),
  };
};

const addUniqueCards = (deck: Card[], cards: Card[]) => {
  const existing = new Set(deck.map(cardKey));
  for (const card of cards) {
    const key = cardKey(card);
    if (!existing.has(key)) {
      deck.push(card);
      existing.add(key);
    }
  }
};

const buildOddsDeck = (state: GameState) => {
  const deck = [...state.deck];

  if (state.player1Cards.length === 2) {
    state.player1Cards.forEach((card, index) => {
      if (!state.revealedCards.player1[index]) addUniqueCards(deck, [card]);
    });
  }
  if (state.player2Cards.length === 2) {
    state.player2Cards.forEach((card, index) => {
      if (!state.revealedCards.player2[index]) addUniqueCards(deck, [card]);
    });
  }
  if (state.player3Cards.length === 2) {
    state.player3Cards.forEach((card, index) => {
      if (!state.revealedCards.player3[index]) addUniqueCards(deck, [card]);
    });
  }

  if (state.phase === PHASES.PLAYER_CARDS && state.pendingFlop) {
    addUniqueCards(deck, state.pendingFlop);
  }
  if (state.phase === PHASES.FLOP && state.pendingTurn) {
    addUniqueCards(deck, [state.pendingTurn]);
  }
  if (state.phase === PHASES.TURN && state.pendingRiver) {
    addUniqueCards(deck, [state.pendingRiver]);
  }

  return deck;
};

const buildNextOddsDeck = (deck: Card[], state: GameState) => {
  const nextDeck = [...deck];
  if (state.player1Cards.length === 2) {
    state.player1Cards.forEach((card, index) => {
      if (!state.revealedCards.player1[index]) addUniqueCards(nextDeck, [card]);
    });
  }
  if (state.player2Cards.length === 2) {
    state.player2Cards.forEach((card, index) => {
      if (!state.revealedCards.player2[index]) addUniqueCards(nextDeck, [card]);
    });
  }
  if (state.player3Cards.length === 2) {
    state.player3Cards.forEach((card, index) => {
      if (!state.revealedCards.player3[index]) addUniqueCards(nextDeck, [card]);
    });
  }
  return nextDeck;
};

const hasHiddenCards = (state: GameState) => {
  return (
    state.revealedCards.player1.some((revealed) => !revealed) ||
    state.revealedCards.player2.some((revealed) => !revealed) ||
    state.revealedCards.player3.some((revealed) => !revealed)
  );
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  deck: [],
  player1Cards: [],
  player2Cards: [],
  player3Cards: [],
  communityCards: [],
  pendingFlop: null,
  pendingTurn: null,
  pendingRiver: null,
  pendingOdds: null,
  pendingOddsPhase: null,
  pendingOddsKey: null,
  phase: PHASES.PRE_DEAL,
  timer: PREDICTION_WINDOW,
  playerRaisedPreflop: false,
  playerRaisedPostflop: false,
  playerRaisedTurnRiver: false,
  playerFolded: false,
  trueOdds: INITIAL_ODDS,
  history: [INITIAL_ODDS],
  roundResult: null,
  roundNumber: 1,
  roundProfit: null,
  balance: INITIAL_BALANCE,
  myPositions: { player1: [], player2: [], player3: [], push: [] },
  selectedBetAmount: 10,
  lifetimeVolume: 0,
  pool: { player1: 0, player2: 0, player3: 0, push: 0 },
  crowdBets: { player1: 0, player2: 0, player3: 0, push: 0 },
  activityFeed: [],
  priceHistory: [],
  showReferences: true,
  chosenPlayer: 'player1',
  revealedCards: { player1: [true, true], player2: [false, false], player3: [false, false] },
  firstBuyOutcome: null,
  roundHistory: [],

  startNewRound: () => {
    const newDeck = createDeck();
    const realPreDealOdds = calculateWinProbabilities([], [], [], [], newDeck, PHASES.PRE_DEAL);
    const initialPool = {
      player1: Math.round(INITIAL_POOL_BASE * (realPreDealOdds.player1 / 100) + (Math.random() - 0.5) * 50),
      player2: Math.round(INITIAL_POOL_BASE * (realPreDealOdds.player2 / 100) + (Math.random() - 0.5) * 50),
      player3: Math.round(INITIAL_POOL_BASE * (realPreDealOdds.player3 / 100) + (Math.random() - 0.5) * 50),
      push: Math.round(INITIAL_POOL_BASE * (realPreDealOdds.push / 100) + (Math.random() - 0.5) * 20)
    };

    set({
      deck: newDeck,
      player1Cards: [],
      player2Cards: [],
      player3Cards: [],
      communityCards: [],
      pendingFlop: null,
      pendingTurn: null,
      pendingRiver: null,
      pendingOdds: null,
      pendingOddsPhase: null,
      pendingOddsKey: null,
      phase: PHASES.PRE_DEAL,
      timer: PREDICTION_WINDOW,
      playerRaisedPreflop: false,
      playerRaisedPostflop: false,
      playerRaisedTurnRiver: false,
      playerFolded: false,
      trueOdds: realPreDealOdds,
      history: [realPreDealOdds],
      roundResult: null,
      myPositions: { player1: [], player2: [], player3: [], push: [] },
      selectedBetAmount: 10,
      roundProfit: null,
      activityFeed: [],
      priceHistory: [],
      chosenPlayer: 'player1',
      revealedCards: { player1: [true, true], player2: [false, false], player3: [false, false] },
      firstBuyOutcome: null,
      pool: initialPool,
      crowdBets: initialPool,
      // Don't reset roundHistory - keep accumulating
    });
  },

  // advancePhase deals cards and prepares odds for the next phase.
  // Exact odds are precomputed in a worker during the prediction window.
  advancePhase: () => {
    const state = get();
    const { phase, deck, player1Cards, player2Cards, communityCards } = state;

    if (phase === PHASES.PRE_DEAL) {
      // Phase 2: PLAYER_CARDS - Deal both player cards simultaneously
      const newDeck = [...deck];
      const pCard1 = newDeck.pop()!;
      const pCard2 = newDeck.pop()!;
      const dCard1 = newDeck.pop()!;
      const dCard2 = newDeck.pop()!;
      const p3Card1 = newDeck.pop()!;
      const p3Card2 = newDeck.pop()!;
      const finalPlayer1Cards = [pCard1, pCard2];
      const finalPlayer2Cards = [dCard1, dCard2];
      const finalPlayer3Cards = [p3Card1, p3Card2];
      const preflopDeck = [...newDeck];
      const revealed = getRevealedHoleCards({
        ...state,
        player1Cards: finalPlayer1Cards,
        player2Cards: finalPlayer2Cards,
        player3Cards: finalPlayer3Cards,
      });
      const oddsDeck = buildNextOddsDeck(preflopDeck, {
        ...state,
        player1Cards: finalPlayer1Cards,
        player2Cards: finalPlayer2Cards,
        player3Cards: finalPlayer3Cards,
      });
      const newOdds = calculateWinProbabilities(
        revealed.player1,
        revealed.player2,
        revealed.player3,
        [],
        oddsDeck,
        PHASES.PLAYER_CARDS
      );

      // Pre-deal flop for next phase and precompute exact odds during prediction window
      const flopCard1 = newDeck.pop()!;
      const flopCard2 = newDeck.pop()!;
      const flopCard3 = newDeck.pop()!;
      const pendingFlop = [flopCard1, flopCard2, flopCard3];
      const pendingKey = cardsKey(pendingFlop);
      
      // Check if outcome is certain (100%)
      const isCertain =
        newOdds.player1 >= 100 || newOdds.player2 >= 100 || newOdds.player3 >= 100 || newOdds.push >= 100;
      
      set({
        deck: newDeck,
        player1Cards: finalPlayer1Cards,
        player2Cards: finalPlayer2Cards,
        player3Cards: finalPlayer3Cards,
        phase: PHASES.PLAYER_CARDS,
        timer: isCertain ? 0 : PREDICTION_WINDOW, // Prediction window after both cards
        trueOdds: newOdds,
        history: [...state.history, newOdds],
        pendingFlop,
        pendingTurn: null,
        pendingRiver: null,
        pendingOdds: null,
        pendingOddsPhase: PHASES.FLOP,
        pendingOddsKey: pendingKey,
      });

      const nextDeck = buildNextOddsDeck(newDeck, {
        ...state,
        player1Cards: finalPlayer1Cards,
        player2Cards: finalPlayer2Cards,
        player3Cards: finalPlayer3Cards,
      });
      computeOddsAsync(revealed.player1, revealed.player2, revealed.player3, pendingFlop, nextDeck, PHASES.FLOP).then((odds) => {
        const current = get();
        if (current.pendingOddsPhase === PHASES.FLOP && current.pendingOddsKey === pendingKey) {
          set({ pendingOdds: odds });
        }
      });
      
      // If certain, auto-advance after a short delay (only if no hidden cards remain)
      if (isCertain && !hasHiddenCards(state)) {
        setTimeout(() => {
          get().advancePhase();
        }, 100);
      }
      
    } else if (phase === PHASES.PLAYER_CARDS) {
      // Phase 3: FLOP - Deal all three flop cards simultaneously
      const newDeck = [...deck];
      const flop = state.pendingFlop ?? [newDeck.pop()!, newDeck.pop()!, newDeck.pop()!];
      const revealed = getRevealedHoleCards(state);
      const oddsDeck = buildNextOddsDeck(newDeck, state);
      const newOdds =
        state.pendingOddsPhase === PHASES.FLOP && state.pendingOdds
          ? state.pendingOdds
          : calculateWinProbabilities(
              revealed.player1,
              revealed.player2,
              revealed.player3,
              flop,
              oddsDeck,
              PHASES.FLOP
            );
      
      // Check if outcome is certain (100%)
      const isCertain =
        newOdds.player1 >= 100 || newOdds.player2 >= 100 || newOdds.player3 >= 100 || newOdds.push >= 100;
      
      set({
        deck: newDeck,
        communityCards: flop,
        phase: PHASES.FLOP,
        timer: isCertain ? 0 : PREDICTION_WINDOW, // Prediction window after all three cards
        trueOdds: newOdds,
        history: [...state.history, newOdds],
        pendingFlop: null,
        pendingOdds: null,
        pendingOddsPhase: null,
        pendingOddsKey: null,
      });

      // Pre-deal turn and precompute exact odds during prediction window
      const turn = newDeck.pop()!;
      const pendingTurnKey = cardsKey([turn]);
      set({
        deck: newDeck,
        pendingTurn: turn,
        pendingOdds: null,
        pendingOddsPhase: PHASES.TURN,
        pendingOddsKey: pendingTurnKey,
      });
      const nextDeck = buildNextOddsDeck(newDeck, state);
      computeOddsAsync(revealed.player1, revealed.player2, revealed.player3, [...flop, turn], nextDeck, PHASES.TURN).then((odds) => {
        const current = get();
        if (current.pendingOddsPhase === PHASES.TURN && current.pendingOddsKey === pendingTurnKey) {
          set({ pendingOdds: odds });
        }
      });
      
      // If certain, auto-advance after a short delay (only if no hidden cards remain)
      if (isCertain && !hasHiddenCards(state)) {
        setTimeout(() => {
          get().advancePhase();
        }, 100);
      }
      
    } else if (phase === PHASES.FLOP) {
      // Phase 4: TURN - Deal turn card
      const newDeck = [...deck];
      const turn = state.pendingTurn ?? newDeck.pop()!;
      const revealed = getRevealedHoleCards(state);
      const oddsDeck = buildNextOddsDeck(newDeck, state);
      const newOdds =
        state.pendingOddsPhase === PHASES.TURN && state.pendingOdds
          ? state.pendingOdds
          : calculateWinProbabilities(
              revealed.player1,
              revealed.player2,
              revealed.player3,
              [...communityCards, turn],
              oddsDeck,
              PHASES.TURN
            );
      
      // Check if outcome is certain (100%)
      const isCertain =
        newOdds.player1 >= 100 || newOdds.player2 >= 100 || newOdds.player3 >= 100 || newOdds.push >= 100;
      
      set({
        deck: newDeck,
        communityCards: [...communityCards, turn],
        phase: PHASES.TURN,
        timer: isCertain ? 0 : PREDICTION_WINDOW, // Skip prediction window if certain
        trueOdds: newOdds,
        history: [...state.history, newOdds],
        pendingTurn: null,
        pendingOdds: null,
        pendingOddsPhase: null,
        pendingOddsKey: null,
      });

      // Pre-deal river and precompute exact odds during prediction window
      const river = newDeck.pop()!;
      const pendingRiverKey = cardsKey([river]);
      set({
        deck: newDeck,
        pendingRiver: river,
        pendingOdds: null,
        pendingOddsPhase: PHASES.RIVER,
        pendingOddsKey: pendingRiverKey,
      });
      const nextDeck = buildNextOddsDeck(newDeck, state);
      computeOddsAsync(
        revealed.player1,
        revealed.player2,
        revealed.player3,
        [...communityCards, turn, river],
        nextDeck,
        PHASES.RIVER
      ).then((odds) => {
        const current = get();
        if (current.pendingOddsPhase === PHASES.RIVER && current.pendingOddsKey === pendingRiverKey) {
          set({ pendingOdds: odds });
        }
      });
      
      // If certain, auto-advance after a short delay (only if no hidden cards remain)
      if (isCertain && !hasHiddenCards(state)) {
        setTimeout(() => {
          get().advancePhase();
        }, 100);
      }
      
    } else if (phase === PHASES.TURN) {
      // Phase 5: RIVER - Deal river card
      const newDeck = [...deck];
      const river = state.pendingRiver ?? newDeck.pop()!;
      const newCommunity = [...communityCards, river];

      const revealed = getRevealedHoleCards(state);
      const oddsDeck = buildNextOddsDeck(newDeck, state);
      const newOdds =
        state.pendingOddsPhase === PHASES.RIVER && state.pendingOdds
          ? state.pendingOdds
          : calculateWinProbabilities(
              revealed.player1,
              revealed.player2,
              revealed.player3,
              newCommunity,
              oddsDeck,
              PHASES.RIVER
            );
      
      // Check if outcome is certain (100%)
      const isCertain =
        newOdds.player1 >= 100 || newOdds.player2 >= 100 || newOdds.player3 >= 100 || newOdds.push >= 100;
      
      set({
        deck: newDeck,
        communityCards: newCommunity,
        phase: PHASES.RIVER,
        timer: isCertain ? 0 : PREDICTION_WINDOW, // Skip prediction window if certain
        trueOdds: newOdds,
        history: [...state.history, newOdds],
        pendingRiver: null,
        pendingOdds: null,
        pendingOddsPhase: null,
        pendingOddsKey: null,
      });
      
      // If certain, auto-advance after a short delay (only if no hidden cards remain)
      if (isCertain && !hasHiddenCards(state)) {
        setTimeout(() => {
          get().advancePhase();
        }, 100);
      }
      
    } else if (phase === PHASES.RIVER) {
      // Phase 6: DEALER_CARDS - Deal Player 2 + Player 3 cards, then resolve immediately
      const newDeck = [...deck];
      const finalPlayer2Cards =
        player2Cards.length === 2 ? player2Cards : [newDeck.pop()!, newDeck.pop()!];
      const finalPlayer3Cards =
        state.player3Cards.length === 2 ? state.player3Cards : [newDeck.pop()!, newDeck.pop()!];
      
      // All cards dealt, evaluate hands and resolve immediately
      const playerHand = evaluateHand([...player1Cards, ...communityCards]);
      const player2Hand = evaluateHand([...finalPlayer2Cards, ...communityCards]);
      const player3Hand = evaluateHand([...finalPlayer3Cards, ...communityCards]);

      const result = determineWinnerThree(playerHand, player2Hand, player3Hand);
      const winningCards =
        result === 'player1'
          ? player1Cards
          : result === 'player2'
            ? finalPlayer2Cards
            : result === 'player3'
              ? finalPlayer3Cards
              : player1Cards;
      const handDescription = getShortHandDescription(winningCards, communityCards);
      
      set({
        deck: newDeck,
        player2Cards: finalPlayer2Cards,
        player3Cards: finalPlayer3Cards,
        roundResult: result,
        revealedCards: { player1: [true, true], player2: [true, true], player3: [true, true] },
        trueOdds: {
          player1: result === 'player1' ? 100 : 0,
          player2: result === 'player2' ? 100 : 0,
          player3: result === 'player3' ? 100 : 0,
          push: result === 'push' ? 100 : 0,
        },
        history: [...state.history, {
          player1: result === 'player1' ? 100 : 0,
          player2: result === 'player2' ? 100 : 0,
          player3: result === 'player3' ? 100 : 0,
          push: result === 'push' ? 100 : 0,
        }],
        phase: PHASES.RESOLUTION,
        roundHistory: [...state.roundHistory, { winner: result, handDescription }],
      });
      get().resolveRound(result);
    }
  },

  placeBet: (type) => {
    const state = get();
    if (state.phase === PHASES.RESOLUTION || state.balance < state.selectedBetAmount || state.isMarketLocked()) {
      return;
    }
    
    const amount = state.selectedBetAmount;
    const entryOdds = state.getImpliedOdds(type) / 100;
    const shares = calculateShares(amount, entryOdds);
    
    const newPosition: Position = {
      amountPaid: amount,
      shares,
      entryOdds,
    };

    const isFirstBuy = state.firstBuyOutcome === null && type !== 'push';
    let nextFirstBuy = state.firstBuyOutcome;
    let nextChosenPlayer = state.chosenPlayer;
    let nextRevealed = state.revealedCards;

    if (isFirstBuy) {
      nextFirstBuy = type;
      nextChosenPlayer = type;
      nextRevealed = {
        player1: [false, false],
        player2: [false, false],
        player3: [false, false],
      };
      nextRevealed[type] = [true, true];
    }
    
    set({
      balance: state.balance - amount,
      lifetimeVolume: state.lifetimeVolume + amount,
      myPositions: {
        ...state.myPositions,
        [type]: [...state.myPositions[type], newPosition],
      },
      chosenPlayer: nextChosenPlayer,
      revealedCards: nextRevealed,
      firstBuyOutcome: nextFirstBuy,
      pool: {
        ...state.pool,
        [type]: state.pool[type] + (amount * (1 - PLATFORM_FEE)),
      },
    });

    if (isFirstBuy) {
      const updated = get();
      const revealed = getRevealedHoleCards(updated);
      const oddsDeck = buildOddsDeck(updated);
      const newOdds = calculateWinProbabilities(
        revealed.player1,
        revealed.player2,
        revealed.player3,
        updated.communityCards,
        oddsDeck,
        updated.phase
      );
      set({
        trueOdds: newOdds,
        history: [...updated.history, newOdds],
        pendingOdds: null,
        pendingOddsPhase: null,
        pendingOddsKey: null,
      });
    }
    
    state.addActivityFeedItem({
      username: 'YOU',
      type,
      typeLabel: type === 'player1' ? 'Player 1' : type === 'player2' ? 'Player 2' : type === 'player3' ? 'Player 3' : 'Push',
      amount,
      isYou: true,
    });
  },

  sellPosition: (type) => {
    const state = get();
    if (state.phase === PHASES.RESOLUTION || state.myPositions[type].length === 0) {
      return;
    }
    
    const currentOdds = state.getImpliedOdds(type) / 100;
    const totalShares = state.myPositions[type].reduce((sum, pos) => sum + pos.shares, 0);
    const cashOut = totalShares * currentOdds;
    
    set({
      balance: state.balance + cashOut,
      pool: {
        ...state.pool,
        [type]: Math.max(0, state.pool[type] - cashOut),
      },
      myPositions: {
        ...state.myPositions,
        [type]: [],
      },
    });
    
    state.addActivityFeedItem({
      username: 'YOU',
      type,
      typeLabel: type === 'player1' ? 'Player 1' : type === 'player2' ? 'Player 2' : type === 'player3' ? 'Player 3' : 'Push',
      amount: cashOut.toFixed(2),
      isYou: true,
      isSell: true,
    });
  },

  revealCard: (player, index) => {
    const state = get();
    const hasCards =
      player === 'player1'
        ? state.player1Cards.length === 2
        : player === 'player2'
          ? state.player2Cards.length === 2
          : state.player3Cards.length === 2;

    if (!hasCards || state.phase === PHASES.PRE_DEAL || state.phase === PHASES.RESOLUTION) {
      return;
    }

    if (state.revealedCards[player][index]) {
      return;
    }

    const nextRevealed = {
      ...state.revealedCards,
      [player]: state.revealedCards[player].map((value, idx) => (idx === index ? true : value)) as [boolean, boolean],
    };

    set({ revealedCards: nextRevealed });

    const updated = get();
    const revealed = getRevealedHoleCards(updated);
    const oddsDeck = buildOddsDeck(updated);
    const newOdds = calculateWinProbabilities(
      revealed.player1,
      revealed.player2,
      revealed.player3,
      updated.communityCards,
      oddsDeck,
      updated.phase
    );
    set({
      trueOdds: newOdds,
      history: [...updated.history, newOdds],
      pendingOdds: null,
      pendingOddsPhase: null,
      pendingOddsKey: null,
    });
  },

  setSelectedBetAmount: (amount) => set({ selectedBetAmount: amount }),
  setTimer: (time) => set({ timer: time }),
  decrementTimer: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),

  simulateCrowdBet: () => {
    const state = get();
    if (state.phase === PHASES.RESOLUTION) return;
    
    const noise = () => (Math.random() - 0.5) * 6;
    const adjustedOdds = {
      player1: Math.max(5, state.trueOdds.player1 + noise()),
      player2: Math.max(5, state.trueOdds.player2 + noise()),
      player3: Math.max(5, state.trueOdds.player3 + noise()),
      push: Math.max(1, state.trueOdds.push + noise()),
    };
    
    const total = adjustedOdds.player1 + adjustedOdds.player2 + adjustedOdds.player3 + adjustedOdds.push;
    const normalized = {
      player1: adjustedOdds.player1 / total,
      player2: adjustedOdds.player2 / total,
      player3: adjustedOdds.player3 / total,
      push: adjustedOdds.push / total,
    };
    
    const rand = Math.random();
    let type: 'player1' | 'player2' | 'player3' | 'push';
    if (rand < normalized.player1) type = 'player1';
    else if (rand < normalized.player1 + normalized.player2) type = 'player2';
    else if (rand < normalized.player1 + normalized.player2 + normalized.player3) type = 'player3';
    else type = 'push';
    
    const amount = Math.floor(Math.pow(Math.random(), 1.5) * 75) + 5;
    
    set({
      pool: {
        ...state.pool,
        [type]: state.pool[type] + amount,
      },
      crowdBets: {
        ...state.crowdBets,
        [type]: state.crowdBets[type] + amount,
      },
    });
    
    state.addActivityFeedItem({
      username: generateUsername(),
      type,
      typeLabel: type === 'player1' ? 'Player 1' : type === 'player2' ? 'Player 2' : type === 'player3' ? 'Player 3' : 'Push',
      amount,
    });
  },

  rebalanceMarket: (prevTrueOdds: { player1: number; player2: number; player3: number; push: number }) => {
    const state = get();
    
    const playerShift = Math.abs(state.trueOdds.player1 - prevTrueOdds.player1);
    const player2Shift = Math.abs(state.trueOdds.player2 - prevTrueOdds.player2);
    const player3Shift = Math.abs(state.trueOdds.player3 - prevTrueOdds.player3);
    
    if (playerShift > 3 || player2Shift > 3 || player3Shift > 3) {
      set((state) => {
        const crowdTotal =
          state.crowdBets.player1 + state.crowdBets.player2 + state.crowdBets.player3 + state.crowdBets.push;
        
        const rebalanceFactor = 0.9;
        const currentImplied = {
          player1: crowdTotal > 0 ? state.crowdBets.player1 / crowdTotal : 0.25,
          player2: crowdTotal > 0 ? state.crowdBets.player2 / crowdTotal : 0.25,
          player3: crowdTotal > 0 ? state.crowdBets.player3 / crowdTotal : 0.25,
          push: crowdTotal > 0 ? state.crowdBets.push / crowdTotal : 0.25,
        };
        const targetImplied = {
          player1: state.trueOdds.player1 / 100,
          player2: state.trueOdds.player2 / 100,
          player3: state.trueOdds.player3 / 100,
          push: state.trueOdds.push / 100,
        };
        
        const newCrowdBets = {
          player1: Math.max(10, crowdTotal * (currentImplied.player1 + (targetImplied.player1 - currentImplied.player1) * rebalanceFactor)),
          player2: Math.max(10, crowdTotal * (currentImplied.player2 + (targetImplied.player2 - currentImplied.player2) * rebalanceFactor)),
          player3: Math.max(10, crowdTotal * (currentImplied.player3 + (targetImplied.player3 - currentImplied.player3) * rebalanceFactor)),
          push: Math.max(10, crowdTotal * (currentImplied.push + (targetImplied.push - currentImplied.push) * rebalanceFactor)),
        };
        
        const userPoolContribution = {
          player1: state.myPositions.player1.reduce((sum, p) => sum + (p.shares * p.entryOdds), 0),
          player2: state.myPositions.player2.reduce((sum, p) => sum + (p.shares * p.entryOdds), 0),
          player3: state.myPositions.player3.reduce((sum, p) => sum + (p.shares * p.entryOdds), 0),
          push: state.myPositions.push.reduce((sum, p) => sum + (p.shares * p.entryOdds), 0),
        };
        
        return {
          pool: {
            player1: newCrowdBets.player1 + userPoolContribution.player1,
            player2: newCrowdBets.player2 + userPoolContribution.player2,
            player3: newCrowdBets.player3 + userPoolContribution.player3,
            push: newCrowdBets.push + userPoolContribution.push,
          },
          crowdBets: newCrowdBets,
        };
      });
      
      get().addActivityFeedItem({
        username: '📊 MARKET',
        type: 'rebalance',
        typeLabel: 'SHIFT',
        amount: 0,
        isSystem: true,
      });
    }
  },

  addActivityFeedItem: (item) => {
    set((state) => ({
      activityFeed: [{ ...item, id: Date.now() }, ...state.activityFeed.slice(0, 9)],
    }));
  },

  updatePriceHistory: () => {
    set((state) => {
      const newEntry: PriceHistoryPoint = {
        time: Date.now(),
        player1: state.trueOdds.player1,
        player2: state.trueOdds.player2,
        player3: state.trueOdds.player3,
        push: state.trueOdds.push,
      };
      return {
        priceHistory: [...state.priceHistory, newEntry].slice(-100),
      };
    });
  },

  resolveRound: (result) => {
    const state = get();
    const totalPaidAmount = 
      getTotalAmountPaid(state.myPositions.player1) +
      getTotalAmountPaid(state.myPositions.player2) +
      getTotalAmountPaid(state.myPositions.player3) +
      getTotalAmountPaid(state.myPositions.push);
    
    const payout = getPotentialPayout(state.myPositions[result]);
    const profit = payout - totalPaidAmount;
    
    set({
      roundProfit: profit,
      balance: state.balance + payout,
      // roundHistory is already updated in advancePhase when resolving
    });
  },

  nextRound: () => {
    set((state) => ({ roundNumber: state.roundNumber + 1 }));
    get().startNewRound();
  },

  // Computed getters
  getMyBetTotal: (type) => getTotalAmountPaid(get().myPositions[type]),
  getTotalMyBets: () => {
    const state = get();
    return (
      state.getMyBetTotal('player1') +
      state.getMyBetTotal('player2') +
      state.getMyBetTotal('player3') +
      state.getMyBetTotal('push')
    );
  },
  getPositionValue: (type) => {
    const state = get();
    if (state.myPositions[type].length === 0) return 0;
    const currentOdds = state.getImpliedOdds(type) / 100;
    const totalShares = state.myPositions[type].reduce((sum, pos) => sum + pos.shares, 0);
    return totalShares * currentOdds;
  },
  getTotalShares: (type) => getTotalShares(get().myPositions[type]),
  getPotentialPayout: (type) => getPotentialPayout(get().myPositions[type]),
  getUnrealizedPnL: (type) => {
    const state = get();
    const betAmount = state.getMyBetTotal(type);
    if (betAmount === 0) return 0;
    return state.getPositionValue(type) - betAmount;
  },
  getImpliedOdds: (type) => {
    const state = get();
    // Prices should be based on true odds, not pool distribution
    // Pool distribution affects payouts, but displayed price reflects true probability
    return state.trueOdds[type];
  },
  isMarketLocked: () => {
    const state = get();
    if (state.phase === PHASES.RESOLUTION) return true;
    if (state.playerFolded) return true;
    // Lock betting if any outcome is certain (100% probability)
    if (
      state.trueOdds.player1 >= 100 ||
      state.trueOdds.player2 >= 100 ||
      state.trueOdds.player3 >= 100 ||
      state.trueOdds.push >= 100
    ) {
      return true;
    }
    return false;
  },
}));
