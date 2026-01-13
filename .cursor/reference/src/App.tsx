import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from './stores/gameStore';
import { PlayerDealerCards } from './components/PlayerDealerCards';
import { PhaseTimer } from './components/PhaseTimer';
import { PriceChart } from './components/PriceChart';
import { BettingRow } from './components/BettingRow';
import { ResultBanner } from './components/ResultBanner';
import { useState } from 'react';
import { LiveChat } from './components/LiveChat';
import { BetsLockedOverlay } from './components/BetsLockedOverlay';
import { RulesOverlay } from './components/RulesOverlay';
import { PHASES, QUICK_BET_AMOUNTS, MAX_BET_AMOUNT, CROWD_BET_DELAY_MIN, CROWD_BET_DELAY_MAX, PREDICTION_WINDOW } from './config/constants';
import rainLogo from './assets/logodark.svg';

function App() {
  const [showGeneralRules, setShowGeneralRules] = useState(false);
  
  const {
    // State
    phase,
    timer,
    playerCards,
    dealerCards,
    dealerHiddenCard,
    trueOdds,
    roundResult,
    roundNumber,
    roundProfit,
    balance,
    selectedBetAmount,
    pool,
    activityFeed,
    priceHistory,
    
    // Computed
    getPlayerTotal,
    getDealerVisibleTotal,
    getDealerTotal,
    getMyBetTotal,
    getTotalMyBets,
    getPositionValue,
    getTotalShares,
    getPotentialPayout,
    getUnrealizedPnL,
    getImpliedOdds,
    isMarketLocked,
    
    // Actions
    startNewRound,
    advancePhase,
    placeBet,
    sellPosition,
    setSelectedBetAmount,
    decrementTimer,
    simulateCrowdBet,
    updatePriceHistory,
    rebalanceMarket,
    nextRound,
  } = useGameStore();

  const shouldAdvanceRef = useRef(false);
  const crowdIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize game
  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  // Auto-countdown timer (only starts after first bet is placed)
  useEffect(() => {
    if (phase === PHASES.RESOLUTION) return;

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      // Check if user has placed any bets
      const hasUserBets = state.myPositions.player.length > 0 || 
                          state.myPositions.dealer.length > 0 || 
                          state.myPositions.push.length > 0;
      // Check if countdown has already started (timer has been decremented)
      const countdownStarted = state.timer < PREDICTION_WINDOW;
      
      // Only decrement timer if user has bets OR countdown has already started
      if (hasUserBets || countdownStarted) {
        decrementTimer();
        const currentTimer = useGameStore.getState().timer;
        if (currentTimer <= 0) {
          shouldAdvanceRef.current = true;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, decrementTimer]);

  // Handle phase advancement
  useEffect(() => {
    if (shouldAdvanceRef.current && timer === 0 && phase !== PHASES.RESOLUTION) {
      shouldAdvanceRef.current = false;
      advancePhase();
    }
  }, [timer, phase, advancePhase]);

  // Auto-start next round after resolution (show result for 3 seconds then start new round)
  useEffect(() => {
    if (phase === PHASES.RESOLUTION) {
      const timer = setTimeout(() => {
        nextRound();
      }, 3000); // Show result for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [phase, nextRound]);

  // Crowd betting simulation
  useEffect(() => {
    if (phase === PHASES.RESOLUTION) return;

    const scheduleCrowdBet = () => {
      const delay = CROWD_BET_DELAY_MIN + Math.random() * (CROWD_BET_DELAY_MAX - CROWD_BET_DELAY_MIN);
      crowdIntervalRef.current = setTimeout(() => {
        simulateCrowdBet();
        scheduleCrowdBet();
      }, delay);
    };

    scheduleCrowdBet();

    return () => {
      if (crowdIntervalRef.current) {
        clearTimeout(crowdIntervalRef.current);
      }
    };
  }, [phase, simulateCrowdBet]);

  // Update price history when true odds change
  useEffect(() => {
    updatePriceHistory();
  }, [trueOdds, updatePriceHistory]);

  // Market rebalancing when true odds change significantly
  const prevTrueOddsRef = useRef(trueOdds);
  useEffect(() => {
    const prev = prevTrueOddsRef.current;
    const playerShift = Math.abs(trueOdds.player - prev.player);
    const dealerShift = Math.abs(trueOdds.dealer - prev.dealer);

    if (playerShift > 3 || dealerShift > 3) {
      rebalanceMarket(prev);
    }

    prevTrueOddsRef.current = trueOdds;
  }, [trueOdds, rebalanceMarket]);

  const getPhaseLabel = useCallback((): string => {
    const playerTotal = getPlayerTotal();
    const dealerTotal = getDealerTotal();
    
    switch (phase) {
      case PHASES.PRE_DEAL:
        return 'PRE-DEAL';
      case PHASES.PLAYER_CARD_1:
        return `Player card 1 (${playerCards[0] === 1 ? 'A' : playerCards[0]})`;
      case PHASES.DEALER_CARD_1:
        return `Dealer card 1 (${dealerCards[0] === 1 ? 'A' : dealerCards[0]})`;
      case PHASES.PLAYER_CARD_2:
        return `Player card 2 (now ${playerTotal})`;
      case PHASES.PLAYER_HITTING:
        return `Player drew (now ${playerTotal})`;
      case PHASES.DEALER_REVEAL:
        return `Dealer revealed (now ${dealerTotal})`;
      case PHASES.DEALER_HITTING:
        return `Dealer drew (now ${dealerTotal})`;
      case PHASES.RESOLUTION:
        return 'SETTLEMENT';
      default:
        return '';
    }
  }, [phase, playerCards, dealerCards, getPlayerTotal, getDealerTotal]);

  const getNextAction = useCallback((): string => {
    if (phase === PHASES.PRE_DEAL) {
      return 'Player card 1 will be dealt';
    }
    if (phase === PHASES.PLAYER_CARD_1) {
      return 'Dealer card 1 will be dealt';
    }
    if (phase === PHASES.DEALER_CARD_1) {
      return 'Player card 2 will be dealt';
    }
    if (phase === PHASES.PLAYER_CARD_2 || phase === PHASES.PLAYER_HITTING) {
      // This would need shouldPlayerHit logic, simplified for now
      return 'Player action or dealer reveal';
    }
    if (phase === PHASES.DEALER_REVEAL || phase === PHASES.DEALER_HITTING) {
      const dt = getDealerTotal();
      if (dt < 17) return `Dealer will draw (at ${dt})`;
      return 'Round will resolve';
    }
    return '';
  }, [phase, getDealerTotal]);

  const marketLocked = isMarketLocked();
  const playerTotal = getPlayerTotal();
  const dealerVisibleTotal = getDealerVisibleTotal();
  const dealerTotal = getDealerTotal();
  const totalPool = pool.player + pool.dealer + pool.push;
  const totalMyBets = getTotalMyBets();

  const betsLocked = timer <= 2 && phase !== PHASES.RESOLUTION;
  const canBet = phase !== PHASES.RESOLUTION && balance >= selectedBetAmount && !marketLocked && !betsLocked;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* App Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <img src={rainLogo} alt="RAIN" className="h-8 w-auto" />
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <span className="hover:text-white cursor-pointer">Home</span>
            <span className="hover:text-white cursor-pointer">Explore Markets</span>
            <span className="hover:text-white cursor-pointer font-bold">Apps ▾</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold text-sm transition-colors">
            Deposit
          </button>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold text-sm transition-colors">
            Create
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
            <span className="text-white font-bold">${balance.toFixed(2)}</span>
            <span className="text-slate-400">▾</span>
          </div>
        </div>
      </div>


      <div className="flex min-h-[calc(100vh-100px)]">
        {/* LEFT SIDE - Game State */}
        <div className="w-1/2 p-4 border-r border-slate-800 flex flex-col">
          <PlayerDealerCards
            phase={phase}
            playerCards={playerCards}
            dealerCards={dealerCards}
            dealerHiddenCard={dealerHiddenCard}
            playerTotal={playerTotal}
            dealerVisibleTotal={dealerVisibleTotal}
            dealerTotal={dealerTotal}
          />

          <PhaseTimer
            phase={phase}
            timer={timer}
            marketLocked={marketLocked}
            getPhaseLabel={getPhaseLabel}
            getNextAction={getNextAction}
          />

          <PriceChart
            priceHistory={priceHistory}
            hasPlayerPosition={getMyBetTotal('player') > 0}
            hasDealerPosition={getMyBetTotal('dealer') > 0}
            hasPushPosition={getMyBetTotal('push') > 0}
          />
        </div>

        {/* RIGHT SIDE - Trading Terminal */}
        <div className="w-1/2 p-4 flex flex-col">
          {/* Stats Row */}
          <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
            <div>
              <span className="text-slate-300">Round </span>
              <span className="text-white font-bold">#{roundNumber}</span>
            </div>
            <div>
              <span className="text-slate-300">Balance </span>
              <span
                className={`font-bold ${
                  balance >= 100 ? 'text-emerald-400' : balance >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                ${balance.toFixed(0)}
              </span>
            </div>
            <div>
              <span className="text-slate-300">Invested </span>
              <span className="text-white font-bold">${totalMyBets}</span>
            </div>
            <div>
              <span className="text-slate-300">Total Pool </span>
              <span className="text-yellow-400 font-bold">${totalPool.toLocaleString()}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-medium">LIVE</span>
              <button
                onClick={() => setShowGeneralRules(true)}
                className="w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition-colors ml-1"
                aria-label="Show general rules"
              >
                ?
              </button>
            </div>
          </div>

          {/* Trading Section */}
          {phase === PHASES.RESOLUTION ? (
            <ResultBanner
              roundResult={roundResult!}
              pool={pool}
              totalPool={totalPool}
              totalMyBets={totalMyBets}
              roundProfit={roundProfit}
              myBetTotal={getMyBetTotal(roundResult!)}
              payout={getPotentialPayout(roundResult!)}
            />
          ) : (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden relative">
              {/* Bets Locked Overlay */}
              <BetsLockedOverlay show={betsLocked} />
              
              {/* Buy Amount Selector */}
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300 uppercase tracking-wide">Buy Amount</span>
                <div className="flex items-center gap-2">
                  {QUICK_BET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedBetAmount(amt)}
                      disabled={balance < amt}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-semibold transition-all
                        ${
                          selectedBetAmount === amt
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }
                        disabled:opacity-30 disabled:cursor-not-allowed
                      `}
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedBetAmount(Math.min(MAX_BET_AMOUNT, Math.floor(balance)))}
                    disabled={balance < 1}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-semibold transition-all
                      ${
                        selectedBetAmount === Math.min(MAX_BET_AMOUNT, Math.floor(balance))
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }
                      disabled:opacity-30 disabled:cursor-not-allowed
                    `}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Trading Rows */}
              <BettingRow
                type="player"
                label="PLAYER WINS"
                impliedOdds={getImpliedOdds('player')}
                pool={pool}
                canBet={canBet}
                marketLocked={marketLocked}
                selectedBetAmount={selectedBetAmount}
                hasPosition={getMyBetTotal('player') > 0}
                shares={getTotalShares('player')}
                amountPaid={getMyBetTotal('player')}
                winPayout={getPotentialPayout('player')}
                currentValue={getPositionValue('player')}
                pnl={getUnrealizedPnL('player')}
                onPlaceBet={() => placeBet('player')}
                onSellPosition={() => sellPosition('player')}
              />
              <BettingRow
                type="dealer"
                label="DEALER WINS"
                impliedOdds={getImpliedOdds('dealer')}
                pool={pool}
                canBet={canBet}
                marketLocked={marketLocked}
                selectedBetAmount={selectedBetAmount}
                hasPosition={getMyBetTotal('dealer') > 0}
                shares={getTotalShares('dealer')}
                amountPaid={getMyBetTotal('dealer')}
                winPayout={getPotentialPayout('dealer')}
                currentValue={getPositionValue('dealer')}
                pnl={getUnrealizedPnL('dealer')}
                onPlaceBet={() => placeBet('dealer')}
                onSellPosition={() => sellPosition('dealer')}
              />
              <BettingRow
                type="push"
                label="PUSH"
                impliedOdds={getImpliedOdds('push')}
                pool={pool}
                canBet={canBet}
                marketLocked={marketLocked}
                selectedBetAmount={selectedBetAmount}
                hasPosition={getMyBetTotal('push') > 0}
                shares={getTotalShares('push')}
                amountPaid={getMyBetTotal('push')}
                winPayout={getPotentialPayout('push')}
                currentValue={getPositionValue('push')}
                pnl={getUnrealizedPnL('push')}
                onPlaceBet={() => placeBet('push')}
                onSellPosition={() => sellPosition('push')}
              />
            </div>
          )}

          {/* Bottom Section: Live Trades + Live Chat */}
          <div className="grid grid-cols-2 gap-3 mt-4 flex-1">
            {/* Live Trades */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4">
              <div className="text-xs text-slate-300 uppercase tracking-wide mb-3">Live Trades</div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className={`text-xs flex items-center gap-2 ${
                      item.isYou ? 'text-yellow-400' : item.isSystem ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  >
                    <span className="font-medium truncate w-20">{item.username}</span>
                    {item.isSystem ? (
                      <span className="text-blue-400">⚡ Market shift</span>
                    ) : (
                      <>
                        <span className="text-slate-500">→</span>
                        <span
                          className={
                            item.type === 'player'
                              ? 'text-emerald-400'
                              : item.type === 'dealer'
                                ? 'text-amber-400'
                                : 'text-slate-400'
                          }
                        >
                          {item.typeLabel}
                        </span>
                        <span className={item.isSell ? 'text-red-400' : 'text-white'}>${item.amount}</span>
                      </>
                    )}
                  </div>
                ))}
                {activityFeed.length === 0 && (
                  <div className="text-slate-500 text-xs">Waiting for trades...</div>
                )}
              </div>
            </div>

            {/* Live Chat */}
            <LiveChat />
          </div>
        </div>
      </div>

      {/* General Rules Overlay */}
      <RulesOverlay
        isOpen={showGeneralRules}
        onClose={() => setShowGeneralRules(false)}
        title="Market Rules"
      >
        <div className="space-y-3">
          {/* Buying & Selling */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <span>💰</span>
              <span>Trading Shares</span>
            </h3>
            <div className="space-y-2 ml-7">
              <div className="bg-slate-900/50 rounded p-2 border border-slate-700">
                <div className="font-semibold text-blue-400 text-xs mb-0.5">Buy Shares</div>
                <div className="text-slate-300 text-xs">At current market price (true probability)</div>
              </div>
              <div className="bg-slate-900/50 rounded p-2 border border-slate-700">
                <div className="font-semibold text-purple-400 text-xs mb-0.5">Sell Shares</div>
                <div className="text-slate-300 text-xs">Sell anytime at current market price</div>
              </div>
            </div>
          </div>

          {/* Payouts */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <span>🏆</span>
              <span>Payouts</span>
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 text-center ml-7">
              <div className="text-2xl font-black text-emerald-400 mb-1">$1 per share</div>
              <div className="text-slate-300 text-xs">Each share pays $1 if outcome wins</div>
            </div>
          </div>

          {/* Fees */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <span>📊</span>
              <span>Platform Fee</span>
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 text-center ml-7">
              <div className="text-2xl font-black text-amber-400 mb-1">5%</div>
              <div className="text-slate-300 text-xs">Applied when buying shares</div>
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2.5">
              <div className="text-lg mb-1">⏱️</div>
              <div className="font-bold text-white text-xs mb-0.5">Prediction Window</div>
              <div className="text-slate-300 text-xs">20 seconds</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
              <div className="text-lg mb-1">🔒</div>
              <div className="font-bold text-white text-xs mb-0.5">Trading Locked</div>
              <div className="text-slate-300 text-xs">Final 2 seconds</div>
            </div>
          </div>
        </div>
      </RulesOverlay>

      {/* Developer Credit */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 px-4 py-2 z-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-slate-400">
            This game was designed and developed by <span className="text-slate-300 font-semibold">Bex Games</span> <span className="text-slate-500">2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
