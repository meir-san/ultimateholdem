import { create } from 'zustand';
import type { GameState, Outcome, ActivityFeedItem, PriceHistoryPoint, Position } from '../types';
import { PHASES, INITIAL_BALANCE, INITIAL_POOL_BASE, INITIAL_ODDS, PREDICTION_WINDOW, PLATFORM_FEE } from '../config/constants';
import { createDeck } from '../utils/cardUtils';
import { calculateWinProbabilities } from '../utils/winProbability';
import { shouldRaise4x, shouldRaise2x, shouldRaise1x } from '../utils/uthStrategy';
import { evaluateHand, determineWinner } from '../utils/pokerHands';
import { calculateShares, getTotalAmountPaid, getTotalShares, getPotentialPayout } from '../utils/marketPricing';

interface GameStore extends GameState {
  // Actions
  startNewRound: () => void;
  advancePhase: () => void;
  placeBet: (type: 'player' | 'dealer' | 'push') => void;
  sellPosition: (type: 'player' | 'dealer' | 'push') => void;
  setSelectedBetAmount: (amount: number) => void;
  setTimer: (time: number) => void;
  decrementTimer: () => void;
  simulateCrowdBet: () => void;
  rebalanceMarket: (prevTrueOdds: { player: number; dealer: number; push: number }) => void;
  addActivityFeedItem: (item: Omit<ActivityFeedItem, 'id'>) => void;
  updatePriceHistory: () => void;
  resolveRound: (result: Outcome) => void;
  nextRound: () => void;
  
  // Computed getters
  getMyBetTotal: (type: 'player' | 'dealer' | 'push') => number;
  getTotalMyBets: () => number;
  getPositionValue: (type: 'player' | 'dealer' | 'push') => number;
  getTotalShares: (type: 'player' | 'dealer' | 'push') => number;
  getPotentialPayout: (type: 'player' | 'dealer' | 'push') => number;
  getUnrealizedPnL: (type: 'player' | 'dealer' | 'push') => number;
  getImpliedOdds: (type: 'player' | 'dealer' | 'push') => number;
  isMarketLocked: () => boolean;
}

const generateUsername = (): string => {
  const adjectives = ['Lucky', 'Smart', 'Bold', 'Quick', 'Wise', 'Sharp', 'Slick', 'Hot', 'Cool', 'Big'];
  const nouns = ['Trader', 'Shark', 'Wolf', 'Bull', 'Bear', 'Whale', 'Fish', 'Cat', 'Dog', 'Fox'];
  const num = Math.floor(Math.random() * 99);
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  deck: [],
  playerCards: [],
  dealerCards: [],
  communityCards: [],
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
  myPositions: { player: [], dealer: [], push: [] },
  selectedBetAmount: 10,
  pool: { player: 0, dealer: 0, push: 0 },
  crowdBets: { player: 0, dealer: 0, push: 0 },
  activityFeed: [],
  priceHistory: [],
  showReferences: true,

  startNewRound: () => {
    const newDeck = createDeck();
    const initialPool = {
      player: Math.round(INITIAL_POOL_BASE * (INITIAL_ODDS.player / 100) + (Math.random() - 0.5) * 50),
      dealer: Math.round(INITIAL_POOL_BASE * (INITIAL_ODDS.dealer / 100) + (Math.random() - 0.5) * 50),
      push: Math.round(INITIAL_POOL_BASE * (INITIAL_ODDS.push / 100) + (Math.random() - 0.5) * 20)
    };

    set({
      deck: newDeck,
      playerCards: [],
      dealerCards: [],
      communityCards: [],
      phase: PHASES.PRE_DEAL,
      timer: PREDICTION_WINDOW,
      playerRaisedPreflop: false,
      playerRaisedPostflop: false,
      playerRaisedTurnRiver: false,
      playerFolded: false,
      trueOdds: INITIAL_ODDS,
      history: [INITIAL_ODDS],
      roundResult: null,
      myPositions: { player: [], dealer: [], push: [] },
      selectedBetAmount: 10,
      roundProfit: null,
      activityFeed: [],
      priceHistory: [],
      pool: initialPool,
      crowdBets: initialPool,
    });
  },

  advancePhase: () => {
    const state = get();
    const { phase, deck, playerCards, dealerCards, communityCards } = state;

    if (phase === PHASES.PRE_DEAL) {
      // Deal hole cards
      const newDeck = [...deck];
      const pCard1 = newDeck.pop()!;
      const dCard1 = newDeck.pop()!;
      const pCard2 = newDeck.pop()!;
      const dCard2 = newDeck.pop()!;
      
      set({
        deck: newDeck,
        playerCards: [pCard1, pCard2],
        dealerCards: [dCard1, dCard2],
        phase: PHASES.HOLE_CARDS,
        timer: PREDICTION_WINDOW,
      });
      
      const newOdds = calculateWinProbabilities(
        [pCard1, pCard2],
        [dCard1, dCard2],
        [],
        newDeck,
        PHASES.HOLE_CARDS
      );
      set({
        trueOdds: newOdds,
        history: [...state.history, newOdds],
      });
      
    } else if (phase === PHASES.HOLE_CARDS) {
      // Pre-flop decision
      const shouldRaise = shouldRaise4x(playerCards);
      
      set({
        playerRaisedPreflop: shouldRaise,
        phase: PHASES.PREFLOP_DECISION,
        timer: PREDICTION_WINDOW,
      });
      
      // Auto-advance after decision
      setTimeout(() => {
        get().advancePhase();
      }, 1000);
      
    } else if (phase === PHASES.PREFLOP_DECISION) {
      // Deal flop
      const newDeck = [...deck];
      const flop = [newDeck.pop()!, newDeck.pop()!, newDeck.pop()!];
      
      set({
        deck: newDeck,
        communityCards: flop,
        phase: PHASES.FLOP,
        timer: PREDICTION_WINDOW,
      });
      
      const newOdds = calculateWinProbabilities(
        playerCards,
        dealerCards,
        flop,
        newDeck,
        PHASES.FLOP
      );
      set({
        trueOdds: newOdds,
        history: [...state.history, newOdds],
      });
      
    } else if (phase === PHASES.FLOP) {
      // Post-flop decision (if didn't raise pre-flop)
      if (!state.playerRaisedPreflop) {
        const shouldRaise = shouldRaise2x(playerCards, communityCards);
        
        set({
          playerRaisedPostflop: shouldRaise,
          phase: PHASES.POSTFLOP_DECISION,
          timer: PREDICTION_WINDOW,
        });
        
        setTimeout(() => {
          get().advancePhase();
        }, 1000);
      } else {
        // Already raised pre-flop, skip to turn/river
        get().advancePhase();
      }
      
    } else if (phase === PHASES.POSTFLOP_DECISION) {
      // Deal turn and river
      const newDeck = [...deck];
      const turn = newDeck.pop()!;
      const river = newDeck.pop()!;
      const newCommunity = [...communityCards, turn, river];
      
      set({
        deck: newDeck,
        communityCards: newCommunity,
        phase: PHASES.TURN_RIVER,
        timer: PREDICTION_WINDOW,
      });
      
      const newOdds = calculateWinProbabilities(
        playerCards,
        dealerCards,
        newCommunity,
        newDeck,
        PHASES.TURN_RIVER
      );
      set({
        trueOdds: newOdds,
        history: [...state.history, newOdds],
      });
      
    } else if (phase === PHASES.TURN_RIVER) {
      // Final decision (if checked twice)
      if (!state.playerRaisedPreflop && !state.playerRaisedPostflop) {
        const shouldRaise = shouldRaise1x(playerCards, communityCards);
        
        if (!shouldRaise) {
          set({
            playerFolded: true,
            roundResult: 'dealer',
            phase: PHASES.RESOLUTION,
          });
          get().resolveRound('dealer');
        } else {
          set({
            playerRaisedTurnRiver: true,
            phase: PHASES.FINAL_DECISION,
            timer: PREDICTION_WINDOW,
          });
          
          setTimeout(() => {
            get().advancePhase();
          }, 1000);
        }
      } else {
        // Already raised, go to showdown
        get().advancePhase();
      }
      
    } else if (phase === PHASES.FINAL_DECISION) {
      // Showdown
      set({
        phase: PHASES.SHOWDOWN,
        timer: PREDICTION_WINDOW,
      });
      
      setTimeout(() => {
        get().advancePhase();
      }, 2000);
      
    } else if (phase === PHASES.SHOWDOWN) {
      // Evaluate hands
      const playerHand = evaluateHand([...playerCards, ...communityCards]);
      const dealerHand = evaluateHand([...dealerCards, ...communityCards]);
      
      // Check dealer qualification (needs pair or better)
      if (dealerHand.rank < 2) {
        // Dealer doesn't qualify - player wins
        set({
          roundResult: 'player',
          trueOdds: { player: 100, dealer: 0, push: 0 },
          history: [...state.history, { player: 100, dealer: 0, push: 0 }],
          phase: PHASES.RESOLUTION,
        });
        get().resolveRound('player');
      } else {
        const result = determineWinner(playerHand, dealerHand);
        set({
          roundResult: result,
          trueOdds: {
            player: result === 'player' ? 100 : 0,
            dealer: result === 'dealer' ? 100 : 0,
            push: result === 'push' ? 100 : 0,
          },
          history: [...state.history, {
            player: result === 'player' ? 100 : 0,
            dealer: result === 'dealer' ? 100 : 0,
            push: result === 'push' ? 100 : 0,
          }],
          phase: PHASES.RESOLUTION,
        });
        get().resolveRound(result);
      }
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
    
    set({
      balance: state.balance - amount,
      myPositions: {
        ...state.myPositions,
        [type]: [...state.myPositions[type], newPosition],
      },
      pool: {
        ...state.pool,
        [type]: state.pool[type] + (amount * (1 - PLATFORM_FEE)),
      },
    });
    
    state.addActivityFeedItem({
      username: 'YOU',
      type,
      typeLabel: type === 'player' ? 'Player' : type === 'dealer' ? 'Dealer' : 'Push',
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
      typeLabel: type === 'player' ? 'Player' : type === 'dealer' ? 'Dealer' : 'Push',
      amount: cashOut.toFixed(2),
      isYou: true,
      isSell: true,
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
      player: Math.max(5, state.trueOdds.player + noise()),
      dealer: Math.max(5, state.trueOdds.dealer + noise()),
      push: Math.max(1, state.trueOdds.push + noise()),
    };
    
    const total = adjustedOdds.player + adjustedOdds.dealer + adjustedOdds.push;
    const normalized = {
      player: adjustedOdds.player / total,
      dealer: adjustedOdds.dealer / total,
      push: adjustedOdds.push / total,
    };
    
    const rand = Math.random();
    let type: 'player' | 'dealer' | 'push';
    if (rand < normalized.player) type = 'player';
    else if (rand < normalized.player + normalized.dealer) type = 'dealer';
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
      typeLabel: type === 'player' ? 'Player' : type === 'dealer' ? 'Dealer' : 'Push',
      amount,
    });
  },

  rebalanceMarket: (prevTrueOdds: { player: number; dealer: number; push: number }) => {
    const state = get();
    
    const playerShift = Math.abs(state.trueOdds.player - prevTrueOdds.player);
    const dealerShift = Math.abs(state.trueOdds.dealer - prevTrueOdds.dealer);
    
    if (playerShift > 3 || dealerShift > 3) {
      set((state) => {
        const crowdTotal = state.crowdBets.player + state.crowdBets.dealer + state.crowdBets.push;
        
        const rebalanceFactor = 0.9;
        const currentImplied = {
          player: crowdTotal > 0 ? state.crowdBets.player / crowdTotal : 0.33,
          dealer: crowdTotal > 0 ? state.crowdBets.dealer / crowdTotal : 0.33,
          push: crowdTotal > 0 ? state.crowdBets.push / crowdTotal : 0.33,
        };
        const targetImplied = {
          player: state.trueOdds.player / 100,
          dealer: state.trueOdds.dealer / 100,
          push: state.trueOdds.push / 100,
        };
        
        const newCrowdBets = {
          player: Math.max(10, crowdTotal * (currentImplied.player + (targetImplied.player - currentImplied.player) * rebalanceFactor)),
          dealer: Math.max(10, crowdTotal * (currentImplied.dealer + (targetImplied.dealer - currentImplied.dealer) * rebalanceFactor)),
          push: Math.max(10, crowdTotal * (currentImplied.push + (targetImplied.push - currentImplied.push) * rebalanceFactor)),
        };
        
        const userPoolContribution = {
          player: state.myPositions.player.reduce((sum, p) => sum + (p.shares * p.entryOdds), 0),
          dealer: state.myPositions.dealer.reduce((sum, p) => sum + (p.shares * p.entryOdds), 0),
          push: state.myPositions.push.reduce((sum, p) => sum + (p.shares * p.entryOdds), 0),
        };
        
        return {
          pool: {
            player: newCrowdBets.player + userPoolContribution.player,
            dealer: newCrowdBets.dealer + userPoolContribution.dealer,
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
        player: state.trueOdds.player,
        dealer: state.trueOdds.dealer,
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
      getTotalAmountPaid(state.myPositions.player) +
      getTotalAmountPaid(state.myPositions.dealer) +
      getTotalAmountPaid(state.myPositions.push);
    
    const payout = getPotentialPayout(state.myPositions[result]);
    const profit = payout - totalPaidAmount;
    
    set({
      roundProfit: profit,
      balance: state.balance + payout,
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
    return state.getMyBetTotal('player') + state.getMyBetTotal('dealer') + state.getMyBetTotal('push');
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
    const totalPool = state.pool.player + state.pool.dealer + state.pool.push;
    if (totalPool === 0) return 33.33;
    return (state.pool[type] / totalPool) * 100;
  },
  isMarketLocked: () => {
    const state = get();
    if (state.phase === PHASES.RESOLUTION) return true;
    if (state.playerFolded) return true;
    return false;
  },
}));
