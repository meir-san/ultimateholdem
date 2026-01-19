# Ultimate Hold'em Prediction Market (Prototype for Production App)

This is a **prototype** of a production prediction-market game. The real app is intended for **real users** buying **real shares**, so correctness, determinism, and auditability are priorities. This prototype simulates a prediction market on a heads-up Texas Hold'em hand. Users buy shares on three outcomes: **Player 1 wins**, **Player 2 wins**, or **Push**. The market updates after each phase with new odds, and the UI shows card state, prices, and history.

## Quick Start

```bash
npm install
npm run dev
```

## Key Concepts

- **Game phases**: `PRE_DEAL → PLAYER_CARDS → FLOP → TURN → RIVER → DEALER_CARDS → RESOLUTION`
- **Market**: Prices reflect true odds, while pool sizes affect payouts
- **Prediction windows**: A timer allows trading between phases

## Code Map

- `src/App.tsx` - main UI layout and wiring
- `src/stores/gameStore.ts` - game state + phase transitions
- `src/utils/winProbability.ts` - exact odds computation
- `src/utils/pokerHands.ts` - hand evaluation + comparisons
- `src/workers/oddsWorker.ts` - off-thread odds computation
- `src/components/*` - UI components

## Odds System (Current Prototype)

The goal is **exact, deterministic odds**:

- **Pre-deal** uses a fixed constant: `48 / 48 / 4` (Player 1 / Player 2 / Push).
- **Flop/Turn/River** uses **exact enumeration** of all remaining cards.
- **Pre-flop (player cards known, no board)** still uses Monte Carlo due to the massive state space.
- Exact enumeration runs in a **Web Worker** and is **precomputed during the 15s prediction window** to avoid UI stalls at phase transitions.

See `docs/ARCHITECTURE.md` for the full flow and performance notes.

## Prototype vs Production

This repo is a prototype. The production build will differ in the following confirmed ways:

- **On-chain trading & settlement**: buys/sells and settlement are on-chain in production.
- **Wallet auth**: production uses WalletConnect for user authentication and settlement.
- **RNG / card generation**: production pulls RNG from Chainlink after the first bet is made, then uses a formula to generate the next 22 cards in a pack. The system must be verifiably fair so players can verify the round after the fact via the relevant on-chain data (block/hash).
- **Odds engine**: production uses a hybrid of precomputed odds plus a server-side engine (not client-side).
- **Market pricing**: pricing is based only on odds (no pool-based pricing).

## Implementation Notes (Prototype)

This prototype runs odds in the browser for simplicity. It is intentionally not production-grade on compute, latency, or auditability.
