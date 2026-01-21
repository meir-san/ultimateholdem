# Ultimate Hold'em Prediction Market (Prototype for Production App)

This is a **prototype** of a production prediction-market game. The real app is intended for **real users** buying **real shares**, so correctness, determinism, and auditability are priorities. This prototype simulates a prediction market on a **three-player** Texas Hold'em hand. Users buy shares on four outcomes: **Player 1 wins**, **Player 2 wins**, **Player 3 wins**, or **Push**. The market updates after each phase with new odds, and the UI shows card state, prices, and history.

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
- `src/utils/winProbability.ts` - odds computation (Monte Carlo in prototype)
- `src/utils/pokerHands.ts` - hand evaluation + comparisons
- `src/workers/oddsWorker.ts` - off-thread odds computation
- `src/components/*` - UI components

## Odds System (Current Prototype)

The goal is **exact, deterministic odds** in production. The prototype uses Monte Carlo:

- **Pre-deal** uses a fixed constant: `32 / 32 / 32 / 4` (Player 1 / Player 2 / Player 3 / Push).
- **All phases** ignore hidden cards; odds only consider **revealed** cards.
- **Three-player odds** use **Monte Carlo** in the prototype because exact enumeration is too heavy in-browser.
- Odds are computed in a **Web Worker** and **precomputed during the 15s prediction window** to reduce UI stalls.
- If any hole cards are hidden, the UI caps displayed certainty to avoid false 100% from Monte Carlo noise.

## Reveal Rules (Prototype)

- The **first non‑push buy** locks the primary revealed player for the round (both cards).
- You can manually reveal **up to 2 additional cards total** across other players.
- After 2 manual reveals, remaining hidden cards stay hidden until resolution.

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
