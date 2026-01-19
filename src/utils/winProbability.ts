import type { Card } from '../types';
import type { TrueOdds } from '../types';
import type { Phase } from '../config/constants';
import {
  MONTE_CARLO_SIMULATIONS,
  MONTE_CARLO_SIMULATIONS_PRE_DEAL,
  PHASES,
  PRE_DEAL_ODDS,
} from '../config/constants';
import { shuffle } from './cardUtils';
import { evaluateHand, determineWinner } from './pokerHands';

/**
 * Generates all 2-card combinations from deck (for exact enumeration)
 */
function generateTwoCardCombinations(deck: Card[]): [Card, Card][] {
  const combinations: [Card, Card][] = [];
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      combinations.push([deck[i], deck[j]]);
    }
  }
  return combinations;
}

/**
 * Calculates exact win probabilities when only dealer cards are unknown (RIVER phase)
 * Enumerates all possible dealer hole card combinations
 */
function calculateExactProbabilities(
  playerHoleCards: Card[],
  dealerHoleCards: Card[],
  communityCards: Card[],
  deck: Card[]
): TrueOdds {
  let playerWins = 0;
  let dealerWins = 0;
  let pushes = 0;

  const remainingCommunityCount = 5 - communityCards.length;

  const tally = (playerHand: ReturnType<typeof evaluateHand>, finalDealer: Card[], finalCommunity: Card[]) => {
    const dealerHand = evaluateHand([...finalDealer, ...finalCommunity]);
    const result = determineWinner(playerHand, dealerHand);
    if (result === 'player') playerWins++;
    else if (result === 'dealer') dealerWins++;
    else pushes++;
  };

  // Dealer already known
  if (dealerHoleCards.length === 2) {
    let total = 0;
    if (remainingCommunityCount === 0) {
      total = 1;
      const playerHand = evaluateHand([...playerHoleCards, ...communityCards]);
      tally(playerHand, dealerHoleCards, communityCards);
      return {
        player: (playerWins / total) * 100,
        dealer: (dealerWins / total) * 100,
        push: (pushes / total) * 100,
      };
    }

    if (remainingCommunityCount === 1) {
      for (const card of deck) {
        total++;
        const finalCommunity = [...communityCards, card];
        const playerHand = evaluateHand([...playerHoleCards, ...finalCommunity]);
        tally(playerHand, dealerHoleCards, finalCommunity);
      }
    } else if (remainingCommunityCount === 2) {
      for (let i = 0; i < deck.length - 1; i++) {
        for (let j = i + 1; j < deck.length; j++) {
          const c1 = deck[i];
          const c2 = deck[j];
        total++;
        const finalCommunity = [...communityCards, c1, c2];
        const playerHand = evaluateHand([...playerHoleCards, ...finalCommunity]);
        tally(playerHand, dealerHoleCards, finalCommunity);
        }
      }
    } else {
      // Remaining community count too large for exact enumeration here
      total = 0;
    }

    return {
      player: total ? (playerWins / total) * 100 : 0,
      dealer: total ? (dealerWins / total) * 100 : 0,
      push: total ? (pushes / total) * 100 : 0,
    };
  }

  // Dealer unknown: enumerate dealer hole cards and remaining community cards
  const dealerCombinations = generateTwoCardCombinations(deck);
  let total = 0;

  if (remainingCommunityCount === 0) {
    for (const [dCard1, dCard2] of dealerCombinations) {
      total++;
      const playerHand = evaluateHand([...playerHoleCards, ...communityCards]);
      tally(playerHand, [dCard1, dCard2], communityCards);
    }
  } else if (remainingCommunityCount === 1) {
    for (const river of deck) {
      const finalCommunity = [...communityCards, river];
      const playerHand = evaluateHand([...playerHoleCards, ...finalCommunity]);
      const remainingDeck = deck.filter((card) => card !== river);
      for (let i = 0; i < remainingDeck.length - 1; i++) {
        for (let j = i + 1; j < remainingDeck.length; j++) {
          total++;
          tally(playerHand, [remainingDeck[i], remainingDeck[j]], finalCommunity);
        }
      }
    }
  } else if (remainingCommunityCount === 2) {
    for (let i = 0; i < deck.length - 1; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        const turn = deck[i];
        const river = deck[j];
        const finalCommunity = [...communityCards, turn, river];
        const playerHand = evaluateHand([...playerHoleCards, ...finalCommunity]);
        const remainingDeck = deck.filter((card) => card !== turn && card !== river);
        for (let k = 0; k < remainingDeck.length - 1; k++) {
          for (let l = k + 1; l < remainingDeck.length; l++) {
            total++;
            tally(playerHand, [remainingDeck[k], remainingDeck[l]], finalCommunity);
          }
        }
      }
    }
  }

  return {
    player: (playerWins / total) * 100,
    dealer: (dealerWins / total) * 100,
    push: (pushes / total) * 100,
  };
}

/**
 * Calculates win probabilities using Monte Carlo simulation or exact enumeration
 * Uses exact enumeration for RIVER phase when only dealer cards are unknown
 * Otherwise uses Monte Carlo simulation
 */
export function calculateWinProbabilities(
  playerHoleCards: Card[],
  dealerHoleCards: Card[],
  communityCards: Card[],
  deck: Card[],
  phase: Phase
): TrueOdds {
  // Exact pre-deal odds (deterministic + symmetric)
  if (
    phase === PHASES.PRE_DEAL &&
    playerHoleCards.length === 0 &&
    dealerHoleCards.length === 0 &&
    communityCards.length === 0
  ) {
    return PRE_DEAL_ODDS;
  }

  // Use exact enumeration for flop/turn/river states (community >= 3)
  if (
    playerHoleCards.length === 2 &&
    communityCards.length >= 3
  ) {
    return calculateExactProbabilities(playerHoleCards, dealerHoleCards, communityCards, deck);
  }

  // Use Monte Carlo for all other cases
  const simulations =
    phase === PHASES.PRE_DEAL &&
    playerHoleCards.length === 0 &&
    dealerHoleCards.length === 0 &&
    communityCards.length === 0
      ? MONTE_CARLO_SIMULATIONS_PRE_DEAL
      : MONTE_CARLO_SIMULATIONS;
  let playerWins = 0;
  let dealerWins = 0;
  let pushes = 0;

  for (let i = 0; i < simulations; i++) {
    const result = simulateGame(playerHoleCards, dealerHoleCards, communityCards, deck, phase);
    if (result === 'player') playerWins++;
    else if (result === 'dealer') dealerWins++;
    else pushes++;
  }

  const pushOdds = (pushes / simulations) * 100;
  return {
    player: (playerWins / simulations) * 100,
    dealer: (dealerWins / simulations) * 100,
    push: pushOdds,
  };
}

/**
 * Simulates a single game outcome
 */
function simulateGame(
  playerHoleCards: Card[],
  dealerHoleCards: Card[],
  communityCards: Card[],
  deck: Card[],
  phase: Phase
): 'player' | 'dealer' | 'push' {
  const simDeck = shuffle([...deck]);
  let simPlayerHole = [...playerHoleCards];
  let simDealerHole = [...dealerHoleCards];
  let simCommunity = [...communityCards];

  // Deal missing cards if needed
  if (simPlayerHole.length < 2) {
    while (simPlayerHole.length < 2 && simDeck.length > 0) {
      simPlayerHole.push(simDeck.pop()!);
    }
  }

  if (simDealerHole.length < 2) {
    while (simDealerHole.length < 2 && simDeck.length > 0) {
      simDealerHole.push(simDeck.pop()!);
    }
  }

  // Deal community cards based on phase
  // For phases before community cards, deal all community cards
  if (phase === PHASES.PRE_DEAL || phase === PHASES.PLAYER_CARDS) {
    // Deal all community cards (flop, turn, river)
    if (simCommunity.length < 5 && simDeck.length >= (5 - simCommunity.length)) {
      while (simCommunity.length < 5) {
        simCommunity.push(simDeck.pop()!);
      }
    }
  }

  // For flop phase, deal remaining community cards (turn, river)
  if (phase === PHASES.FLOP) {
    // Already have flop cards, deal remaining community cards
    if (simCommunity.length < 5 && simDeck.length >= (5 - simCommunity.length)) {
      while (simCommunity.length < 5) {
        simCommunity.push(simDeck.pop()!);
      }
    }
  }

  // For turn phase, deal remaining card (river)
  if (phase === PHASES.TURN) {
    // Already have flop and turn, deal river
    if (simCommunity.length < 5 && simDeck.length >= (5 - simCommunity.length)) {
      while (simCommunity.length < 5) {
        simCommunity.push(simDeck.pop()!);
      }
    }
  }

  // For river and dealer card phases, all community cards are already dealt
  if (phase === PHASES.RIVER || phase === PHASES.DEALER_CARDS) {
    // Community cards are already complete, no need to deal more
  }

  // Evaluate final hands
  const playerHand = evaluateHand([...simPlayerHole, ...simCommunity]);
  const dealerHand = evaluateHand([...simDealerHole, ...simCommunity]);

  // Compare hands
  return determineWinner(playerHand, dealerHand);
}
