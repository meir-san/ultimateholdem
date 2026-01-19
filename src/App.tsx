import { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { PlayerDealerCards } from './components/PlayerDealerCards';
import { PhaseTimer } from './components/PhaseTimer';
import { PriceChart } from './components/PriceChart';
import { BettingRow } from './components/BettingRow';
import { ResultBanner } from './components/ResultBanner';
import { BetsLockedOverlay } from './components/BetsLockedOverlay';
import { LiveChat } from './components/LiveChat';
import { RoundHistory } from './components/RoundHistory';
import { PHASES, QUICK_BET_AMOUNTS, MAX_BET_AMOUNT, CROWD_BET_DELAY_MIN, CROWD_BET_DELAY_MAX, PREDICTION_WINDOW } from './config/constants';

function App() {
  const {
    // State
    phase,
    timer,
    playerCards,
    dealerCards,
    communityCards,
    trueOdds,
    roundResult,
    roundNumber,
    roundProfit,
    balance,
    selectedBetAmount,
    lifetimeVolume,
    pool,
    activityFeed,
    priceHistory,
    roundHistory,
    
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
    
    // Computed
    getMyBetTotal,
    getTotalMyBets,
    getPositionValue,
    getTotalShares,
    getPotentialPayout,
    getUnrealizedPnL,
    getImpliedOdds,
    isMarketLocked,
  } = useGameStore();

  const shouldAdvanceRef = useRef(false);
  const crowdIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFeesOverlay, setShowFeesOverlay] = useState(false);
  const [pendingBuy, setPendingBuy] = useState({ player: false, dealer: false, push: false });
  const buyTimeoutsRef = useRef<{ [key in 'player' | 'dealer' | 'push']?: ReturnType<typeof setTimeout> }>({});

  // Initialize game
  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  // Auto-countdown timer
  useEffect(() => {
    if (phase === PHASES.RESOLUTION) return;

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const hasUserBets = state.myPositions.player.length > 0 || 
                          state.myPositions.dealer.length > 0 || 
                          state.myPositions.push.length > 0;
      const countdownStarted = state.timer < PREDICTION_WINDOW;
      
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

  // Auto-start next round after resolution
  useEffect(() => {
    if (phase === PHASES.RESOLUTION) {
      const timer = setTimeout(() => {
        nextRound();
      }, 5000); // Show result for 5 seconds
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
    switch (phase) {
      case PHASES.PRE_DEAL:
        return 'PRE-DEAL';
      case PHASES.PLAYER_CARDS:
        return 'PLAYER 1 CARDS';
      case PHASES.FLOP:
        return 'FLOP';
      case PHASES.TURN:
        return 'TURN';
      case PHASES.RIVER:
        return 'RIVER';
      case PHASES.DEALER_CARDS:
        return 'PLAYER 2 CARDS';
      case PHASES.RESOLUTION:
        return 'SETTLEMENT';
      default:
        return '';
    }
  }, [phase]);

  const getNextAction = useCallback((): string => {
    if (phase === PHASES.PRE_DEAL) {
      return 'Player 1 cards will be dealt';
    }
    if (phase === PHASES.PLAYER_CARDS) {
      return 'Flop will be dealt';
    }
    if (phase === PHASES.FLOP) {
      return 'Turn card will be dealt';
    }
    if (phase === PHASES.TURN) {
      return 'River card will be dealt';
    }
    if (phase === PHASES.RIVER) {
      return 'Player 2 cards will be dealt';
    }
    if (phase === PHASES.DEALER_CARDS) {
      return 'Showdown';
    }
    return '';
  }, [phase]);

  const marketLocked = isMarketLocked();
  const totalPool = pool.player + pool.dealer + pool.push;
  const totalMyBets = getTotalMyBets();
  const betsLocked = timer <= 2 && phase !== PHASES.RESOLUTION;
  const canBet = phase !== PHASES.RESOLUTION && balance >= selectedBetAmount && !marketLocked && !betsLocked;

  useEffect(() => {
    return () => {
      Object.values(buyTimeoutsRef.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const handlePlaceBet = (type: 'player' | 'dealer' | 'push') => {
    const hasPosition = getMyBetTotal(type) > 0;
    if (!hasPosition && canBet) {
      setPendingBuy((prev) => ({ ...prev, [type]: true }));
      if (buyTimeoutsRef.current[type]) {
        clearTimeout(buyTimeoutsRef.current[type]);
      }
      buyTimeoutsRef.current[type] = setTimeout(() => {
        setPendingBuy((prev) => ({ ...prev, [type]: false }));
      }, 1000);
    }
    placeBet(type);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* App Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Ultimate Texas Hold'em</h1>
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

      {/* Round History */}
      <RoundHistory roundHistory={roundHistory} />

      <div className="flex min-h-[calc(100vh-100px)]">
        {/* LEFT SIDE - Game State */}
        <div className="w-1/2 p-4 border-r border-slate-800 flex flex-col">
          <PlayerDealerCards
            phase={phase}
            playerCards={playerCards}
            dealerCards={dealerCards}
            communityCards={communityCards}
            showDealerCards={phase === PHASES.DEALER_CARDS || phase === PHASES.RESOLUTION}
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
              <span className="text-slate-300">Total Volume </span>
              <span className="text-yellow-400 font-bold">${lifetimeVolume.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-300">Total Fees </span>
              <span className="text-rose-400 font-bold">${(lifetimeVolume * 0.035).toFixed(2)}</span>
              <button
                onClick={() => setShowFeesOverlay(true)}
                className="w-4 h-4 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                aria-label="Show fee breakdown"
              >
                ?
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-medium">LIVE</span>
              <button
                onClick={() => {}}
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
                label="PLAYER 1 WINS"
                impliedOdds={getImpliedOdds('player')}
                pool={pool}
                canBet={canBet}
                marketLocked={marketLocked}
                selectedBetAmount={selectedBetAmount}
                hasPosition={getMyBetTotal('player') > 0 && !pendingBuy.player}
                isProcessing={pendingBuy.player}
                shares={getTotalShares('player')}
                amountPaid={getMyBetTotal('player')}
                winPayout={getPotentialPayout('player')}
                currentValue={getPositionValue('player')}
                pnl={getUnrealizedPnL('player')}
                onPlaceBet={() => handlePlaceBet('player')}
                onSellPosition={() => sellPosition('player')}
              />
              <BettingRow
                type="dealer"
                label="PLAYER 2 WINS"
                impliedOdds={getImpliedOdds('dealer')}
                pool={pool}
                canBet={canBet}
                marketLocked={marketLocked}
                selectedBetAmount={selectedBetAmount}
                hasPosition={getMyBetTotal('dealer') > 0 && !pendingBuy.dealer}
                isProcessing={pendingBuy.dealer}
                shares={getTotalShares('dealer')}
                amountPaid={getMyBetTotal('dealer')}
                winPayout={getPotentialPayout('dealer')}
                currentValue={getPositionValue('dealer')}
                pnl={getUnrealizedPnL('dealer')}
                onPlaceBet={() => handlePlaceBet('dealer')}
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
                hasPosition={getMyBetTotal('push') > 0 && !pendingBuy.push}
                isProcessing={pendingBuy.push}
                shares={getTotalShares('push')}
                amountPaid={getMyBetTotal('push')}
                winPayout={getPotentialPayout('push')}
                currentValue={getPositionValue('push')}
                pnl={getUnrealizedPnL('push')}
                onPlaceBet={() => handlePlaceBet('push')}
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

      {/* Fees Breakdown Overlay */}
      {showFeesOverlay && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowFeesOverlay(false)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Fee Breakdown</h3>
              <button
                onClick={() => setShowFeesOverlay(false)}
                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-lg transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-4">3.5% total rake on all volume</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-700">
                <span className="text-slate-300">Buyback & Burn</span>
                <div className="text-right">
                  <span className="text-rose-400 font-bold">${(lifetimeVolume * 0.015).toFixed(2)}</span>
                  <span className="text-slate-500 text-sm ml-2">1.5%</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-700">
                <span className="text-slate-300">Liquidity</span>
                <div className="text-right">
                  <span className="text-rose-400 font-bold">${(lifetimeVolume * 0.015).toFixed(2)}</span>
                  <span className="text-slate-500 text-sm ml-2">1.5%</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-300">Traffic</span>
                <div className="text-right">
                  <span className="text-rose-400 font-bold">${(lifetimeVolume * 0.005).toFixed(2)}</span>
                  <span className="text-slate-500 text-sm ml-2">0.5%</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-600 flex items-center justify-between">
              <span className="text-white font-semibold">Total Fees</span>
              <span className="text-rose-400 font-bold text-lg">${(lifetimeVolume * 0.035).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

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
