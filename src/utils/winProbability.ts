import type { Card } from '../types';
import type { TrueOdds } from '../types';
import type { Phase } from '../config/constants';
import { MONTE_CARLO_SIMULATIONS, PHASES } from '../config/constants';
import { shuffle } from './cardUtils';
import { evaluateHand, determineWinner } from './pokerHands';
import { shouldRaise4x, shouldRaise2x, shouldRaise1x } from './uthStrategy';

/**
 * Calculates win probabilities using Monte Carlo simulation
 * Simulates remaining cards and auto-plays both sides using strategy
 */
export function calculateWinProbabilities(
  playerHoleCards: Card[],
  dealerHoleCards: Card[],
  communityCards: Card[],
  deck: Card[],
  phase: Phase
): TrueOdds {
  let playerWins = 0;
  let dealerWins = 0;
  let pushes = 0;

  for (let i = 0; i < MONTE_CARLO_SIMULATIONS; i++) {
    const result = simulateGame(playerHoleCards, dealerHoleCards, communityCards, deck, phase);
    if (result === 'player') playerWins++;
    else if (result === 'dealer') dealerWins++;
    else pushes++;
  }

  return {
    player: (playerWins / MONTE_CARLO_SIMULATIONS) * 100,
    dealer: (dealerWins / MONTE_CARLO_SIMULATIONS) * 100,
    push: (pushes / MONTE_CARLO_SIMULATIONS) * 100,
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
  if (phase === PHASES.PRE_DEAL || phase === PHASES.HOLE_CARDS) {
    // Deal flop
    if (simCommunity.length < 3 && simDeck.length >= 3) {
      simCommunity.push(simDeck.pop()!, simDeck.pop()!, simDeck.pop()!);
    }
  }

  if (phase === PHASES.FLOP || phase === PHASES.POSTFLOP_DECISION) {
    // Already have flop, deal turn and river
    if (simCommunity.length < 5 && simDeck.length >= 2) {
      simCommunity.push(simDeck.pop()!, simDeck.pop()!);
    }
  }

  if (simCommunity.length < 5 && simDeck.length >= (5 - simCommunity.length)) {
    while (simCommunity.length < 5) {
      simCommunity.push(simDeck.pop()!);
    }
  }

  // Simulate player decisions
  let playerRaisedPreflop = false;
  let playerRaisedPostflop = false;
  let playerFolded = false;

  // Pre-flop decision
  if (shouldRaise4x(simPlayerHole)) {
    playerRaisedPreflop = true;
  }

  // Post-flop decision (if didn't raise pre-flop)
  if (!playerRaisedPreflop && simCommunity.length >= 3) {
    if (shouldRaise2x(simPlayerHole, simCommunity.slice(0, 3))) {
      playerRaisedPostflop = true;
    }
  }

  // Turn/river decision (if checked twice)
  if (!playerRaisedPreflop && !playerRaisedPostflop && simCommunity.length >= 5) {
    if (!shouldRaise1x(simPlayerHole, simCommunity)) {
      playerFolded = true;
    }
  }

  // If player folded, dealer wins
  if (playerFolded) {
    return 'dealer';
  }

  // Evaluate final hands
  const playerHand = evaluateHand([...simPlayerHole, ...simCommunity]);
  const dealerHand = evaluateHand([...simDealerHole, ...simCommunity]);

  // Check dealer qualification (needs pair or better)
  const dealerRank = dealerHand.rank;
  if (dealerRank < 2) {
    // Dealer doesn't qualify - player wins (ante pushes, play pays 1:1)
    // For simplicity in prediction market, we'll count this as player win
    return 'player';
  }

  // Compare hands
  return determineWinner(playerHand, dealerHand);
}
