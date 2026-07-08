# SPEC 09 — Juego Snake

> **Status:** Implemented · **Depends on:** SPEC 04 (supabase-setup), SPEC 07 (tetris-game, introduce `registry.ts`) · **Date:** 2026-07-08
> **Objective:** Construir desde cero un juego Snake en canvas (sin `game.js` de referencia, no existe en `references/started-games/`) montado en `/games/snake/play`, renombrando la entrada mock `id: "serpentina"` → `id: "snake"` y conectando leaderboard real en Supabase.

## Por qué este spec existe

A diferencia de asteroids/tetris/arkanoid, no hay un `game.js` de referencia que copiar casi intacto — este spec **diseña la lógica del juego desde cero** (grid, movimiento, colisión, spawn de fruta) siguiendo el mismo contrato de wrapper (`create<Name>Game(canvas, hooks)` → `<Name>Controls`) que ya usan los otros motores, para que `registry.ts` no necesite cambios estructurales.

## Scope

**In:**

- Renombrar en `app/data/games.ts` la entrada mock `id: "serpentina"` → `id: "snake"`, `title: "SERPENTINA"` → `title: "SNAKE"` (short/long/cat/cover/color se mantienen: ya describen el juego correcto — `cover-snake` ya existe en `globals.css`)
- Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` (servido por URL, igual que el spritesheet de arkanoid)
- Crear `app/components/games/snake-assets/sprites.ts` adaptando `references/source-assets/snake-assets/sprites.js`: exporta un subconjunto de 4 frutas (`apple`, `cherry`, `strawberry`, `watermelon`) con sus coordenadas `{x,y,w,h}` dentro de `fruits.png`, más `loadSpritesheet(cb)` y `drawFruit(ctx, name, dx, dy, size)` que recortan del atlas
- Crear `app/components/games/snake-engine.ts` — lógica de Snake diseñada desde cero: grid de 20×20 celdas de 30px (canvas 600×600), movimiento por pasos de grid con acumulador en milisegundos (no física por frame), serpiente crece al comer fruta, game over al chocar contra pared o contra su propio cuerpo. Expone `createSnakeGame(canvas, hooks): SnakeControls`
- Hooks `onScoreChange(score)` (+10 por fruta), `onLivesChange(lives)` (`1` en juego, `0` al game over — Snake es de una sola vida), `onLevelChange(level)` (sube 1 cada 5 frutas comidas, reduce `moveInterval` en 8ms con piso de 60ms), `onGameOver(finalScore)` (al chocar)
- Fruta: al comerse, respawnea en celda vacía aleatoria con nombre aleatorio del subconjunto de 4
- HUD dibujado en canvas (grid, serpiente, fruta, score) — coexiste con el HUD React externo (`player-hud`) que ya consume los hooks
- Controles: solo teclado (flechas), listener sobre `document`, cola de dirección de un paso para evitar giro de 180° instantáneo (chocar contra el segmento inmediatamente detrás)
- `pause()`/`resume()` 100% controlados por el prop `paused` (patrón de tetris/arkanoid): `update()` retorna temprano si `isPaused`, `draw()` sigue corriendo siempre
- Reinicio interno: en estado `gameover`, tecla `Space` reinicia la partida (serpiente/fruta/score/nivel) y re-emite `onScoreChange(0)`, `onLivesChange(1)`, `onLevelChange(1)` — mismo patrón que asteroids
- `forceGameOver()` fuerza la transición a `gameover` (misma ruta que la colisión)
- Nuevo componente `app/components/games/Snake.tsx` — `forwardRef<GameHandle, GameProps>`, monta `<canvas width={600} height={600}>`, instancia `createSnakeGame` tras `loadSpritesheet` resolver, limpia con `destroy()`
- Registrar `snake: Snake` en `app/components/games/registry.ts` (`registry.ts` ya existe desde `07-tetris-game`) — solo se agrega la entrada, sin tocar las 3 páginas ya generalizadas
- Leaderboard real: `getTopScores("snake", 10)` en `[id]/page.tsx`, `getTopScores("snake", 12)` en `salon/page.tsx`, `insertScore({ game: "snake", ... })` en `play/page.tsx` — automático vía `GAME_ENGINES`, sin lógica adicional

**Out of scope (para specs futuros):**

- Wrap-around en los bordes (se descarta explícito: chocar con pared es game over, comportamiento clásico)
- Sonido — no hay original que portar, se omite
- Controles táctiles/mobile
- Las 18 frutas restantes del atlas (`banana`, `orange`, `grape`, etc.) — subconjunto de 4 es suficiente para variedad visual
- Múltiples vidas o power-ups
- Adaptar otros juegos de `references/` — spec separado

## Data model

No introduce estructuras persistentes nuevas. Cambios de tipos/forma de función existentes:

- `app/data/games.ts` — entrada existente muta `id`/`title`, tipo `Game` no cambia
- `app/components/games/registry.ts` — se agrega la línea `snake: Snake` a `GAME_ENGINES`, tipos `GameProps`/`GameHandle` sin cambios (Snake calza directo, sin mapeo de nombres)
- `snake-engine.ts` — tipos nuevos, solo en memoria:

```ts
type SnakeHooks = {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

type SnakeControls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

function createSnakeGame(
  canvas: HTMLCanvasElement,
  hooks: SnakeHooks
): SnakeControls;
```

```ts
// snake-assets/sprites.ts
type FruitName = "apple" | "cherry" | "strawberry" | "watermelon";
const FRUITS: Record<FruitName, { x: number; y: number; w: number; h: number }>;
function loadSpritesheet(cb: () => void): void;
function drawFruit(
  ctx: CanvasRenderingContext2D,
  name: FruitName,
  dx: number,
  dy: number,
  size: number
): void;
```

- `Snake.tsx` — implementa `GameProps`/`GameHandle` de `registry.ts` directamente
- El registro en Supabase (`scores`) no cambia forma, solo `game` pasará a valer `"snake"`

## Implementation plan

1. **Renombrar juego en `games.ts`** — `id: "serpentina"` → `id: "snake"`, `title: "SERPENTINA"` → `title: "SNAKE"`. App sigue compilando, `/games/snake` navegable (mock de play sigue corriendo con el nuevo id hasta el paso 6).

2. **Copiar asset binario** — `fruits.png` a `public/games/snake/fruits.png`. Verificar que `/games/snake/fruits.png` resuelve en `next dev`.

3. **Crear `snake-assets/sprites.ts`** — adaptar `sprites.js`, subconjunto de 4 frutas, `loadSpritesheet`/`drawFruit` apuntando a `/games/snake/fruits.png`. Verificar: módulo exporta lo esperado, imagen carga sin error de CORS/404.

4. **Crear `snake-engine.ts`** — diseñar desde cero:
   - Grid 20×20 celdas de 30px, `canvas` 600×600 recibido por parámetro
   - Estado: `snake: {x,y}[]`, `direction`/`nextDirection`, `fruit: {x,y,name}`, `score`, `level`, `moveInterval` (ms), `moveAccum`, `gameState: 'playing' | 'gameover'`, `isPaused`
   - `update(dt)`: acumula `dt` en ms; si `moveAccum >= moveInterval`, aplica `nextDirection`, mueve cabeza, detecta colisión pared/cuerpo (→ `gameover` + `hooks.onGameOver(score)` + `hooks.onLivesChange(0)`), detecta comer fruta (crece, `score += 10`, `hooks.onScoreChange(score)`, cada 5 frutas `level++` + `hooks.onLevelChange(level)` + `moveInterval = max(60, moveInterval - 8)`, respawnea fruta en celda vacía aleatoria)
   - `draw()`: pinta grid de fondo, serpiente (rectángulos), fruta (`drawFruit`), score en esquina — siempre corre, incluso en pausa/gameover
   - Listener `keydown` sobre `document`: flechas actualizan `nextDirection` (bloqueando reversa de 180°); en `gameover`, `Space` reinicia estado y re-emite hooks con valores iniciales
   - `pause()`/`resume()` togglean `isPaused`; `update()` retorna temprano si `isPaused`
   - `forceGameOver()` fuerza la misma transición que la colisión
   - `destroy()` cancela `requestAnimationFrame` y remueve el listener de forma idempotente
   - Verificar: `tsc --noEmit` pasa, sin referencias a `document`/`window` fuera del listener propio del engine

5. **Crear `Snake.tsx`** — `forwardRef<GameHandle, GameProps>`, canvas 600×600, monta `createSnakeGame` tras `loadSpritesheet` resolver, limpia con `destroy()`, `useImperativeHandle` expone `forceGameOver`. Verificar: componente monta sin errores, canvas responde a flechas en uso aislado.

6. **Registrar en `GAME_ENGINES`** — agregar `snake: Snake` en `registry.ts`.

7. **Verificar leaderboard** — jugar `/games/snake/play`, comer frutas, chocar, guardar puntaje, confirmar fila en Supabase con `game: "snake"`; confirmar `/games/snake` y `/salon` tab `snake` muestran top real.

## Acceptance criteria

- [ ] `app/data/games.ts` tiene `id: "snake"`, `title: "SNAKE"` (ya no existe `id: "serpentina"`)
- [ ] Asset `public/games/snake/fruits.png` carga sin 404
- [ ] `snake-engine.ts` exporta `createSnakeGame(canvas, hooks)` con grid, movimiento y colisión funcionando
- [ ] `Snake.tsx` monta el canvas 600×600 y limpia el motor al desmontar
- [ ] En `/games/snake/play`, flechas mueven la serpiente sin permitir giro de 180°
- [ ] Comer fruta hace crecer la serpiente y suma 10 puntos
- [ ] Cada 5 frutas comidas sube el nivel y la velocidad aumenta
- [ ] Chocar con pared o con el propio cuerpo dispara game over
- [ ] HUD canvas (score) se sigue viendo; HUD React externo refleja score/vidas/nivel en tiempo real
- [ ] Botón "PAUSA" congela el movimiento sin detener el render
- [ ] Botón "FIN" fuerza game over y abre el modal de guardar puntaje
- [ ] Guardar puntaje inserta en Supabase con `game: "snake"`
- [ ] `/games/snake` (detalle) y `/salon` tab SNAKE muestran leaderboard real desde Supabase
- [ ] Asteroids/Tetris/Arkanoid siguen funcionando igual (sin cambios en `registry.ts` fuera de la línea nueva)
- [ ] Otros juegos mock restantes (`gloton`, `invasores`, etc.) siguen sin cambios de comportamiento
- [ ] App compila sin errores TypeScript (`tsc --noEmit`)

## Decisions taken and discarded

- **Sí:** diseñar la lógica desde cero (no hay `game.js` de referencia para Snake). **No:** buscar/adaptar un Snake externo de terceros — el usuario confirmó que no hay código de referencia, solo el atlas de frutas.
- **Sí:** renombrar `serpentina` → `snake` reusando short/long/cover/color existentes. **No:** crear una entrada nueva separada — mismo patrón que `rocas→asteroids`/`bloque-buster→arkanoid`, evita duplicar el concepto.
- **Sí:** subconjunto de 4 frutas (`apple`, `cherry`, `strawberry`, `watermelon`). **No:** las 22 frutas del atlas — usuario confirmó explícito que un subconjunto simple es suficiente y más fácil de balancear.
- **Sí:** movimiento por grid con acumulador en ms (como tetris). **No:** movimiento por píxel/frame — Snake es inherentemente discreto por celda, un acumulador de intervalo es más simple y fiel al género.
- **Sí:** sin wrap-around, choque con pared = game over. **No:** wrap-around — usuario confirmó explícito el comportamiento clásico.
- **Sí:** una sola vida (`onLivesChange(1)` en juego, `0` en game over). **No:** múltiples vidas — no es un patrón estándar del género Snake, se documenta la desviación del resto de juegos del vault.
- **Sí:** reinicio interno vía `Space` en gameover, re-emitiendo hooks. **No:** dejar el reinicio solo a cargo del botón React "JUGAR DE NUEVO" — ese botón solo resetea el HUD, el motor necesita su propio camino de reinicio (mismo patrón que asteroids).
- **Sí:** registrar solo la línea nueva en `GAME_ENGINES` (`registry.ts` ya existe desde `07-tetris-game`). **No:** reintroducir el refactor de páginas — ya no aplica.

## Identified risks

| Riesgo                                                                            | Mitigación                                                                                                |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| React Strict Mode (dev) monta/desmonta efectos dos veces                          | `destroy()` cancela `requestAnimationFrame` y remueve el listener de teclado de forma idempotente         |
| Carga async de `fruits.png`                                                       | Gate del `useEffect` en `Snake.tsx` espera `loadSpritesheet` antes de considerar el juego "listo"         |
| Lógica de colisión/spawn diseñada desde cero, sin `game.js` de referencia probado | Mantener las reglas simples (grid discreto, colisión AABB por celda) y verificar manualmente en el paso 7 |
| Canvas 600×600 fijo, no responsive                                                | Mismo riesgo aceptado que el resto de juegos del vault; candidato a spec de responsive futuro             |
