import { create } from 'zustand';
import type { GameState, Outcome, ActivityFeedItem, PriceHistoryPoint, Position } from '../types';
import { PHASES, INITIAL_BALANCE, INITIAL_POOL_BASE, INITIAL_ODDS, PREDICTION_WINDOW, PLATFORM_FEE } from '../config/constants';
import { createDeck } from '../utils/cardUtils';
import { calculateWinProbabilities } from '../utils/winProbability';
import { calculateBustProbability } from '../utils/cardUtils';
import { shouldPlayerHit } from '../utils/blackjackStrategy';
import { calculateTotal } from '../utils/cardUtils';
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
  getPlayerTotal: () => number;
  getDealerVisibleTotal: () => number;
  getDealerTotal: () => number;
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
  dealerHiddenCard: null,
  phase: PHASES.PRE_DEAL,
  timer: PREDICTION_WINDOW,
  trueOdds: INITIAL_ODDS,
  bustRisk: 0,
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
      dealerHiddenCard: null,
      phase: PHASES.PRE_DEAL,
      timer: PREDICTION_WINDOW,
      trueOdds: INITIAL_ODDS,
      history: [INITIAL_ODDS],
      bustRisk: 0,
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
    const { phase, deck, playerCards, dealerCards, dealerHiddenCard } = state;

    if (phase === PHASES.PRE_DEAL) {
      const newDeck = [...deck];
      const pCard1 = newDeck.pop()!;
      
      set({ deck: newDeck, playerCards: [pCard1] });
      
      const newOdds = calculateWinProbabilities([pCard1], false, [], true, newDeck);
      set({
        trueOdds: newOdds,
        history: [...state.history, newOdds],
        phase: PHASES.PLAYER_CARD_1,
        timer: PREDICTION_WINDOW,
      });
      
    } else if (phase === PHASES.PLAYER_CARD_1) {
      const newDeck = [...deck];
      const dCard1 = newDeck.pop()!;
      
      set({ deck: newDeck, dealerCards: [dCard1] });
      
      const newOdds = calculateWinProbabilities(playerCards, false, [dCard1], true, newDeck);
      set({
        trueOdds: newOdds,
        history: [...state.history, newOdds],
        phase: PHASES.DEALER_CARD_1,
        timer: PREDICTION_WINDOW,
      });
      
    } else if (phase === PHASES.DEALER_CARD_1) {
      const newDeck = [...deck];
      const pCard2 = newDeck.pop()!;
      const dHidden = newDeck.pop()!;
      const newPlayerCards = [...playerCards, pCard2];
      
      set({
        deck: newDeck,
        playerCards: newPlayerCards,
        dealerHiddenCard: dHidden,
      });
      
      const pTotal = calculateTotal(newPlayerCards);
      const newOdds = calculateWinProbabilities(newPlayerCards, false, dealerCards, true, newDeck);
      set({
        trueOdds: newOdds,
        history: [...state.history, newOdds],
        bustRisk: calculateBustProbability(pTotal, newDeck),
        phase: PHASES.PLAYER_CARD_2,
        timer: PREDICTION_WINDOW,
      });
      
    } else if (phase === PHASES.PLAYER_CARD_2 || phase === PHASES.PLAYER_HITTING) {
      const dealerUpcard = dealerCards[0];
      if (shouldPlayerHit(playerCards, dealerUpcard)) {
        const newDeck = [...deck];
        const newCard = newDeck.pop()!;
        const newPlayerCards = [...playerCards, newCard];
        const newTotal = calculateTotal(newPlayerCards);
        
        set({ deck: newDeck, playerCards: newPlayerCards });
        
        if (newTotal > 21) {
          set({
            trueOdds: { player: 0, dealer: 100, push: 0 },
            history: [...state.history, { player: 0, dealer: 100, push: 0 }],
            bustRisk: 0,
            roundResult: 'dealer',
            phase: PHASES.RESOLUTION,
          });
          get().resolveRound('dealer');
        } else {
          const newOdds = calculateWinProbabilities(newPlayerCards, false, dealerCards, true, newDeck);
          set({
            trueOdds: newOdds,
            history: [...state.history, newOdds],
            bustRisk: shouldPlayerHit(newPlayerCards, dealerUpcard) ? calculateBustProbability(newTotal, newDeck) : 0,
            phase: PHASES.PLAYER_HITTING,
            timer: PREDICTION_WINDOW,
          });
        }
      } else {
        // Player stands - reveal dealer card
        const fullDealerCards = [...dealerCards, dealerHiddenCard!];
        const revealedDealerTotal = calculateTotal(fullDealerCards);
        
        set({
          dealerCards: fullDealerCards,
          dealerHiddenCard: null,
          bustRisk: 0,
        });
        
        const playerTotal = calculateTotal(playerCards);
        if (revealedDealerTotal >= 17) {
          // Both standing - outcome is certain
          let result: Outcome;
          if (revealedDealerTotal > playerTotal) {
            result = 'dealer';
            set({ trueOdds: { player: 0, dealer: 100, push: 0 } });
          } else if (playerTotal > revealedDealerTotal) {
            result = 'player';
            set({ trueOdds: { player: 100, dealer: 0, push: 0 } });
          } else {
            result = 'push';
            set({ trueOdds: { player: 0, dealer: 0, push: 100 } });
          }
          set({
            history: [...state.history, { player: result === 'player' ? 100 : 0, dealer: result === 'dealer' ? 100 : 0, push: result === 'push' ? 100 : 0 }],
            roundResult: result,
            phase: PHASES.RESOLUTION,
          });
          get().resolveRound(result);
        } else {
          // Dealer must still draw
          const newOdds = calculateWinProbabilities(playerCards, false, fullDealerCards, false, deck);
          set({
            trueOdds: newOdds,
            history: [...state.history, newOdds],
            phase: PHASES.DEALER_REVEAL,
            timer: PREDICTION_WINDOW,
          });
        }
      }
      
    } else if (phase === PHASES.DEALER_REVEAL || phase === PHASES.DEALER_HITTING) {
      const currentDealerTotal = calculateTotal(dealerCards);
      
      if (currentDealerTotal < 17) {
        const newDeck = [...deck];
        const newCard = newDeck.pop()!;
        const newDealerCards = [...dealerCards, newCard];
        const newTotal = calculateTotal(newDealerCards);
        
        set({ deck: newDeck, dealerCards: newDealerCards });
        
        const playerTotal = calculateTotal(playerCards);
        if (newTotal > 21) {
          set({
            trueOdds: { player: 100, dealer: 0, push: 0 },
            history: [...state.history, { player: 100, dealer: 0, push: 0 }],
            roundResult: 'player',
            phase: PHASES.RESOLUTION,
          });
          get().resolveRound('player');
        } else if (newTotal >= 17) {
          let result: Outcome;
          if (newTotal > playerTotal) {
            result = 'dealer';
            set({ trueOdds: { player: 0, dealer: 100, push: 0 } });
          } else if (playerTotal > newTotal) {
            result = 'player';
            set({ trueOdds: { player: 100, dealer: 0, push: 0 } });
          } else {
            result = 'push';
            set({ trueOdds: { player: 0, dealer: 0, push: 100 } });
          }
          set({
            roundResult: result,
            phase: PHASES.RESOLUTION,
          });
          get().resolveRound(result);
        } else {
          const newOdds = calculateWinProbabilities(playerCards, false, newDealerCards, false, newDeck);
          set({
            trueOdds: newOdds,
            history: [...state.history, newOdds],
            phase: PHASES.DEALER_HITTING,
            timer: PREDICTION_WINDOW,
          });
        }
      } else {
        const playerTotal = calculateTotal(playerCards);
        let result: Outcome;
        if (currentDealerTotal > playerTotal) {
          result = 'dealer';
          set({ trueOdds: { player: 0, dealer: 100, push: 0 } });
        } else if (playerTotal > currentDealerTotal) {
          result = 'player';
          set({ trueOdds: { player: 100, dealer: 0, push: 0 } });
        } else {
          result = 'push';
          set({ trueOdds: { player: 0, dealer: 0, push: 100 } });
        }
        set({
          roundResult: result,
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
    
    // Calculate current value: shares × current price (EXACTLY like original)
    const currentOdds = state.getImpliedOdds(type) / 100;
    const totalShares = state.myPositions[type].reduce((sum, pos) => sum + pos.shares, 0);
    const cashOut = totalShares * currentOdds;
    
    // Remove value from pool and clear positions
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
    
    // Check for any meaningful shift (more than 3% change)
    const playerShift = Math.abs(state.trueOdds.player - prevTrueOdds.player);
    const dealerShift = Math.abs(state.trueOdds.dealer - prevTrueOdds.dealer);
    
    if (playerShift > 3 || dealerShift > 3) {
      // New information! Crowd rebalances aggressively
      // Only rebalance the CROWD portion, preserve user bets
      set((state) => {
        const crowdTotal = state.crowdBets.player + state.crowdBets.dealer + state.crowdBets.push;
        
        // Target distribution based on true odds (high catch-up factor)
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
        
        // Interpolate towards target - only affects crowd money
        const newCrowdBets = {
          player: Math.max(10, crowdTotal * (currentImplied.player + (targetImplied.player - currentImplied.player) * rebalanceFactor)),
          dealer: Math.max(10, crowdTotal * (currentImplied.dealer + (targetImplied.dealer - currentImplied.dealer) * rebalanceFactor)),
          push: Math.max(10, crowdTotal * (currentImplied.push + (targetImplied.push - currentImplied.push) * rebalanceFactor)),
        };
        
        // Update pool to be crowd bets + user contributions (preserved)
        // User's pool contribution = shares × entryOdds (the effective amount that entered the pool)
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
      
      // Add rebalance event to feed
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
  getPlayerTotal: () => calculateTotal(get().playerCards),
  getDealerVisibleTotal: () => calculateTotal(get().dealerCards),
  getDealerTotal: () => {
    const state = get();
    if (state.dealerHiddenCard) {
      return calculateTotal([...state.dealerCards, state.dealerHiddenCard]);
    }
    return calculateTotal(state.dealerCards);
  },
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
    return state.trueOdds[type];
  },
  isMarketLocked: () => {
    const state = get();
    if (state.phase === PHASES.RESOLUTION || 
        state.phase === PHASES.PRE_DEAL ||
        state.phase === PHASES.PLAYER_CARD_1 ||
        state.phase === PHASES.DEALER_CARD_1 ||
        state.phase === PHASES.PLAYER_CARD_2) {
      return false;
    }
    const playerTotal = state.getPlayerTotal();
    if (playerTotal > 21) return true;
    if (!state.dealerHiddenCard && state.dealerCards.length > 0 && state.getDealerTotal() > 21) return true;
    return false;
  },
}));
