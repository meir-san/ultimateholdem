# Architecture Overview

This document explains the app structure, game flow, and odds engine so a new developer can ramp up quickly. This codebase is a **prototype** of a production app intended for **real users** and **real money**, so correctness and auditability are core goals.

## Prototype vs Production (Confirmed)

The production build differs from this prototype in these specific, confirmed ways:

- **On-chain trading & settlement**: buys/sells and settlement are on-chain in production.
- **Wallet auth**: WalletConnect is used for authentication and settlement.
- **RNG / card generation**: production pulls RNG from Chainlink after the first bet is made (game start), then uses a formula to generate the next 22 cards in a pack. The system must be verifiably fair so players can verify the round after the fact via on-chain data (block/hash).
- **Odds engine**: production uses a hybrid of precomputed odds plus a server-side engine (not client-side).
- **Market pricing**: pricing is based only on odds.
- **Liquidity**: production liquidity is provided by the Rain prediction protocol. The prototype simulates this with local pool tracking, but payouts in production are backed by Rain's liquidity pools.

## High-Level Flow

1. `startNewRound()` resets state and initializes a deck.
2. Each phase (`advancePhase()`) deals cards and updates odds.
3. A prediction window opens, then the next phase begins.
4. After river, Player 2 + Player 3 cards are revealed and the hand is resolved.

## Game State (`src/stores/gameStore.ts`)

The Zustand store contains:

- **Cards**: `player1Cards`, `player2Cards`, `player3Cards`, `communityCards`
- **Reveals**: `revealedCards`, `manualRevealCount`, `firstBuyOutcome`, `chosenPlayer`
- **Phase**: `phase`, `timer`
- **Market**: `trueOdds`, `pool`, `crowdBets`
- **User positions**: `myPositions`, `balance`
- **History**: `roundHistory`, `priceHistory`

### Precomputation Fields

To avoid blocking the UI at phase transitions, we precompute odds during the prediction window:

- `pendingFlop`, `pendingTurn`, `pendingRiver` hold the next card(s) before they are revealed.
- `pendingOdds` holds the odds computed in a worker for the next phase.
- `pendingOddsPhase` + `pendingOddsKey` guard against stale worker results.

## Odds Engine (`src/utils/winProbability.ts`)

Rules are **three-player**:

- 2 hole cards each for Player 1, Player 2, Player 3
- 5 community cards
- Best 5-card hand wins
- Any tie pushes
- No folding, no qualification rules
- Odds only consider revealed cards; hidden cards are ignored in probability calculations

Current behavior (prototype):

- **Pre-deal**: fixed constant `32 / 32 / 32 / 4`
- **All phases**: odds are computed using **revealed cards only**
- **Three-player odds**: **Monte Carlo only** (exact enumeration is too heavy in-browser)
- **Hidden-card guard**: if any hole cards are hidden, displayed certainty is capped to avoid false 100%

This is intentionally a prototype compromise. Production must use server-side exact odds.

## Reveal Logic (Prototype)

- The **first non‑push buy** locks the primary revealed player (both cards) for the round.
- You can manually reveal **up to 2 additional cards** across other players via the folded-corner toggles.
- Remaining hidden cards stay hidden until resolution.

## Worker (`src/workers/oddsWorker.ts`)

The worker receives the known cards + deck and returns exact odds. The main thread:

- Kicks off the worker during the prediction window
- Stores results in `pendingOdds`
- Applies them instantly when the next phase starts

## Performance + Production Guidance

For production:

- Move exact enumeration to a **server-side odds service**
- Cache by `(player cards, dealer cards, community cards)`
- Precompute or table-serve heavy states (pre-deal/pre-flop)

This yields consistent, auditable odds without client delays.
