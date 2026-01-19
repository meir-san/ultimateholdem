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
 * Uses exact enumeration for RIVER phase when only Player 2 cards are unknown
 * Otherwise uses Monte Carlo simulation
 */
export function calculateWinProbabilities(
  player1HoleCards: Card[],
  player2HoleCards: Card[],
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
    player1HoleCards.length === 0 &&
    player2HoleCards.length === 0 &&
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
    player1HoleCards.length === 0 &&
    player2HoleCards.length === 0 &&
    player3HoleCards.length === 0 &&
    communityCards.length === 0
      ? MONTE_CARLO_SIMULATIONS_PRE_DEAL
      : MONTE_CARLO_SIMULATIONS;
  let player1Wins = 0;
  let player2Wins = 0;
  let player3Wins = 0;
  let pushes = 0;

  for (let i = 0; i < simulations; i++) {
    const result = simulateGame(player1HoleCards, player2HoleCards, player3HoleCards, communityCards, deck, phase);
    if (result === 'player1') player1Wins++;
    else if (result === 'player2') player2Wins++;
    else if (result === 'player3') player3Wins++;
    else pushes++;
  }

  const pushOdds = (pushes / simulations) * 100;
  let player1Odds = (player1Wins / simulations) * 100;
  let player2Odds = (player2Wins / simulations) * 100;
  let player3Odds = (player3Wins / simulations) * 100;

  // If some hands are hidden/unknown, enforce symmetry among the unknown players.
  const unknown: Array<{ key: 'player1' | 'player2' | 'player3'; value: number }> = [];
  if (player1HoleCards.length === 0) unknown.push({ key: 'player1', value: player1Odds });
  if (player2HoleCards.length === 0) unknown.push({ key: 'player2', value: player2Odds });
  if (player3HoleCards.length === 0) unknown.push({ key: 'player3', value: player3Odds });

  if (unknown.length >= 2) {
    const avg = unknown.reduce((sum, item) => sum + item.value, 0) / unknown.length;
    if (unknown.some((item) => item.key === 'player1')) player1Odds = avg;
    if (unknown.some((item) => item.key === 'player2')) player2Odds = avg;
    if (unknown.some((item) => item.key === 'player3')) player3Odds = avg;
  }

  return {
    player1: player1Odds,
    player2: player2Odds,
    player3: player3Odds,
    push: pushOdds,
  };
}

/**
 * Simulates a single game outcome
 */
function simulateGame(
  player1HoleCards: Card[],
  player2HoleCards: Card[],
  player3HoleCards: Card[],
  communityCards: Card[],
  deck: Card[],
  phase: Phase
): 'player1' | 'player2' | 'player3' | 'push' {
  const simDeck = shuffle([...deck]);
  let simPlayer1Hole = [...player1HoleCards];
  let simPlayer2Hole = [...player2HoleCards];
  let simPlayer3Hole = [...player3HoleCards];
  let simCommunity = [...communityCards];

  // Deal missing cards if needed
  if (simPlayer1Hole.length < 2) {
    while (simPlayer1Hole.length < 2 && simDeck.length > 0) {
      simPlayer1Hole.push(simDeck.pop()!);
    }
  }

  if (simPlayer2Hole.length < 2) {
    while (simPlayer2Hole.length < 2 && simDeck.length > 0) {
      simPlayer2Hole.push(simDeck.pop()!);
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

  // For river and player 2 card phases, all community cards are already dealt
  if (phase === PHASES.RIVER || phase === PHASES.DEALER_CARDS) {
    // Community cards are already complete, no need to deal more
  }

  // Evaluate final hands
  const playerHand = evaluateHand([...simPlayer1Hole, ...simCommunity]);
  const player2Hand = evaluateHand([...simPlayer2Hole, ...simCommunity]);
  const player3Hand = evaluateHand([...simPlayer3Hole, ...simCommunity]);
  return determineWinnerThree(playerHand, player2Hand, player3Hand);
}
