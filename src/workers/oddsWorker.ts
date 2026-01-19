import type { Card, TrueOdds } from '../types';
import type { Phase } from '../config/constants';
import { calculateWinProbabilities } from '../utils/winProbability';

type OddsRequest = {
  requestId: number;
  playerHoleCards: Card[];
  dealerHoleCards: Card[];
  communityCards: Card[];
  deck: Card[];
  phase: Phase;
};

type OddsResponse = {
  requestId: number;
  odds: TrueOdds;
};

self.onmessage = (event: MessageEvent<OddsRequest>) => {
  const { requestId, playerHoleCards, dealerHoleCards, communityCards, deck, phase } = event.data;
  const odds = calculateWinProbabilities(playerHoleCards, dealerHoleCards, communityCards, deck, phase);
  const response: OddsResponse = { requestId, odds };
  self.postMessage(response);
};
