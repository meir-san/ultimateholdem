# Architecture Overview

This document explains the app structure, game flow, and odds engine so a new developer can ramp up quickly. This codebase is a **prototype** of a production app intended for **real users** and **real money**, so correctness and auditability are core goals.

## Prototype vs Production (Confirmed)

The production build differs from this prototype in these specific, confirmed ways:

- **On-chain trading & settlement**: buys/sells and settlement are on-chain in production.
- **Wallet auth**: WalletConnect is used for authentication and settlement.
- **RNG / card generation**: production pulls RNG from Chainlink after the first bet is made (game start), then uses a formula to generate the next 22 cards in a pack. The system must be verifiably fair so players can verify the round after the fact via on-chain data (block/hash).
- **Odds engine**: production uses a hybrid of precomputed odds plus a server-side engine (not client-side).
- **Market pricing**: pricing is based only on odds.

## High-Level Flow

1. `startNewRound()` resets state and initializes a deck.
2. Each phase (`advancePhase()`) deals cards and updates odds.
3. A prediction window opens, then the next phase begins.
4. After river, dealer cards are dealt and the hand is resolved.

## Game State (`src/stores/gameStore.ts`)

The Zustand store contains:

- **Cards**: `playerCards`, `dealerCards`, `communityCards`
- **Phase**: `phase`, `timer`
- **Market**: `trueOdds`, `pool`, `crowdBets`
- **User positions**: `myPositions`, `balance`
- **History**: `roundHistory`, `priceHistory`

### Precomputation Fields

To avoid blocking the UI at phase transitions, we precompute exact odds during the prediction window:

- `pendingFlop`, `pendingTurn`, `pendingRiver` hold the next card(s) before they are revealed.
- `pendingOdds` holds the exact odds computed in a worker for the next phase.
- `pendingOddsPhase` + `pendingOddsKey` guard against stale worker results.

## Odds Engine (`src/utils/winProbability.ts`)

Rules are **pure heads-up**:

- 2 hole cards each
- 5 community cards
- Best 5-card hand wins
- Ties push
- No folding, no qualification rules

Current behavior:

- **Pre-deal**: fixed constant `48 / 48 / 4`
- **Flop/Turn/River**: exact enumeration across all remaining cards
- **Pre-flop**: Monte Carlo (full enumeration is too large for a browser)

Exact enumeration is expensive but deterministic. It runs in a worker to keep the UI responsive.

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
