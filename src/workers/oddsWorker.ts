import type { Card, TrueOdds } from '../types';
import type { Phase } from '../config/constants';
import { calculateWinProbabilities } from '../utils/winProbability';

type OddsRequest = {
  requestId: number;
  player1HoleCards: Card[];
  player2HoleCards: Card[];
  player3HoleCards: Card[];
  communityCards: Card[];
  deck: Card[];
  phase: Phase;
};

type OddsResponse = {
  requestId: number;
  odds: TrueOdds;
};

self.onmessage = (event: MessageEvent<OddsRequest>) => {
  const { requestId, player1HoleCards, player2HoleCards, player3HoleCards, communityCards, deck, phase } = event.data;
  const odds = calculateWinProbabilities(player1HoleCards, player2HoleCards, player3HoleCards, communityCards, deck, phase);
  const response: OddsResponse = { requestId, odds };
  self.postMessage(response);
};
