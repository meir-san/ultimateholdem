import { create } from 'zustand';
import type { GameState, Outcome, ActivityFeedItem, PriceHistoryPoint, Position } from '../types';
import { PHASES, INITIAL_BALANCE, INITIAL_POOL_BASE, INITIAL_ODDS, PREDICTION_WINDOW, CARD_DEAL_DELAY, PLATFORM_FEE } from '../config/constants';
import { createDeck } from '../utils/cardUtils';
import { calculateWinProbabilities } from '../utils/winProbability';
import { evaluateHand, determineWinner } from '../utils/pokerHands';
import { calculateShares, getTotalAmountPaid, getTotalShares, getPotentialPayout } from '../utils/marketPricing';
import { getShortHandDescription } from '../utils/handDescription';

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
  lifetimeVolume: 0,
  pool: { player: 0, dealer: 0, push: 0 },
  crowdBets: { player: 0, dealer: 0, push: 0 },
  activityFeed: [],
  priceHistory: [],
  showReferences: true,
  roundHistory: [],

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
      // Don't reset roundHistory - keep accumulating
    });
  },

  advancePhase: () => {
    const state = get();
    const { phase, deck, playerCards, communityCards } = state;

    if (phase === PHASES.PRE_DEAL) {
      // Phase 2: PLAYER_CARDS - Deal both player cards with delay between them
      const newDeck = [...deck];
      const pCard1 = newDeck.pop()!;
      
      // Deal first player card
      set({
        deck: newDeck,
        playerCards: [pCard1],
        phase: PHASES.PLAYER_CARDS,
        timer: 0, // No prediction window yet
      });
      
      // Deal second player card after delay
      setTimeout(() => {
        const state = get();
        const newDeck = [...state.deck];
        const pCard2 = newDeck.pop()!;
        const finalPlayerCards = [...state.playerCards, pCard2];
        
        const newOdds = calculateWinProbabilities(
          finalPlayerCards,
          [],
          [],
          newDeck,
          PHASES.PLAYER_CARDS
        );
        
        // Check if outcome is certain (100%)
        const isCertain = newOdds.player >= 100 || newOdds.dealer >= 100 || newOdds.push >= 100;
        
        set({
          deck: newDeck,
          playerCards: finalPlayerCards,
          timer: isCertain ? 0 : PREDICTION_WINDOW, // Prediction window after both cards
          trueOdds: newOdds,
          history: [...state.history, newOdds],
        });
        
        // If certain, auto-advance after a short delay
        if (isCertain) {
          setTimeout(() => {
            get().advancePhase();
          }, 100);
        }
      }, CARD_DEAL_DELAY);
      
    } else if (phase === PHASES.PLAYER_CARDS) {
      // Phase 3: FLOP - Deal all three flop cards with delays between them
      const newDeck = [...deck];
      const flopCard1 = newDeck.pop()!;
      
      // Deal first flop card
      set({
        deck: newDeck,
        communityCards: [flopCard1],
        phase: PHASES.FLOP,
        timer: 0, // No prediction window yet
      });
      
      // Deal second flop card after delay
      setTimeout(() => {
        const state = get();
        const newDeck = [...state.deck];
        const flopCard2 = newDeck.pop()!;
        
        set({
          deck: newDeck,
          communityCards: [...state.communityCards, flopCard2],
        });
        
        // Deal third flop card after delay
        setTimeout(() => {
          const state = get();
          const newDeck = [...state.deck];
          const flopCard3 = newDeck.pop()!;
          const flop = [...state.communityCards, flopCard3];
          
          const newOdds = calculateWinProbabilities(
            state.playerCards,
            [],
            flop,
            newDeck,
            PHASES.FLOP
          );
          
          // Check if outcome is certain (100%)
          const isCertain = newOdds.player >= 100 || newOdds.dealer >= 100 || newOdds.push >= 100;
          
          set({
            deck: newDeck,
            communityCards: flop,
            timer: isCertain ? 0 : PREDICTION_WINDOW, // Prediction window after all three cards
            trueOdds: newOdds,
            history: [...state.history, newOdds],
          });
          
          // If certain, auto-advance after a short delay
          if (isCertain) {
            setTimeout(() => {
              get().advancePhase();
            }, 100);
          }
        }, CARD_DEAL_DELAY);
      }, CARD_DEAL_DELAY);
      
    } else if (phase === PHASES.FLOP) {
      // Phase 4: TURN - Deal turn card
      const newDeck = [...deck];
      const turn = newDeck.pop()!;
      
      const newOdds = calculateWinProbabilities(
        playerCards,
        [],
        [...communityCards, turn],
        newDeck,
        PHASES.TURN
      );
      
      // Check if outcome is certain (100%)
      const isCertain = newOdds.player >= 100 || newOdds.dealer >= 100 || newOdds.push >= 100;
      
      set({
        deck: newDeck,
        communityCards: [...communityCards, turn],
        phase: PHASES.TURN,
        timer: isCertain ? 0 : PREDICTION_WINDOW, // Skip prediction window if certain
        trueOdds: newOdds,
        history: [...state.history, newOdds],
      });
      
      // If certain, auto-advance after a short delay
      if (isCertain) {
        setTimeout(() => {
          get().advancePhase();
        }, 100);
      }
      
    } else if (phase === PHASES.TURN) {
      // Phase 5: RIVER - Deal river card
      const newDeck = [...deck];
      const river = newDeck.pop()!;
      const newCommunity = [...communityCards, river];
      
      const newOdds = calculateWinProbabilities(
        playerCards,
        [],
        newCommunity,
        newDeck,
        PHASES.RIVER
      );
      
      // Check if outcome is certain (100%)
      const isCertain = newOdds.player >= 100 || newOdds.dealer >= 100 || newOdds.push >= 100;
      
      set({
        deck: newDeck,
        communityCards: newCommunity,
        phase: PHASES.RIVER,
        timer: isCertain ? 0 : PREDICTION_WINDOW, // Skip prediction window if certain
        trueOdds: newOdds,
        history: [...state.history, newOdds],
      });
      
      // If certain, auto-advance after a short delay
      if (isCertain) {
        setTimeout(() => {
          get().advancePhase();
        }, 100);
      }
      
    } else if (phase === PHASES.RIVER) {
      // Phase 6: DEALER_CARDS - Deal both dealer cards with delay between them
      const newDeck = [...deck];
      const dCard1 = newDeck.pop()!;
      
      // Deal first dealer card
      set({
        deck: newDeck,
        dealerCards: [dCard1],
        phase: PHASES.DEALER_CARDS,
        timer: 0, // No prediction window
      });
      
      // Deal second dealer card after delay, then resolve immediately
      setTimeout(() => {
        const state = get();
        const newDeck = [...state.deck];
        const dCard2 = newDeck.pop()!;
        
        // All cards dealt, evaluate hands and resolve immediately
        const playerHand = evaluateHand([...state.playerCards, ...state.communityCards]);
        const dealerHand = evaluateHand([...state.dealerCards, dCard2, ...state.communityCards]);
        
        // Check dealer qualification (needs pair or better)
        if (dealerHand.rank < 2) {
          // Dealer doesn't qualify - player wins
          const handDescription = getShortHandDescription(state.playerCards, state.communityCards);
          set({
            deck: newDeck,
            dealerCards: [...state.dealerCards, dCard2],
            roundResult: 'player',
            trueOdds: { player: 100, dealer: 0, push: 0 },
            history: [...state.history, { player: 100, dealer: 0, push: 0 }],
            phase: PHASES.RESOLUTION,
            roundHistory: [...state.roundHistory, { winner: 'player', handDescription }],
          });
          get().resolveRound('player');
        } else {
          const result = determineWinner(playerHand, dealerHand);
          const winningCards = result === 'player' ? state.playerCards : [...state.dealerCards, dCard2];
          const handDescription = getShortHandDescription(winningCards, state.communityCards);
          
          set({
            deck: newDeck,
            dealerCards: [...state.dealerCards, dCard2],
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
            roundHistory: [...state.roundHistory, { winner: result, handDescription }],
          });
          get().resolveRound(result);
        }
      }, CARD_DEAL_DELAY);
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
      lifetimeVolume: state.lifetimeVolume + amount,
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
    // Prices should be based on true odds, not pool distribution
    // Pool distribution affects payouts, but displayed price reflects true probability
    return state.trueOdds[type];
  },
  isMarketLocked: () => {
    const state = get();
    if (state.phase === PHASES.RESOLUTION) return true;
    if (state.playerFolded) return true;
    // Lock betting if any outcome is certain (100% probability)
    if (state.trueOdds.player >= 100 || state.trueOdds.dealer >= 100 || state.trueOdds.push >= 100) {
      return true;
    }
    return false;
  },
}));
