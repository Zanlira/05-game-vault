# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — online platform to play games and compete for points. Uses Spec Driven Design (`/spec` + `/spec-impl` skills).

No test runner configured yet.

## Stack

- **Next.js 16.2.9** — App Router only (no Pages Router). Breaking changes from prior versions; read `node_modules/next/dist/docs/` before writing code.
- **React 19.2.4** — Server Components by default in App Router.
- **Tailwind CSS v4** — config via `postcss.config.mjs`, not `tailwind.config.js`. V4 has breaking changes from v3.
- **TypeScript** — strict mode, path alias `@/*` maps to repo root.

## skills

usa siempre /frontend-design para diseñar interfaces de usuario.

## Architecture

App Router file conventions in `app/`:
- `layout.tsx` — root layout, sets Geist fonts, full-height flex body
- `page.tsx` — route segment page
- `globals.css` — global styles

New routes: add `app/<route>/page.tsx`. Shared UI: `app/components/` (create as needed). No `/pages` directory.

Server Components render on server by default. Add `"use client"` only when browser APIs or interactivity needed.
