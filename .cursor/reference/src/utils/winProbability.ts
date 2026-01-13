import { calculateTotal } from './cardUtils';
import { shouldPlayerHit } from './blackjackStrategy';
import { shuffle } from './cardUtils';
import { MONTE_CARLO_SIMULATIONS } from '../config/constants';
import type { TrueOdds } from '../types';

/**
 * Calculates win probabilities using Monte Carlo simulation
 */
export function calculateWinProbabilities(
  playerCards: number[],
  playerBusted: boolean,
  dealerCards: number[],
  dealerHidden: boolean,
  deck: number[]
): TrueOdds {
  let playerWins = 0;
  let dealerWins = 0;
  let pushes = 0;

  if (playerBusted) {
    return { player: 0, dealer: 100, push: 0 };
  }

  for (let i = 0; i < MONTE_CARLO_SIMULATIONS; i++) {
    let simDeck = shuffle([...deck]);
    let simPlayerCards = [...playerCards];
    let simDealerCards = [...dealerCards];
    
    // If player only has 1 card, draw their second
    if (simPlayerCards.length === 1 && simDeck.length > 0) {
      simPlayerCards.push(simDeck.pop()!);
    }
    
    // If dealer has no cards, draw their first (upcard)
    if (simDealerCards.length === 0 && simDeck.length > 0) {
      simDealerCards.push(simDeck.pop()!);
    }
    
    // If dealer's hole card is hidden (or needs one), draw it
    if (dealerHidden && simDeck.length > 0) {
      simDealerCards.push(simDeck.pop()!);
    }
    
    // Get dealer upcard for basic strategy (use 10 as default if no cards)
    const dealerUpcard = simDealerCards.length > 0 ? simDealerCards[0] : 10;
    
    // Simulate player following basic strategy
    while (simDeck.length > 0 && shouldPlayerHit(simPlayerCards, dealerUpcard)) {
      simPlayerCards.push(simDeck.pop()!);
      if (calculateTotal(simPlayerCards) > 21) break; // Busted
    }
    
    const finalPlayerTotal = calculateTotal(simPlayerCards);
    
    // Check if player busted
    if (finalPlayerTotal > 21) {
      dealerWins++;
      continue;
    }
    
    // Simulate dealer hitting until 17
    let dealerTotal = calculateTotal(simDealerCards);
    while (dealerTotal < 17 && simDeck.length > 0) {
      simDealerCards.push(simDeck.pop()!);
      dealerTotal = calculateTotal(simDealerCards);
    }
    
    // Determine winner
    if (dealerTotal > 21) {
      playerWins++;
    } else if (dealerTotal > finalPlayerTotal) {
      dealerWins++;
    } else if (finalPlayerTotal > dealerTotal) {
      playerWins++;
    } else {
      pushes++;
    }
  }

  return {
    player: (playerWins / MONTE_CARLO_SIMULATIONS) * 100,
    dealer: (dealerWins / MONTE_CARLO_SIMULATIONS) * 100,
    push: (pushes / MONTE_CARLO_SIMULATIONS) * 100
  };
}
