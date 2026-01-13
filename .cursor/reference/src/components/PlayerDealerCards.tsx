import { useState } from 'react';
import { Card } from './Card';
import { PHASES } from '../config/constants';
import type { Phase } from '../config/constants';
import { getCardValue } from '../utils/cardUtils';
import { RulesOverlay } from './RulesOverlay';

interface PlayerDealerCardsProps {
  phase: Phase;
  playerCards: number[];
  dealerCards: number[];
  dealerHiddenCard: number | null;
  playerTotal: number;
  dealerVisibleTotal: number;
  dealerTotal: number;
}

export function PlayerDealerCards({
  phase,
  playerCards,
  dealerCards,
  dealerHiddenCard,
  playerTotal,
  dealerVisibleTotal,
  dealerTotal,
}: PlayerDealerCardsProps) {
  const [showPlayerRules, setShowPlayerRules] = useState(false);
  const [showDealerRules, setShowDealerRules] = useState(false);
  
  const isPreDeal = phase === PHASES.PRE_DEAL;
  const isPlayerCard1 = phase === PHASES.PLAYER_CARD_1;
  const isDealerCard1 = phase === PHASES.DEALER_CARD_1;
  const isPlayerCard2 = phase === PHASES.PLAYER_CARD_2;
  const isPlayerHitting = phase === PHASES.PLAYER_HITTING;
  const isDealerReveal = phase === PHASES.DEALER_REVEAL;
  const isDealerHitting = phase === PHASES.DEALER_HITTING;

  return (
    <div className="grid grid-cols-2 gap-4 mb-3">
      {/* Player Card */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="font-semibold text-slate-300">PLAYER</span>
            <button
              onClick={() => setShowPlayerRules(true)}
              className="w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
              aria-label="Show player rules"
            >
              ?
            </button>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium min-w-[60px] text-center ${
              isPreDeal || isPlayerCard1 || isDealerCard1 || isPlayerCard2 || isPlayerHitting
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {isPreDeal
              ? 'WAITING'
              : isPlayerCard1 || isDealerCard1 || isPlayerCard2 || isPlayerHitting
                ? 'ACTIVE'
                : 'HOLD'}
          </span>
        </div>

        <div className="flex gap-2 mb-3 justify-center min-h-[96px] items-center">
          {isPreDeal ? (
            <>
              <Card hidden />
              <Card hidden />
            </>
          ) : isPlayerCard1 || isDealerCard1 ? (
            <>
              <Card value={playerCards[0]} />
              <Card hidden />
            </>
          ) : (
            <>
              {playerCards.map((card, i) => (
                <Card key={i} value={card} />
              ))}
              {playerCards.length < 5 && isPlayerHitting && (
                <div className="w-16 h-24 opacity-0" />
              )}
            </>
          )}
        </div>

        <div className="text-center mb-3">
          <div
            className={`text-4xl font-black min-w-[80px] inline-block tabular-nums ${
              playerTotal > 21 ? 'text-red-400' : 'text-white'
            }`}
          >
            {isPreDeal ? '—' : isPlayerCard1 || isDealerCard1 ? getCardValue(playerCards[0]) : playerTotal}
          </div>
          <div className="text-slate-300 text-xs min-h-[16px]">
            {isPreDeal
              ? 'waiting for deal'
              : isPlayerCard1 || isDealerCard1
                ? 'first card'
                : playerTotal > 21
                  ? <span className="text-red-400 font-bold">BUST!</span>
                  : 'of 21'}
          </div>
        </div>
      </div>

      {/* Dealer Card */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
            <span className="font-semibold text-slate-300">DEALER</span>
            <button
              onClick={() => setShowDealerRules(true)}
              className="w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
              aria-label="Show dealer rules"
            >
              ?
            </button>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium min-w-[60px] text-center ${
              isPreDeal || isPlayerCard1
                ? 'bg-slate-700 text-slate-400'
                : isDealerReveal || isDealerHitting
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-700 text-slate-400'
            }`}
          >
            {isPreDeal || isPlayerCard1
              ? 'WAITING'
              : isDealerReveal || isDealerHitting
                ? 'ACTIVE'
                : 'HOLD'}
          </span>
        </div>

        <div className="flex gap-2 mb-3 justify-center min-h-[96px] items-center">
          {isPreDeal || isPlayerCard1 ? (
            <>
              <Card hidden />
              <Card hidden />
            </>
          ) : isDealerCard1 || isPlayerCard2 ? (
            <>
              <Card value={dealerCards[0]} />
              <Card hidden />
            </>
          ) : (
            <>
              {dealerCards.map((card, i) => (
                <Card key={i} value={card} />
              ))}
              {dealerHiddenCard && <Card hidden />}
              {!dealerHiddenCard && dealerCards.length < 5 && isDealerHitting && (
                <div className="w-16 h-24 opacity-0" />
              )}
            </>
          )}
        </div>

        <div className="text-center mb-3">
          <div
            className={`text-4xl font-black min-w-[80px] inline-block tabular-nums ${
              !dealerHiddenCard && dealerTotal > 21 ? 'text-red-400' : 'text-white'
            }`}
          >
            {isPreDeal || isPlayerCard1 ? '—' : !dealerHiddenCard ? dealerTotal : dealerVisibleTotal}
          </div>
          <div className="text-slate-300 text-xs min-h-[16px]">
            {isPreDeal || isPlayerCard1
              ? 'waiting for deal'
              : dealerHiddenCard
                ? 'plus hidden card'
                : !dealerHiddenCard && dealerTotal > 21
                  ? <span className="text-red-400 font-bold">BUST!</span>
                  : 'of 21'}
          </div>
        </div>
      </div>

      {/* Player Rules Overlay */}
      <RulesOverlay
        isOpen={showPlayerRules}
        onClose={() => setShowPlayerRules(false)}
        title="Player Strategy"
      >
        <div className="space-y-3">
          {/* Overview */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🃏</span>
              <div className="font-bold text-emerald-400 text-sm">Standard Blackjack Basic Strategy</div>
            </div>
            <div className="text-slate-300 text-xs ml-7">Optimal decisions based on hand total and dealer upcard</div>
          </div>

          {/* Hard Hands */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-blue-400 rounded-full"></div>
              <h3 className="font-bold text-white text-sm">Hard Hands</h3>
              <span className="text-xs text-slate-400 ml-auto">(No Ace or Ace = 1)</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/50">
                <span className="text-blue-400 font-bold min-w-[50px]">≤ 11</span>
                <span className="text-slate-300">Always <span className="text-emerald-400 font-semibold">HIT</span></span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/50">
                <span className="text-blue-400 font-bold min-w-[50px]">12</span>
                <span className="text-slate-300"><span className="text-emerald-400 font-semibold">HIT</span> vs 2-3, 7+ | <span className="text-amber-400 font-semibold">STAND</span> vs 4-6</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/50">
                <span className="text-blue-400 font-bold min-w-[50px]">13-16</span>
                <span className="text-slate-300"><span className="text-amber-400 font-semibold">STAND</span> vs 2-6 | <span className="text-emerald-400 font-semibold">HIT</span> vs 7+</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/50">
                <span className="text-blue-400 font-bold min-w-[50px]">≥ 17</span>
                <span className="text-slate-300">Always <span className="text-amber-400 font-semibold">STAND</span></span>
              </div>
            </div>
          </div>

          {/* Soft Hands */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-purple-400 rounded-full"></div>
              <h3 className="font-bold text-white text-sm">Soft Hands</h3>
              <span className="text-xs text-slate-400 ml-auto">(Ace = 11)</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/50">
                <span className="text-purple-400 font-bold min-w-[50px]">≤ 17</span>
                <span className="text-slate-300">Always <span className="text-emerald-400 font-semibold">HIT</span></span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/50">
                <span className="text-purple-400 font-bold min-w-[50px]">18</span>
                <span className="text-slate-300"><span className="text-amber-400 font-semibold">STAND</span> vs 2, 7-8 | <span className="text-emerald-400 font-semibold">HIT</span> vs 9, 10, Ace</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900/50">
                <span className="text-purple-400 font-bold min-w-[50px]">≥ 19</span>
                <span className="text-slate-300">Always <span className="text-amber-400 font-semibold">STAND</span></span>
              </div>
            </div>
          </div>

          {/* Goal */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <div>
                <div className="font-bold text-white text-xs mb-0.5">Objective</div>
                <div className="text-slate-300 text-xs">Get close to 21 without busting, beat dealer</div>
              </div>
            </div>
          </div>
        </div>
      </RulesOverlay>

      {/* Dealer Rules Overlay */}
      <RulesOverlay
        isOpen={showDealerRules}
        onClose={() => setShowDealerRules(false)}
        title="Dealer Rules"
      >
        <div className="space-y-3">
          {/* Hit Rule */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">🔄</span>
              <div className="font-bold text-white text-sm">Must Hit</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700 ml-7">
              <div className="text-center">
                <span className="text-2xl font-black text-red-400">≤ 16</span>
                <div className="text-slate-300 text-xs mt-1">Dealer must hit on 16 or less</div>
              </div>
            </div>
          </div>

          {/* Stand Rule */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">✋</span>
              <div className="font-bold text-white text-sm">Must Stand</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700 ml-7">
              <div className="text-center">
                <span className="text-2xl font-black text-green-400">≥ 17</span>
                <div className="text-slate-300 text-xs mt-1">Dealer must stand on 17 or more</div>
              </div>
            </div>
          </div>

          {/* Hidden Card */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">🃏</span>
              <div>
                <div className="font-bold text-white text-sm mb-0.5">Hidden Card</div>
                <div className="text-slate-300 text-xs">Second card hidden until player stands or busts</div>
              </div>
            </div>
          </div>
        </div>
      </RulesOverlay>
    </div>
  );
}
