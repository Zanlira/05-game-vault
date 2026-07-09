# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — online platform to play retro arcade games and compete on real leaderboards. Spanish-language UI, neon/CRT aesthetic. Built with Spec Driven Design (`/spec` + `/spec-impl` skills); specs live in `specs/NN-slug.md`.

No test runner configured yet.

### Games

Catalog of 8 games in `app/data/games.ts` (metadata: id, title, category, cover class, color, fake best/plays). 4 are actually playable with real canvas engines, wired in `app/components/games/registry.ts`:

- **arkanoid**, **asteroids**, **snake**, **tetris** — each a `"use client"` React wrapper + a framework-agnostic `*-engine.ts` canvas engine. Assets (sprites, levels) under `app/components/games/<game>-assets/`.
- The other 4 (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) are catalog-only placeholders; the play page fakes a score for them.

Game components implement `GameProps` (paused, onScoreChange/onLivesChange/onLevelChange/onGameOver) and expose `GameHandle` (`forceGameOver`) via ref. To add a game, use `/add-game` then `/spec-impl`.

### Backend

- **Supabase** — auth + `scores` leaderboard table. Clients in `lib/supabase/`: `client.ts` (browser), `server.ts` (SSR/cookies). Leaderboard read/write helpers in `lib/supabase/scores.ts` (`insertScore`, `getTopScores`). Seeded fake scores fallback in `app/data/scores.ts`.
- **Resend** — contact form email via `app/api/contact/route.ts`.
- Auth session shared client-side through `app/context/UserContext.tsx` (`useUser`).

Env vars (`.env.local`, see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`.

## Stack

- **Next.js 16.2.9** — App Router only (no Pages Router). Breaking changes from prior versions; read `node_modules/next/dist/docs/` before writing code.
- **React 19.2.4** — Server Components by default in App Router.
- **Tailwind CSS v4** — config via `postcss.config.mjs`, not `tailwind.config.js`. V4 has breaking changes from v3.
- **TypeScript** — strict mode, path alias `@/*` maps to repo root.

## skills

usa siempre /frontend-design para diseñar interfaces de usuario.

Para integrar un juego nuevo (de `references/started-games/` o externo) al vault con leaderboard real, usa `/add-game` — genera el spec, luego correr `/spec-impl` sobre él.

## agents

`game-planner` — decide qué juego arcade añadir al vault. Investiga catálogo actual, huecos categoría/mecánica/estética, propone candidatos, mantiene memoria en `references/game-suggestions.md`. Usar antes de `/add-game`.

## Architecture

App Router file conventions in `app/`:

- `layout.tsx` — root layout, sets Geist fonts, full-height flex body
- `page.tsx` — route segment page
- `globals.css` — global styles

Current routes:

- `/` — home landing
- `/games` — catalog grid; `/games/[id]` — detail + leaderboard; `/games/[id]/play` — player (mounts engine from registry, saves score to Supabase)
- `/salon` — leaderboard hall
- `/auth` — login/signup (Supabase)
- `/about` — about + contact form (Resend)

New routes: add `app/<route>/page.tsx`. Shared UI: `app/components/` (`Nav.tsx`, `GameCard.tsx`, games under `components/games/`). No `/pages` directory.

Server Components render on server by default. Add `"use client"` only when browser APIs or interactivity needed (all game engines and the play page are client components).
