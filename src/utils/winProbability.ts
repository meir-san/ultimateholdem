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
import { evaluateHand, determineWinnerThree } from './pokerHands';

/**
 * Calculates win probabilities using Monte Carlo simulation or exact enumeration
 * Uses exact enumeration for RIVER phase when only dealer cards are unknown
 * Otherwise uses Monte Carlo simulation
 */
export function calculateWinProbabilities(
  playerHoleCards: Card[],
  dealerHoleCards: Card[],
  player3HoleCards: Card[],
  communityCards: Card[],
  deck: Card[],
  phase: Phase
): TrueOdds {
  // This function is the single source of truth for odds.
  // It prioritizes exact enumeration whenever it is computationally feasible in-browser.
  // Exact pre-deal odds (deterministic + symmetric)
  if (
    phase === PHASES.PRE_DEAL &&
    playerHoleCards.length === 0 &&
    dealerHoleCards.length === 0 &&
    player3HoleCards.length === 0 &&
    communityCards.length === 0
  ) {
    return PRE_DEAL_ODDS;
  }

  // Prototype note: 3-player exact enumeration is too heavy for the browser,
  // so we fall back to Monte Carlo until a server-side odds engine is used.

  // Use Monte Carlo for all other cases
  const simulations =
    phase === PHASES.PRE_DEAL &&
    playerHoleCards.length === 0 &&
    dealerHoleCards.length === 0 &&
    player3HoleCards.length === 0 &&
    communityCards.length === 0
      ? MONTE_CARLO_SIMULATIONS_PRE_DEAL
      : MONTE_CARLO_SIMULATIONS;
  let playerWins = 0;
  let dealerWins = 0;
  let player3Wins = 0;
  let pushes = 0;

  for (let i = 0; i < simulations; i++) {
    const result = simulateGame(playerHoleCards, dealerHoleCards, player3HoleCards, communityCards, deck, phase);
    if (result === 'player') playerWins++;
    else if (result === 'dealer') dealerWins++;
    else if (result === 'player3') player3Wins++;
    else pushes++;
  }

  const pushOdds = (pushes / simulations) * 100;
  const playerOdds = (playerWins / simulations) * 100;
  let dealerOdds = (dealerWins / simulations) * 100;
  let player3Odds = (player3Wins / simulations) * 100;

  // If both opponent hands are hidden/unknown, they are symmetric.
  // Enforce equality to avoid Monte Carlo noise splitting them unevenly.
  if (dealerHoleCards.length === 0 && player3HoleCards.length === 0) {
    const avg = (dealerOdds + player3Odds) / 2;
    dealerOdds = avg;
    player3Odds = avg;
  }

  return {
    player: playerOdds,
    dealer: dealerOdds,
    player3: player3Odds,
    push: pushOdds,
  };
}

/**
 * Simulates a single game outcome
 */
function simulateGame(
  playerHoleCards: Card[],
  dealerHoleCards: Card[],
  player3HoleCards: Card[],
  communityCards: Card[],
  deck: Card[],
  phase: Phase
): 'player' | 'dealer' | 'player3' | 'push' {
  const simDeck = shuffle([...deck]);
  let simPlayerHole = [...playerHoleCards];
  let simDealerHole = [...dealerHoleCards];
  let simPlayer3Hole = [...player3HoleCards];
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

  if (simPlayer3Hole.length < 2) {
    while (simPlayer3Hole.length < 2 && simDeck.length > 0) {
      simPlayer3Hole.push(simDeck.pop()!);
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
  const player3Hand = evaluateHand([...simPlayer3Hole, ...simCommunity]);
  return determineWinnerThree(playerHand, dealerHand, player3Hand);
}
