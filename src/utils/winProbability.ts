import type { Card } from '../types';
import type { TrueOdds } from '../types';
import type { Phase } from '../config/constants';
import { MONTE_CARLO_SIMULATIONS, PHASES } from '../config/constants';
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
  communityCards: Card[],
  deck: Card[]
): TrueOdds {
  let playerWins = 0;
  let dealerWins = 0;
  let pushes = 0;

  // Generate all possible dealer hole card combinations
  const dealerCombinations = generateTwoCardCombinations(deck);
  const totalCombinations = dealerCombinations.length;

  for (const [dCard1, dCard2] of dealerCombinations) {
    const dealerHoleCards = [dCard1, dCard2];

    // Evaluate final hands
    const playerHand = evaluateHand([...playerHoleCards, ...communityCards]);
    const dealerHand = evaluateHand([...dealerHoleCards, ...communityCards]);

    // Compare hands
    const result = determineWinner(playerHand, dealerHand);
    if (result === 'player') playerWins++;
    else if (result === 'dealer') dealerWins++;
    else pushes++;
  }

  return {
    player: (playerWins / totalCombinations) * 100,
    dealer: (dealerWins / totalCombinations) * 100,
    push: (pushes / totalCombinations) * 100,
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
  // Use exact enumeration for RIVER phase when only dealer cards are unknown
  if (phase === PHASES.RIVER &&
      playerHoleCards.length === 2 &&
      dealerHoleCards.length === 0 &&
      communityCards.length === 5) {
    return calculateExactProbabilities(playerHoleCards, communityCards, deck);
  }

  // Use Monte Carlo for all other cases
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
