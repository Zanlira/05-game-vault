---
spec: 07-tetris-game
state: implemented
dependencies: 04-supabase-setup, 05-asteroids-game
date: 2026-07-07
objective: Adaptar el juego Tetris (references/started-games/03-tetris/game.js) a un componente React canvas montado en /games/tetris/play, renombrando el id/título del juego de "caida" a "tetris", introduciendo el registro genérico GAME_ENGINES (primer juego tras asteroids), y conectando leaderboard real en Supabase.
---

## Scope

### In scope

- Renombrar en `app/data/games.ts` el juego `id: "caida"` → `id: "tetris"`, `title: "CAÍDA"` → `title: "TETRIS"` (short/long/cat/cover/color/best/plays se mantienen tal cual — ya describen tetris)
- Crear `app/components/games/registry.ts` (no existe aún) con `GameProps`, `GameHandle`, y `GAME_ENGINES: Record<string, ComponentType<GameProps & RefAttributes<GameHandle>>>` conteniendo `asteroids: Asteroids` inicialmente
- Refactor de `Asteroids.tsx` para importar `GameProps`/`GameHandle` desde `registry.ts` en vez de sus tipos propios `AsteroidsProps`/`AsteroidsHandle`
- Generalizar los 3 archivos que hoy tienen `id === "asteroids"` hardcodeado (`app/games/[id]/play/page.tsx`, `app/games/[id]/page.tsx`, `app/salon/page.tsx`) para usar `GAME_ENGINES`/`hasEngine` en vez del literal, verificando que asteroids sigue funcionando igual tras el cambio
- Copiar `references/started-games/03-tetris/game.js` a `app/components/games/tetris-engine.ts`, adaptado con la MÍNIMA envoltura necesaria: recibir `board` y `nextCanvas` como parámetros (en vez de `getElementById('board')`/`getElementById('next-canvas')`), exponer `createTetrisGame(board, nextCanvas, hooks): TetrisControls`. Lógica de piezas, colisión, rotación (`rotateCW`/`tryRotate`), `clearLines`, `ghostY`, `draw`/`drawNext`/`drawGrid`/`drawBlock` se mantienen intactas, sin reescritura
- Hooks `onScoreChange(score)`, `onLinesChange(lines)` (no `onLivesChange` — tetris no tiene vidas, usa líneas), `onLevelChange(level)`, `onGameOver(finalScore)`, insertados en los puntos donde el motor ya muta `score`/`lines`/`level` (`clearLines()`, `hardDrop()`, `softDrop()`) y donde transiciona a game over (`endGame()`, llamado desde `spawn()`)
- Extensión de `GameProps` para tetris: como el tipo genérico de `registry.ts` usa `onLivesChange`, `Tetris.tsx` documenta explícitamente que mapea su `onLinesChange` interno al mismo slot funcional (el HUD React de `[id]/play/page.tsx` mostrará "LÍNEAS" en vez de "VIDAS" cuando `id === "tetris"`)
- Nuevo componente `app/components/games/Tetris.tsx` — client component `forwardRef<GameHandle, GameProps>` que monta **dos** `<canvas>` (uno 300×600 para el tablero, uno 120×120 para "next"), instancia `createTetrisGame(boardRef.current, nextRef.current, hooks)` en un `useEffect`, limpia con `destroy()` al desmontar
- `pause()`/`resume()` adaptados al patrón estándar del vault (igual que asteroids): `update()` (drop/lock) retorna temprano si `isPaused`, `draw()` sigue corriendo siempre — a diferencia del original que cancelaba `requestAnimationFrame` completo en pausa
- `forceGameOver()` fuerza la misma ruta que usa `spawn()` cuando una pieza nueva colisiona (llama `endGame()` directamente)
- Descartar del engine: `restartBtn` (DOM), `themeToggle`/`localStorage tetris-theme`/`document.body.classList` — el restart pasa a ser el flujo React existente (modal game over) y el theme no aplica al vault
- Resolver la dependencia de `--grid-line` en `drawGrid()` (originalmente lee `getComputedStyle(document.body)`) con un valor de color fijo dentro del engine, ya que el canvas no dependerá de clases de tema en `body`
- Registrar `tetris: Tetris` en `GAME_ENGINES` (`registry.ts`)
- Controles: solo teclado (flechas + X para rotar + espacio + P para pausa — P se ignora dentro del engine ya que la pausa la controla el HUD React vía prop `paused`, igual que asteroids)
- Leaderboard real: `getTopScores("tetris", 10)` en `[id]/page.tsx`, `getTopScores("tetris", 12)` en `salon/page.tsx`, `insertScore({ game: "tetris", ... })` en `play/page.tsx` — automático una vez generalizados los 3 archivos vía `GAME_ENGINES`, sin lógica adicional específica de tetris

### Not in scope

- Controles táctiles/mobile
- Cambios a la lógica de juego original (piezas, wall kicks, puntuación, velocidad por nivel) — se copia tal cual
- Sonido/música — el original no lo tiene
- Theme toggle claro/oscuro del juego original (`tetris-theme` en localStorage) — se descarta, el vault no lo usa
- Adaptar Arkanoid (`references/started-games/04-arkanoid`) — spec separado
- Cambiar el diseño del HUD React genérico más allá de renombrar la etiqueta "VIDAS"→"LÍNEAS" cuando `id === "tetris"` (queda cubierto en este spec porque es parte directa de conectar el hook)

## Data model

No introduce estructuras persistentes nuevas. Cambios son de tipos/forma de función existentes:

- `app/data/games.ts` — entrada existente muta valores (`id`, `title`), tipo `Game` no cambia
- `app/components/games/registry.ts` (nuevo):

```ts
export type GameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type GameHandle = {
  forceGameOver: () => void;
};

export const GAME_ENGINES: Record<
  string,
  ComponentType<GameProps & RefAttributes<GameHandle>>
> = {
  asteroids: Asteroids,
  tetris: Tetris,
};
```

- `tetris-engine.ts` — tipos nuevos, solo en memoria:

```ts
type TetrisHooks = {
  onScoreChange?: (score: number) => void;
  onLinesChange?: (lines: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

type TetrisControls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

function createTetrisGame(
  board: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  hooks: TetrisHooks
): TetrisControls;
```

- `Tetris.tsx` — implementa `GameProps`/`GameHandle` de `registry.ts`; internamente mapea `props.onLivesChange` → se le pasa como `hooks.onLinesChange` al motor (incompatibilidad de nombre documentada, no de forma)
- El registro guardado en Supabase (`scores`) no cambia forma, solo `game` pasará a valer `"tetris"`

## Implementation plan

1. **Renombrar juego en `games.ts`** — cambiar `id: "caida"` → `id: "tetris"`, `title: "CAÍDA"` → `title: "TETRIS"` en `app/data/games.ts`. App sigue compilando, ruta `/games/tetris` navegable.

2. **Crear `registry.ts`** — `app/components/games/registry.ts` con `GameProps`, `GameHandle`, `GAME_ENGINES` conteniendo solo `asteroids: Asteroids` por ahora. Refactor `Asteroids.tsx` para importar esos tipos en vez de `AsteroidsProps`/`AsteroidsHandle` propios. Verificar: `tsc --noEmit` limpio, `/games/asteroids/play` sigue funcionando igual.

3. **Generalizar las 3 páginas** — reemplazar `id === "asteroids"` por `id in GAME_ENGINES` (o `tab in GAME_ENGINES` en `salon/page.tsx`) en `app/games/[id]/play/page.tsx`, `app/games/[id]/page.tsx`, `app/salon/page.tsx`; `insertScore`/`getTopScores` usan `id`/`tab` dinámico en vez del literal `"asteroids"`. Verificar: asteroids sigue jugable, guardando y mostrando leaderboard exactamente igual que antes del refactor.

4. **Copiar y envolver el engine** — crear `app/components/games/tetris-engine.ts` desde `references/started-games/03-tetris/game.js`:
   - `createTetrisGame(board, nextCanvas, hooks)` reemplaza los `getElementById`
   - Listeners de `keydown` agregados/removidos dentro de la función (idempotente en `destroy()`)
   - Insertar hooks en `clearLines()`, `hardDrop()`, `softDrop()`, `endGame()`
   - `pause()`/`resume()` vía bandera `isPaused`; `draw()` sigue llamándose siempre en el loop
   - `forceGameOver()` llama `endGame()` directamente
   - Eliminar `restartBtn`, `themeToggle`, lectura de `localStorage tetris-theme`
   - `drawGrid()` usa un color fijo en vez de `getComputedStyle(document.body)`
   - `requestAnimationFrame` cancelable, `destroy()` llama `cancelAnimationFrame`
   - Verificar: `tsc --noEmit` pasa, sin referencias a `document`/`window` fuera de los canvas/listeners del engine

5. **Crear `Tetris.tsx`** — `app/components/games/Tetris.tsx`, `forwardRef<GameHandle, GameProps>`:
   - Renderiza `<canvas width={300} height={600} ref={boardRef} />` + `<canvas width={120} height={120} ref={nextRef} />`
   - `useEffect` monta `createTetrisGame`, limpia con `destroy()`
   - `useEffect` separado observa `paused` → `pause()`/`resume()`
   - `useImperativeHandle` expone `forceGameOver`
   - Mapea `onLivesChange` de props a `onLinesChange` del motor
   - Verificar: componente monta sin errores, canvas responde a flechas/X/espacio en uso aislado

6. **Registrar en `GAME_ENGINES`** — agregar `tetris: Tetris` en `registry.ts`.

7. **Ajustar etiqueta HUD** — en `app/games/[id]/play/page.tsx`, la etiqueta del HUD React que hoy dice "VIDAS" muestra "LÍNEAS" cuando `id === "tetris"` (mismo state `lives` reutilizado como contador de líneas para ese id).

8. **Verificar leaderboard** — jugar Tetris en `/games/tetris/play`, hacer líneas, morir (pieza nueva colisiona), guardar puntaje, confirmar fila en Supabase con `game: "tetris"`; confirmar `/games/tetris` y `/salon` tab `tetris` muestran top real.

## Acceptance criteria

- [ ] `app/data/games.ts` tiene `id: "tetris"`, `title: "TETRIS"` (ya no existe `id: "caida"`)
- [ ] `app/components/games/registry.ts` existe, exporta `GameProps`/`GameHandle`/`GAME_ENGINES` con `asteroids` y `tetris`
- [ ] `Asteroids.tsx` usa los tipos de `registry.ts`, sigue funcionando igual que antes del refactor
- [ ] `app/games/[id]/play/page.tsx`, `app/games/[id]/page.tsx`, `app/salon/page.tsx` ya no tienen el literal `"asteroids"` hardcodeado, usan `GAME_ENGINES`
- [ ] `app/components/games/tetris-engine.ts` exporta `createTetrisGame(board, nextCanvas, hooks)` con lógica de piezas/colisión/puntuación idéntica al `game.js` de referencia
- [ ] `Tetris.tsx` monta ambos canvas (300×600 y 120×120) y limpia el motor al desmontar
- [ ] En `/games/tetris/play`, mover con flechas, rotar con ↑/X, soft drop con ↓, hard drop con espacio funciona
- [ ] Canvas "next" muestra la siguiente pieza correctamente
- [ ] HUD canvas original (grid, tablero, ghost piece) se sigue viendo
- [ ] HUD React externo refleja score/líneas/nivel en tiempo real, con etiqueta "LÍNEAS" en vez de "VIDAS" para este juego
- [ ] Botón "PAUSA" congela el juego (piezas dejan de caer) sin ocultar el tablero
- [ ] Botón "FIN" fuerza game over y abre el modal de guardar puntaje
- [ ] Que una pieza nueva colisione al aparecer dispara `onGameOver`, abre el modal con el puntaje final correcto
- [ ] Guardar puntaje desde el modal inserta en Supabase con `game: "tetris"`
- [ ] `/games/tetris` (detalle) y `/salon` tab TETRIS muestran leaderboard real desde Supabase
- [ ] Asteroids sigue funcionando exactamente igual tras el refactor del registro
- [ ] Otros juegos mock (`serpentina`, `gloton`, etc.) siguen sin cambios de comportamiento
- [ ] App compila sin errores TypeScript (`tsc --noEmit`)

## Decisions taken and discarded

| Decisión                      | Elegida                                                                   | Descartada                                            | Razón                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Lógica del juego              | Copiar `game.js` casi intacto, envuelto en función                        | Reescribir en componentes/hooks React                 | Mismo criterio que asteroids: motor ya probado, cero recreación                                                                     |
| Id/título del juego           | Renombrar `caida`→`tetris`, `CAÍDA`→`TETRIS`, reusar resto                | Crear entrada nueva separada                          | `caida` ya tiene metadata de tetris (PUZZLE, cover-tetro, magenta); mismo patrón que rocas→asteroids                                |
| Stats iniciales               | Reusar `best: 184220`, `plays: "31.8K"` de `caida`                        | Resetear a placeholder                                | Usuario confirmó reusar, igual que asteroids mantuvo sus stats al renombrar                                                         |
| Registro genérico             | Introducir `registry.ts`/`GAME_ENGINES` en este spec                      | Mantener `id === "asteroids"` hardcodeado un poco más | Es el primer juego tras asteroids con este skill; documentado como refactor one-time en Fase 4                                      |
| Nombre del hook de progreso   | `onLinesChange` en el motor, mapeado desde `onLivesChange` de `GameProps` | Añadir campo nuevo `onLinesChange` al tipo genérico   | `GameProps` es compartido por todos los juegos; mapear internamente evita bifurcar el tipo genérico por cada variante de "contador" |
| Pausa                         | Patrón estándar: `update()` frena, `draw()` sigue corriendo               | Mantener comportamiento original (cancela rAF)        | Usuario confirmó adaptar a patrón estándar del vault, consistente con asteroids                                                     |
| Canvas "next"                 | Dos `<canvas>` en `Tetris.tsx`, ambos pasados al engine                   | Un solo canvas, next dibujado en React                | Usuario confirmó mantener patrón "copiar casi intacto"; rehacer `drawNext()` en React es trabajo extra fuera de scope               |
| Theme toggle del original     | Descartado completo                                                       | Portar el toggle claro/oscuro                         | No aplica al vault, que ya tiene su propio tema visual                                                                              |
| `--grid-line` de `drawGrid()` | Color fijo dentro del engine                                              | Leer `getComputedStyle(document.body)`                | El canvas ya no depende de clases de tema en `body`; evita acoplar el engine al DOM del original                                    |
| Restart button DOM            | Descartado, restart vía flujo React (modal game over) existente           | Portar el botón DOM del original                      | Duplicaría el flujo de restart que asteroids ya resolvió con el modal React                                                         |

## Identified risks

- **React Strict Mode (dev) monta/desmonta efectos dos veces** — riesgo de dos loops `requestAnimationFrame` o listeners duplicados. Mitigación: `destroy()` debe cancelar rAF y remover listeners de forma idempotente (mismo riesgo ya mitigado en asteroids).
- **Refactor de `registry.ts` toca 3 páginas ya funcionando** — riesgo de romper asteroids al generalizar el literal hardcodeado. Mitigación: paso 3 del plan verifica explícitamente que asteroids sigue funcionando igual antes de continuar con tetris.
- **Segundo canvas ("next")** — más superficie de mount/unmount que asteroids (que solo tiene uno); riesgo de fuga si `destroy()` no limpia referencias a ambos. Mitigación: `destroy()` cubre ambos canvas explícitamente.
- **Etiqueta "LÍNEAS" vs "VIDAS" en HUD compartido** — al reutilizar el mismo state (`lives`) para representar líneas en tetris, un futuro juego con semántica distinta podría necesitar un tercer nombre. Mitigación: fuera de scope resolverlo genéricamente ahora; documentado como deuda si aparece un tercer caso.
