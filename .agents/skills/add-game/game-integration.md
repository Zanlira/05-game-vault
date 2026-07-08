# Conocimiento del patrón: integrar un juego canvas al Arcade Vault

Referencia que consulta el skill `add-game` al generar un spec. Documenta el patrón real usado para integrar `asteroids` (specs `05-asteroids-game.md` y `06-leaderboard-supabase.md`) y cómo generalizarlo para el próximo juego. **No es texto para copiar literal en el spec** — es la forma que el spec generado debe respetar, con los datos concretos del juego que se está integrando.

---

## Los 5 artefactos de una integración real

Todo juego jugable (no mock) requiere:

1. **Entrada en `app/data/games.ts`** — objeto `Game` con `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`.
2. **`app/components/games/<Name>-engine.ts`** — el `game.js` original envuelto, sin reescribir su física/lógica, expone `create<Name>Game(canvas, hooks): <Name>Controls`.
3. **`app/components/games/<Name>.tsx`** — wrapper React `forwardRef` que monta el canvas y conecta el engine a props/hooks.
4. **Registro en `GAME_ENGINES`** (ver "Registro genérico" abajo) — conecta el `id` al componente, sin tocar páginas.
5. **Leaderboard Supabase** — el juego usa `getTopScores(id, N)` / `insertScore({ game: id, ... })` de `lib/supabase/scores.ts` (ya genérico, no requiere cambios en esa capa).

---

## Registro genérico (`GAME_ENGINES`)

Antes de este refactor, 4 archivos tenían el literal `id === "asteroids"` hardcodeado. El primer juego integrado con este skill después de asteroids debe introducir:

**`app/components/games/registry.ts`** (archivo nuevo):

```ts
import type { ComponentType, RefAttributes } from "react";

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
  // <nuevo-id>: <NuevoComponente>,
};
```

Cambios en los 3 archivos de páginas (reemplazan el `isAsteroids`):

- `app/games/[id]/play/page.tsx`:
  - `const Engine = GAME_ENGINES[id];` reemplaza `const isAsteroids = id === "asteroids"`.
  - Render condicional: `Engine ? <Engine ref={gameRef} paused={paused} onScoreChange={setScore} ... /> : <div className="game-arena">...mock...</div>`.
  - `insertScore({ game: id, playerName: name, score })` — `id` dinámico en vez del literal `"asteroids"`.
  - El bloque `setInterval` mock y el fake level-up quedan condicionados a `!Engine` (antes `!isAsteroids`).
- `app/games/[id]/page.tsx`: `const hasEngine = id in GAME_ENGINES;` reemplaza `isAsteroids`; `getTopScores(id, 10)` dinámico; loading/empty states gateados por `hasEngine`.
- `app/salon/page.tsx`: mismo patrón, `hasEngine = tab in GAME_ENGINES`; `getTopScores(tab, 12)`; el bloque "TU MEJOR MARCA" se oculta si `hasEngine` y no hay suficientes filas reales (igual regla que hoy con asteroids).

`Asteroids.tsx` pasa a tipar sus props/handle importando `GameProps`/`GameHandle` de `registry.ts` en vez de definir sus propios tipos `AsteroidsProps`/`AsteroidsHandle` duplicados.

Si `registry.ts` ya existe cuando se genera un spec nuevo, el spec **omite** este bloque completo y solo añade la entrada correspondiente al nuevo juego en `GAME_ENGINES`.

---

## Checklist de adaptación por-juego (usar en la Fase 3 del skill)

Los 3 juegos de referencia (`references/started-games/02-asteroids`, `03-tetris`, `04-arkanoid`) comparten un esqueleto (loop `requestAnimationFrame`, `ctx` de canvas, estado mutable a nivel de módulo, `score`/nivel/game-over), pero difieren en puntos que rompen una adaptación genérica si no se detectan:

| Punto             | Asteroids (ya integrado)                                  | Tetris                                                                                 | Arkanoid                                                                                                      |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Canvas            | 1, `getElementById('canvas')`, `W=800,H=600` hardcoded    | 2 (`board` + `next-canvas`), tamaño derivado de `COLS/ROWS/BLOCK`                      | 1, `getElementById('game')`, lee `canvas.width/height` en runtime (pero 1 constante hardcodea 800)            |
| Input             | `window`, `e.code`, held-keys + `pressed()` edge-detector | `document`, `e.code`, evento discreto (sin polling), + botón DOM restart               | `document` + **mouse en canvas** (`mousemove`/`click` con `getBoundingClientRect`), `e.key`                   |
| Estado            | `state: 'playing'\|'dead'\|'gameover'`                    | `paused` + `gameOver` booleanos, `lines` en vez de `lives`                             | `gameState: 'playing'\|'gameover'\|'win'` + `isPaused`                                                        |
| HUD               | Dibujado en canvas (`drawHUD()`)                          | **DOM** (`textContent` en `scoreEl`/`linesEl`/etc.) — hay que convertir a estado React | Dibujado en canvas                                                                                            |
| Assets            | Ninguno                                                   | Ninguno (usa `localStorage` para tema, `getComputedStyle`)                             | **Spritesheet async** (`loadSpritesheet` gatea el primer frame) + sonidos (`new Audio`) + `levels.js` externo |
| `dt`              | Segundos, cap 0.05                                        | **Milisegundos** + acumulador (`dropAccum >= dropInterval`)                            | Segundos                                                                                                      |
| Game over/restart | `Space` dentro del loop reinicia (`initGame()`)           | Botón DOM → `cancelAnimationFrame` + `init()` (loop se destruye y reconstruye)         | Sin mecanismo de restart cableado                                                                             |

Al analizar un `game.js` nuevo, documentar explícitamente en el spec:

- Cómo se resuelve cada fila de la tabla para ESE juego (no asumir que se comporta como asteroids).
- Qué transformación concreta requiere cada gotcha detectado (ej.: "HUD en DOM → estos 4 `textContent` se reemplazan por los hooks `onScoreChange`/`onLinesChange`... y el HUD React ya existente los consume").
- Si hay assets externos, dónde se van a copiar (`app/components/games/<name>-assets/`) y cómo se maneja el gate async en el `useEffect` del wrapper (no montar el canvas como "listo" hasta que el asset cargue, o mostrar un estado de carga).

---

## Patrón del engine (`<Name>-engine.ts`)

Copiar el `game.js` de referencia **casi intacto** — nunca reescribir física/spawns/clases. Envolver:

```ts
export type <Name>Hooks = {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void; // o el equivalente del juego (ej. onLinesChange)
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

export type <Name>Controls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

export function create<Name>Game(
  canvas: HTMLCanvasElement,
  hooks: <Name>Hooks
): <Name>Controls;
```

Reglas de la envoltura (idénticas a como se hizo con asteroids):

- Reemplazar `document.getElementById(...)` por el parámetro `canvas`.
- Listeners agregados dentro de `create<Name>Game`, removidos en `destroy()` de forma **idempotente** (cubre React Strict Mode montando/desmontando el efecto dos veces en dev).
- Insertar las llamadas a los hooks en los puntos exactos donde el juego original muta `score`/`lives`(o equivalente)/`level`.
- Insertar `hooks.onGameOver(score)` en el punto donde el juego transiciona a su estado de "game over".
- `pause()`/`resume()` vía bandera `isPaused`: `update()` retorna temprano si está pausado (excepto lectura de input para no perder eventos), `draw()` sigue corriendo siempre — mantiene el HUD-canvas visible durante la pausa.
- `forceGameOver()` fuerza la misma ruta de transición a game over que usa la muerte/derrota normal del juego.
- El único `requestAnimationFrame` inicial se vuelve cancelable — `destroy()` llama `cancelAnimationFrame`.
- Si el juego original tiene assets async (spritesheet/sonidos), el gate de carga vive dentro de `create<Name>Game` y `destroy()` también debe poder cancelar una carga en curso.

## Patrón del wrapper (`<Name>.tsx`)

```tsx
"use client";
const <Name> = forwardRef<GameHandle, GameProps>(function <Name>(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<<Name>Controls | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    controlsRef.current = create<Name>Game(canvasRef.current, { ...hooks de props... });
    return () => controlsRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (props.paused) controlsRef.current?.pause();
    else controlsRef.current?.resume();
  }, [props.paused]);

  useImperativeHandle(ref, () => ({
    forceGameOver: () => controlsRef.current?.forceGameOver(),
  }));

  return <canvas ref={canvasRef} width={W} height={H} />;
});
export default <Name>;
```

Tipos `GameProps`/`GameHandle` importados de `app/components/games/registry.ts` (no redefinir tipos propios por componente, salvo que el juego tenga un hook adicional real — ej. `onLinesChange` en vez de `onLivesChange` — en cuyo caso se documenta como extensión explícita en el spec).

---

## Esqueleto de spec

El spec generado sigue exactamente `.agents/skills/spec/template.md`. Guía de contenido específico de esta familia de specs:

**Header** — `Depends on: 04-supabase-setup` (+ `05-asteroids-game` o el spec del refactor de registro si aplica). `Objective` en una frase: "Adaptar `references/started-games/<carpeta>/game.js` a un componente React canvas montado en `/games/<id>/play`, con leaderboard real en Supabase."

**Scope (In)** — típicamente:

- Entrada en `games.ts` con la metadata confirmada en Fase 2.
- `<Name>-engine.ts` con la adaptación mínima (listar los gotchas concretos detectados en Fase 3).
- `<Name>.tsx` wrapper.
- (Si aplica) refactor de `registry.ts` + generalización de las 3 páginas — o, si ya existe, solo la línea nueva en `GAME_ENGINES`.
- Leaderboard: `getTopScores(id, N)` en `[id]/page.tsx` y `salon/page.tsx`, `insertScore({ game: id, ... })` en `play/page.tsx`.

**Scope (Out)** — seguir el patrón de `05-asteroids-game.md`: controles táctiles/mobile fuera de scope salvo que el juego original ya los tenga, sonido si el original no lo tenía (o nota explícita si sí y se porta), otros juegos de `references/` fuera de este spec.

**Data model** — los tipos `<Name>Hooks`/`<Name>Controls`/`GameProps` extendidos si aplica; la fila de `games.ts`; no hay cambios al esquema SQL de `scores` (ya existe, ver `06-leaderboard-supabase.md`).

**Implementation plan** — pasos numerados, cada uno deja el sistema funcional. Orden sugerido (ajustar a los gotchas reales del juego):

1. Entrada en `games.ts` (+ clase CSS `cover-*` si es nueva).
2. (Solo si aplica) Refactor `registry.ts` + generalizar las 3 páginas, con asteroids como único juego en `GAME_ENGINES` — verificar que asteroids sigue funcionando igual tras el refactor.
3. Copiar y envolver el engine (`<Name>-engine.ts`), insertando los hooks en los puntos detectados en Fase 3.
4. Crear `<Name>.tsx`.
5. Registrar `<id>: <Name>` en `GAME_ENGINES` (si el refactor ya existía, este es el único paso de integración a páginas).
6. Verificar leaderboard: jugar, guardar puntaje, confirmar fila en Supabase con `game: "<id>"`; confirmar `/games/<id>` y `/salon` tab `<id>` muestran datos reales.

**Acceptance criteria** — calcado del formato de `05-asteroids-game.md`/`06-leaderboard-supabase.md`: mover/disparar funciona, HUD canvas original visible, HUD React sincronizado, pausa congela sin romper render, game over dispara modal, guardar puntaje inserta en Supabase con el `game` correcto, leaderboard lateral y `/salon` muestran top real, otros juegos sin cambio de comportamiento, `tsc --noEmit` limpio.

**Decisions taken and discarded** — documentar al menos: por qué se copia el `game.js` casi intacto (no reescribir), por qué se aplica (o no) el refactor de registro en este spec, cómo se resolvieron los gotchas específicos detectados (HUD DOM→React, assets async, mouse, etc.).

**Risks** — Strict Mode doble-mount, canvas no responsive (mismo riesgo que asteroids), listeners globales colgados si no se limpia bien, y cualquier riesgo específico del juego (ej. carga async de assets fallando, `localStorage` de tema en Tetris colisionando con otro uso del vault).
