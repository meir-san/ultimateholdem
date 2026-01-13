import { calculateTotal } from './cardUtils';

/**
 * Gets the blackjack value of a card for strategy purposes (face cards = 10)
 */
function getCardValueForStrategy(card: number): number {
  if (card === 1) return 11; // Ace = 11 for strategy
  if (card >= 11 && card <= 13) return 10; // Jack, Queen, King = 10
  return card; // 2-10
}

/**
 * Determines if player should hit based on basic strategy
 * @param playerCards - Current player hand
 * @param dealerUpcard - Dealer's visible card (raw value: 1-13)
 * @returns true if player should hit, false if should stand
 */
export function shouldPlayerHit(playerCards: number[], dealerUpcard: number): boolean {
  const total = calculateTotal(playerCards);
  const hasAce = playerCards.includes(1);
  const aceAs11 = hasAce && total <= 21 && (total - 1 + 11) <= 21;
  const isSoft = aceAs11 && total <= 11; // Soft hand = Ace counted as 11
  
  // Get soft total if applicable
  const softTotal = isSoft ? total + 10 : total;
  
  // Dealer upcard value (Ace = 11, face cards = 10 for strategy purposes)
  const dealerValue = getCardValueForStrategy(dealerUpcard);
  
  if (isSoft) {
    // Soft hand strategy
    if (softTotal >= 19) return false; // Stand on soft 19+
    if (softTotal === 18) {
      // Stand on soft 18 vs 2, 7, 8; hit vs 9, 10, A
      return dealerValue >= 9 || dealerValue === 11;
    }
    return true; // Hit on soft 17 or less
  } else {
    // Hard hand strategy
    if (total >= 17) return false; // Always stand on hard 17+
    if (total <= 11) return true;  // Always hit on 11 or less
    
    // 12-16: depends on dealer upcard
    if (total === 12) {
      // Hit vs 2, 3, 7+; stand vs 4-6
      return dealerValue <= 3 || dealerValue >= 7;
    }
    // 13-16: stand vs 2-6, hit vs 7+
    return dealerValue >= 7;
  }
}
