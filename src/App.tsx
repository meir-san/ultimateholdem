import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from './stores/gameStore';
import { GameBoard } from './components/GameBoard';
import { PriceChart } from './components/PriceChart';
import { BettingRow } from './components/BettingRow';
import { ActivityFeed } from './components/ActivityFeed';
import { PHASES, QUICK_BET_AMOUNTS, MAX_BET_AMOUNT, CROWD_BET_DELAY_MIN, CROWD_BET_DELAY_MAX, PREDICTION_WINDOW } from './config/constants';

function App() {
  const {
    // State
    phase,
    timer,
    playerCards,
    dealerCards,
    communityCards,
    playerRaisedPreflop,
    playerRaisedPostflop,
    playerRaisedTurnRiver,
    playerFolded,
    trueOdds,
    roundResult,
    roundNumber,
    roundProfit,
    balance,
    selectedBetAmount,
    pool,
    activityFeed,
    priceHistory,
    myPositions,
    
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
      case PHASES.HOLE_CARDS:
        return 'HOLE CARDS';
      case PHASES.PREFLOP_DECISION:
        return playerRaisedPreflop ? 'RAISED 4x PRE-FLOP' : 'CHECKED PRE-FLOP';
      case PHASES.FLOP:
        return 'FLOP';
      case PHASES.POSTFLOP_DECISION:
        return playerRaisedPostflop ? 'RAISED 2x POST-FLOP' : 'CHECKED POST-FLOP';
      case PHASES.TURN_RIVER:
        return 'TURN & RIVER';
      case PHASES.FINAL_DECISION:
        return playerRaisedTurnRiver ? 'RAISED 1x' : 'FOLDED';
      case PHASES.SHOWDOWN:
        return 'SHOWDOWN';
      case PHASES.RESOLUTION:
        return 'RESOLUTION';
      default:
        return '';
    }
  }, [phase, playerRaisedPreflop, playerRaisedPostflop, playerRaisedTurnRiver]);

  const marketLocked = isMarketLocked();
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
            <h1 className="text-xl font-bold text-white">Ultimate Texas Hold'em</h1>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <span className="hover:text-white cursor-pointer">Home</span>
            <span className="hover:text-white cursor-pointer">Explore Markets</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold text-sm transition-colors">
            Deposit
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
            <span className="text-white font-bold">${balance.toFixed(2)}</span>
            <span className="text-slate-400">▾</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-100px)]">
        {/* LEFT SIDE - Game State */}
        <div className="w-1/2 p-4 border-r border-slate-800 flex flex-col gap-4">
          <GameBoard
            playerCards={playerCards}
            dealerCards={dealerCards}
            communityCards={communityCards}
            phase={phase}
            playerRaisedPreflop={playerRaisedPreflop}
            playerRaisedPostflop={playerRaisedPostflop}
            playerRaisedTurnRiver={playerRaisedTurnRiver}
            playerFolded={playerFolded}
          />

          {/* Phase Timer */}
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-300 uppercase tracking-wide">Phase</div>
              <div className="text-sm font-semibold text-white">{getPhaseLabel()}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-300">Timer</div>
              <div className={`text-2xl font-black ${timer <= 3 ? 'text-red-400' : 'text-white'}`}>
                {timer}s
              </div>
            </div>
          </div>

          <PriceChart
            priceHistory={priceHistory}
            hasPlayerPosition={getMyBetTotal('player') > 0}
            hasDealerPosition={getMyBetTotal('dealer') > 0}
            hasPushPosition={getMyBetTotal('push') > 0}
          />
        </div>

        {/* RIGHT SIDE - Trading Terminal */}
        <div className="w-1/2 p-4 flex flex-col gap-4">
          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm flex-wrap">
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
            </div>
          </div>

          {/* Result Banner */}
          {roundResult && (
            <div className={`p-4 rounded-lg font-bold text-center ${
              roundResult === 'player' ? 'bg-emerald-500/20 text-emerald-400' :
              roundResult === 'dealer' ? 'bg-amber-500/20 text-amber-400' :
              'bg-slate-500/20 text-slate-300'
            }`}>
              {roundResult === 'player' ? 'PLAYER WINS!' :
               roundResult === 'dealer' ? 'DEALER WINS!' :
               'PUSH!'}
              {roundProfit !== null && (
                <div className="text-sm mt-1">
                  {roundProfit >= 0 ? '+' : ''}${roundProfit.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Betting Amount Selector */}
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-4">
            <div className="text-xs text-slate-300 uppercase tracking-wide mb-2">Bet Amount</div>
            <div className="flex gap-2 flex-wrap">
              {QUICK_BET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedBetAmount(amount)}
                  className={`
                    px-4 py-2 rounded-lg font-semibold text-sm transition-colors
                    ${selectedBetAmount === amount
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }
                  `}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Betting Rows */}
          <div className="flex-1 space-y-2">
            <BettingRow
              type="player"
              label="Player"
              impliedOdds={getImpliedOdds('player')}
              pool={pool}
              canBet={canBet}
              marketLocked={marketLocked}
              selectedBetAmount={selectedBetAmount}
              hasPosition={myPositions.player.length > 0}
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
              label="Dealer"
              impliedOdds={getImpliedOdds('dealer')}
              pool={pool}
              canBet={canBet}
              marketLocked={marketLocked}
              selectedBetAmount={selectedBetAmount}
              hasPosition={myPositions.dealer.length > 0}
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
              label="Push"
              impliedOdds={getImpliedOdds('push')}
              pool={pool}
              canBet={canBet}
              marketLocked={marketLocked}
              selectedBetAmount={selectedBetAmount}
              hasPosition={myPositions.push.length > 0}
              shares={getTotalShares('push')}
              amountPaid={getMyBetTotal('push')}
              winPayout={getPotentialPayout('push')}
              currentValue={getPositionValue('push')}
              pnl={getUnrealizedPnL('push')}
              onPlaceBet={() => placeBet('push')}
              onSellPosition={() => sellPosition('push')}
            />
          </div>

          {/* Activity Feed */}
          <ActivityFeed items={activityFeed} />
        </div>
      </div>
    </div>
  );
}

export default App;
