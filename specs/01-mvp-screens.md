---
spec: 01-mvp-screens
state: Implemented
dependencies: none
date: 2026-06-13
objective: Implementar todas las pantallas visuales de Arcade Vault MVP en Next.js App Router, fieles a los templates de referencia, sin lógica de juego real.
---

## Scope

### In scope
- Nav component (desktop + mobile panel)
- Pantalla Biblioteca (`/`): hero, búsqueda, filtros por categoría, grid de GameCards con efecto tilt
- Pantalla Detalle (`/games/[id]`): portada, info, stats, leaderboard sidebar, botones de acción
- Pantalla Reproductor (`/games/[id]/play`): HUD, pantalla CRT con animaciones CSS, modal fin de juego
- Pantalla Auth (`/auth`): tabs login/registro, formulario, botón invitado, botones sociales
- Pantalla Salón de la Fama (`/salon`): podio top 3, tabla completa, fila de usuario autenticado
- Footer global
- React Context para estado de usuario (sin backend — mock login)
- Datos mock en `app/data/` — estructura preparada para reemplazar con DB en el futuro
- Estilos: `globals.css` existente + clases faltantes portadas desde `references/templates/styles.css` + Tailwind para estilos nuevos

### Not in scope
- Lógica de juego real
- Backend, base de datos, autenticación real
- Persistencia de scores en servidor (solo localStorage)
- Multiplayer
- Animaciones de transición entre rutas
- Internacionalización

## Data model

### `app/data/games.ts`
```ts
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;       // CSS class name for cover gradient
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export const GAMES: Game[] = [ /* 8 juegos del template */ ];
export const CATS: string[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
```

### `app/data/scores.ts`
```ts
export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};

export function seededScores(seed: number, count?: number): ScoreRow[] { /* port de data.jsx */ }
```

### `app/data/users.ts`
```ts
export type User = {
  name: string;   // max 10 chars, uppercase
};
```

### `app/context/UserContext.tsx`
```ts
// React Context con useState
// Expone: user, login(User), signOut()
// Persiste en localStorage bajo clave "av_user"
```

### Score local (localStorage)
Clave `"av_scores"` — array de `{ game: string, score: number, name: string, at: number }`.
No hay tipo exportado; se accede solo desde el Reproductor.

## Implementation plan

1. **CSS base** — Leer `references/templates/styles.css`, portar clases faltantes a `app/globals.css`. Verificar cover gradients, animaciones (flicker, blink, fade-in, pulse, CRT), neon glows.

2. **Data layer** — Crear `app/data/games.ts`, `app/data/scores.ts`, `app/data/users.ts` con tipos y datos mock del template.

3. **UserContext** — Crear `app/context/UserContext.tsx` (Client Component). Wrappear en `app/layout.tsx`.

4. **Nav + Footer** — Crear `app/components/Nav.tsx` y footer inline en layout. Nav: logo, links, coin counter, auth button, mobile panel.

5. **Pantalla Biblioteca** (`app/page.tsx`) — Hero, búsqueda, chips de categoría, grid de GameCards con tilt effect. Client Component.

6. **Pantalla Detalle** (`app/games/[id]/page.tsx`) — Cover, info, stat strip, botones, leaderboard sidebar.

7. **Pantalla Reproductor** (`app/games/[id]/play/page.tsx`) — HUD, CRT screen con animaciones CSS, modal fin de juego, guardar score en localStorage.

8. **Pantalla Auth** (`app/auth/page.tsx`) — Tabs login/registro, form, botón invitado, social buttons. Al submit → login en Context → redirect a `/`.

9. **Pantalla Salón de la Fama** (`app/salon/page.tsx`) — Podio top 3, tabla, fila del usuario autenticado.

10. **QA visual** — Recorrer todas las rutas, comparar contra templates, verificar responsive mobile.

## Acceptance criteria

- [ ] `/` muestra hero, barra de búsqueda, chips de categoría y 8 cards de juegos
- [ ] Filtrar por categoría oculta cards que no coinciden
- [ ] Buscar por nombre filtra el grid en tiempo real
- [ ] Click en card navega a `/games/[id]`
- [ ] `/games/[id]` muestra portada, info completa, stat strip y leaderboard con 10 filas
- [ ] Botón "JUGAR AHORA" navega a `/games/[id]/play`
- [ ] Botón "VOLVER AL VAULT" regresa a `/`
- [ ] `/games/[id]/play` muestra HUD con score, vidas, nivel y nombre de jugador
- [ ] Score incrementa automáticamente; PAUSA detiene el incremento
- [ ] Botón FIN abre modal con puntuación final e input de iniciales
- [ ] "GUARDAR PUNTUACIÓN" persiste en localStorage y muestra confirmación
- [ ] `/auth` muestra tabs login/registro, formulario y botón invitado
- [ ] Submit de cualquier tab setea usuario en Context y redirige a `/`
- [ ] Nav muestra nombre de usuario cuando hay sesión; botón "Iniciar Sesión" cuando no
- [ ] Sign out limpia el Context y localStorage
- [ ] `/salon` muestra podio top 3, tabla de 12 filas y tabs por juego
- [ ] Con usuario autenticado, `/salon` muestra fila destacada con su puntuación
- [ ] Nav funciona en mobile: hamburger abre panel lateral
- [ ] Todas las rutas renderizan sin errores de consola en Next.js

## Decisions taken and discarded

| Decisión | Elegida | Descartada | Razón |
|---|---|---|---|
| Routing | App Router URLs reales (`/games/[id]`) | Hash routing SPA | Más idiomático en Next.js, mejor SEO futuro |
| Estado usuario | React Context + localStorage | Zustand/Jotai, props drilling | Suficiente para MVP sin dependencias extra |
| CSS | `globals.css` + Tailwind para estilos nuevos | CSS Modules, Tailwind puro | globals.css ya migrado; reescribir en Tailwind riesgo de perder look |
| Datos mock | `app/data/` (preparado para DB) | `lib/data.ts` | Convención del proyecto: datos viven en `app/` |
| Reproductor | Pantalla CRT con animaciones CSS + HUD funcional | Placeholder vacío | Fiel al scope visual del MVP |
| Auth | Mock (Context only, sin backend) | NextAuth, Supabase | Fuera de scope del MVP |

## Identified risks

- **globals.css incompleta:** `styles.css` del template puede tener clases no portadas aún (cover gradients, CRT, tilt, neon). Mitigación: leer `styles.css` en el paso 1 del plan.
- **`"use client"` scope:** Casi todas las pantallas tienen interactividad; marcar mal los límites puede romper SSR o generar hydration mismatches. Mitigación: screens como Client Components por defecto en este MVP.
- **Tilt effect:** usa `onMouseMove` + `ref` — requiere Client Component. Aislar `GameCard` para no contaminar el page completo.
