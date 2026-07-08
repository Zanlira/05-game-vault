---
spec: 08-arkanoid-game
state: Approved
dependencies: 04-supabase-setup, 07-tetris-game
date: 2026-07-08
objective: Adaptar el juego Arkanoid (references/started-games/04-arkanoid/game.js) a un componente React canvas montado en /games/arkanoid/play, renombrando el id/título del juego de "bloque-buster" a "arkanoid" y conectando leaderboard real en Supabase.
---

## Scope

### In scope

- Renombrar en `app/data/games.ts` el juego `id: "bloque-buster"` → `id: "arkanoid"`, `title: "BLOQUE BUSTER"` → `title: "ARKANOID"` (short/long/cat/cover/color/best/plays se mantienen tal cual — ya describen un breakout)
- Copiar assets binarios de `references/started-games/04-arkanoid/assets/` (`spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`) a `public/games/arkanoid/` (deben ser servidos por URL para `Image`/`Audio`, no pueden vivir como módulo TS en `app/`)
- Crear `app/components/games/arkanoid-assets/spritesheet.ts` adaptando `assets/spritesheet.js`: mismo `loadSpritesheet(cb)`/`drawSprite(ctx, name, x, y, w, h)`/`drawFrame(...)`/`SPRITES`/`EXPLOSION_FRAMES`/`EXPLOSION_DURATION`, apuntando la imagen a `/games/arkanoid/spritesheet-breakout.png` en vez de una ruta relativa `assets/...`
- Copiar `references/started-games/04-arkanoid/levels.js` a `app/components/games/arkanoid-assets/levels.ts` sin cambios de lógica (`LEVELS`: 5 niveles con `blocks[]`/`speed`)
- Copiar `references/started-games/04-arkanoid/game.js` a `app/components/games/arkanoid-engine.ts`, adaptado con la MÍNIMA envoltura necesaria: recibir `canvas` como parámetro (en vez de `getElementById('game')`), exponer `createArkanoidGame(canvas, hooks): ArkanoidControls`. Física de pelota/paddle, colisiones AABB, `loadLevel`, animación de explosiones, overlay de pausa con selector de nivel se mantienen intactos, sin reescritura
- Hooks `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)`, `onGameOver(finalScore)` insertados en los puntos donde el motor ya muta `score` (colisión con bloque), `lives` (pelota perdida), `currentLevel` (`loadLevel()`, incluye el salto manual vía click en el overlay de pausa), y donde `gameState` transiciona a `'gameover'` **o** a `'win'` (completar los 5 niveles también dispara `onGameOver(score)` — mismo flujo de guardar puntaje que perder)
- Sonido: portar `bounceSound`/`breakSound` (`new Audio(...)`) apuntando a `/games/arkanoid/sounds/ball-bounce.mp3` y `/games/arkanoid/sounds/break-sound.mp3`, mismo patrón `cloneNode().play()` del original para permitir solapamiento
- Nuevo componente `app/components/games/Arkanoid.tsx` — client component `forwardRef<GameHandle, GameProps>` que monta un único `<canvas width={800} height={600}>`, instancia `createArkanoidGame(canvasRef.current, hooks)` en un `useEffect` gateado por `loadSpritesheet` (no se considera "montado" hasta que el spritesheet cargue), limpia con `destroy()` al desmontar
- `pause()`/`resume()` vía bandera `isPaused` controlada 100% por el prop `paused` (patrón estándar del vault): `update()` retorna temprano si `isPaused`, `draw()` sigue corriendo siempre (incluye el overlay de pausa con selector de nivel, que ya existe dibujado en canvas)
- Descartar del engine el toggle interno de pausa por teclado (`p`/`P`/`Escape` dentro de `keydown`) — la pausa pasa a ser controlada solo por el prop React, igual que tetris/asteroids
- Mantener el listener `click` de selección de nivel sobre el canvas: sigue activo cuando `isPaused` es `true` (sin importar si la pausa vino del botón React), llama `loadLevel(i + 1)` y pone `isPaused = false` internamente — el componente sincroniza esto emitiendo `onLevelChange` y dejando que el próximo ciclo de `paused` desde React se ajuste solo (el botón "PAUSA" de React queda inconsistente un frame hasta que el usuario lo vuelva a togglear; documentado como riesgo aceptado, igual criterio "copiar casi intacto")
- Mantener el listener `mousemove` sobre el canvas para mover el paddle (con `getBoundingClientRect` + escalado, ya presente en el original) — funciona incluso en pausa, igual que hoy
- `forceGameOver()` fuerza la misma ruta que usa la pelota perdida cuando `lives` llega a 0 (llama directo a la transición `gameState = 'gameover'`)
- Registrar `arkanoid: Arkanoid` en `app/components/games/registry.ts` (`GAME_ENGINES`) — `registry.ts` ya existe desde `07-tetris-game`, este spec solo agrega la entrada, sin tocar las 3 páginas ya generalizadas
- Controles: teclado (flechas para paddle, alternativa al mouse) + mouse (mover paddle, click en overlay de pausa para saltar nivel)
- Leaderboard real: `getTopScores("arkanoid", 10)` en `[id]/page.tsx`, `getTopScores("arkanoid", 12)` en `salon/page.tsx`, `insertScore({ game: "arkanoid", ... })` en `play/page.tsx` — automático vía `GAME_ENGINES`, sin lógica adicional específica

### Not in scope

- Controles táctiles/mobile
- Cambios a la lógica de juego original (física de rebote, patrones de niveles, velocidad por nivel, puntuación) — se copia tal cual
- Cap de `dt` (el original no lo tiene, a diferencia de asteroids) — se mantiene sin cap; riesgo documentado, no se agrega
- Theme claro/oscuro — el original no lo tiene
- Adaptar otros juegos de `references/` — spec separado
- Resolver el frame de desincronización del botón "PAUSA" de React tras un salto de nivel vía click (ver nota en scope) — aceptado como comportamiento conocido, no se resuelve con estado adicional en este spec

## Data model

No introduce estructuras persistentes nuevas. Cambios son de tipos/forma de función existentes:

- `app/data/games.ts` — entrada existente muta valores (`id`, `title`), tipo `Game` no cambia
- `app/components/games/registry.ts` — solo se agrega la línea `arkanoid: Arkanoid` a `GAME_ENGINES`, tipos `GameProps`/`GameHandle` sin cambios (arkanoid calza directo con `onLivesChange`, no necesita mapeo de nombre como tetris)
- `arkanoid-engine.ts` — tipos nuevos, solo en memoria:

```ts
type ArkanoidHooks = {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

type ArkanoidControls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

function createArkanoidGame(
  canvas: HTMLCanvasElement,
  hooks: ArkanoidHooks
): ArkanoidControls;
```

- `Arkanoid.tsx` — implementa `GameProps`/`GameHandle` de `registry.ts` directamente, sin mapeo de nombres
- El registro guardado en Supabase (`scores`) no cambia forma, solo `game` pasará a valer `"arkanoid"`

## Implementation plan

1. **Renombrar juego en `games.ts`** — cambiar `id: "bloque-buster"` → `id: "arkanoid"`, `title: "BLOQUE BUSTER"` → `title: "ARKANOID"` en `app/data/games.ts`. App sigue compilando, ruta `/games/arkanoid` navegable.

2. **Copiar assets binarios** — `spritesheet-breakout.png`, `ball-bounce.mp3`, `break-sound.mp3` a `public/games/arkanoid/`. Verificar que las URLs `/games/arkanoid/*` resuelven en dev (`next dev`).

3. **Adaptar helpers de assets** — crear `app/components/games/arkanoid-assets/spritesheet.ts` (desde `assets/spritesheet.js`, imagen apuntando a `/games/arkanoid/spritesheet-breakout.png`) y `app/components/games/arkanoid-assets/levels.ts` (desde `levels.js`, sin cambios de lógica). Verificar: ambos módulos exportan lo mismo que los originales (`loadSpritesheet`, `drawSprite`, `drawFrame`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, `LEVELS`).

4. **Copiar y envolver el engine** — crear `app/components/games/arkanoid-engine.ts` desde `references/started-games/04-arkanoid/game.js`:
   - `createArkanoidGame(canvas, hooks)` reemplaza `getElementById('game')`
   - Sonidos apuntan a `/games/arkanoid/sounds/*.mp3`
   - Listeners de `click`/`mousemove`/`keydown`/`keyup` agregados dentro de la función, removidos en `destroy()` de forma idempotente
   - Insertar hooks en colisión de bloque (`onScoreChange`), pelota perdida (`onLivesChange`), `loadLevel()` (`onLevelChange`), transición a `'gameover'` **y** a `'win'` (ambas llaman `onGameOver(score)`)
   - Eliminar el toggle de pausa por tecla `p`/`P`/`Escape` — pausa 100% vía `pause()`/`resume()` externos
   - Mantener click de selección de nivel activo durante pausa
   - `pause()`/`resume()` vía `isPaused`; `draw()` sigue llamándose siempre (incluye overlay de pausa)
   - `forceGameOver()` fuerza `gameState = 'gameover'` directamente
   - `requestAnimationFrame` cancelable, `destroy()` llama `cancelAnimationFrame` y cancela una carga de spritesheet en curso si aplica
   - Verificar: `tsc --noEmit` pasa, sin referencias a `document`/`window` fuera de los listeners del engine

5. **Crear `Arkanoid.tsx`** — `app/components/games/Arkanoid.tsx`, `forwardRef<GameHandle, GameProps>`:
   - Renderiza `<canvas width={800} height={600} ref={canvasRef} />`
   - `useEffect` monta `createArkanoidGame` tras `loadSpritesheet` resolver, limpia con `destroy()`
   - `useEffect` separado observa `paused` → `pause()`/`resume()`
   - `useImperativeHandle` expone `forceGameOver`
   - Verificar: componente monta sin errores, canvas responde a flechas/mouse/click de nivel en uso aislado

6. **Registrar en `GAME_ENGINES`** — agregar `arkanoid: Arkanoid` en `registry.ts`.

7. **Verificar leaderboard** — jugar Arkanoid en `/games/arkanoid/play`, romper bloques, perder 3 vidas (o completar los 5 niveles), guardar puntaje, confirmar fila en Supabase con `game: "arkanoid"`; confirmar `/games/arkanoid` y `/salon` tab `arkanoid` muestran top real.

## Acceptance criteria

- [ ] `app/data/games.ts` tiene `id: "arkanoid"`, `title: "ARKANOID"` (ya no existe `id: "bloque-buster"`)
- [ ] Assets binarios servidos desde `public/games/arkanoid/` (imagen y ambos mp3 cargan sin 404)
- [ ] `app/components/games/arkanoid-engine.ts` exporta `createArkanoidGame(canvas, hooks)` con física/colisiones/niveles idénticos al `game.js` de referencia
- [ ] `Arkanoid.tsx` monta el canvas 800×600 y limpia el motor al desmontar
- [ ] En `/games/arkanoid/play`, mover paddle con flechas y con mouse funciona
- [ ] Rebote de pelota y destrucción de bloques con animación de explosión funciona igual que el original
- [ ] Sonidos de rebote y rotura se escuchan
- [ ] HUD canvas original (score, nivel, vidas como sprites de pelota) se sigue viendo
- [ ] HUD React externo refleja score/vidas/nivel en tiempo real
- [ ] Botón "PAUSA" congela el juego (pelota/paddle se detienen) y muestra el overlay con selector de nivel
- [ ] Click en un botón de nivel dentro del overlay de pausa salta a ese nivel y reanuda
- [ ] Botón "FIN" fuerza game over y abre el modal de guardar puntaje
- [ ] Perder las 3 vidas dispara `onGameOver`, abre el modal con el puntaje final correcto
- [ ] Completar los 5 niveles (estado "win") también dispara `onGameOver` y abre el modal
- [ ] Guardar puntaje desde el modal inserta en Supabase con `game: "arkanoid"`
- [ ] `/games/arkanoid` (detalle) y `/salon` tab ARKANOID muestran leaderboard real desde Supabase
- [ ] Asteroids y Tetris siguen funcionando exactamente igual (sin cambios en `registry.ts` fuera de la línea nueva)
- [ ] Otros juegos mock (`serpentina`, `gloton`, etc.) siguen sin cambios de comportamiento
- [ ] App compila sin errores TypeScript (`tsc --noEmit`)

## Decisions taken and discarded

| Decisión                             | Elegida                                                                        | Descartada                                        | Razón                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lógica del juego                     | Copiar `game.js` casi intacto, envuelto en función                             | Reescribir en componentes/hooks React             | Mismo criterio que asteroids/tetris: motor ya probado, cero recreación                                                                                                       |
| Id/título del juego                  | Renombrar `bloque-buster`→`arkanoid`, `BLOQUE BUSTER`→`ARKANOID`, reusar resto | Crear entrada nueva separada                      | `bloque-buster` ya tiene metadata de un breakout (ARCADE, cover-bricks, cyan); mismo patrón que rocas→asteroids y caida→tetris                                               |
| Ubicación de assets binarios         | `public/games/arkanoid/` (PNG + mp3)                                           | `app/components/games/arkanoid-assets/` para todo | Next.js necesita una URL servible para `Image`/`Audio`; el código wrapper (`spritesheet.ts`/`levels.ts`) sí vive en `app/components/games/arkanoid-assets/`, los binarios no |
| Registro genérico                    | Solo agregar `arkanoid: Arkanoid` a `GAME_ENGINES`                             | Reintroducir refactor de páginas                  | `registry.ts` y la generalización de las 3 páginas ya existen desde `07-tetris-game`                                                                                         |
| Sonido                               | Portar `bounceSound`/`breakSound` con `cloneNode().play()`                     | Descartar sonido                                  | El original de Arkanoid sí tiene sonido (a diferencia de tetris/asteroids); se mantiene como feature real del juego                                                          |
| Estado "win"                         | Dispara `onGameOver(score)` igual que perder                                   | Dejar "win" solo visual sin guardar puntaje       | Completar el juego debe permitir guardar el puntaje final por el mismo flujo que game over, sin bifurcar el modal                                                            |
| Pausa por tecla (P/Escape)           | Eliminada del engine                                                           | Mantener control dual (React + tecla)             | Patrón estándar del vault: pausa 100% controlada por el prop `paused`, igual que asteroids/tetris                                                                            |
| Click de selección de nivel en pausa | Se mantiene activo                                                             | Eliminar el overlay de selector de nivel          | Es una feature real del juego original (specs 01–03 de arkanoid); se preserva copiando casi intacto                                                                          |
| `dt` sin cap                         | Se mantiene igual al original                                                  | Agregar cap como en asteroids                     | El original nunca tuvo cap; agregarlo sería reescribir comportamiento no solicitado                                                                                          |

## Identified risks

- **React Strict Mode (dev) monta/desmonta efectos dos veces** — riesgo de dos loops `requestAnimationFrame` o listeners duplicados (click/mousemove/keydown/keyup). Mitigación: `destroy()` debe cancelar rAF y remover los 4 listeners de forma idempotente.
- **Carga async del spritesheet** — si `loadSpritesheet` falla o tarda, el primer frame no debe dibujarse con la imagen a medias. Mitigación: gate del `useEffect` en `Arkanoid.tsx` espera el callback antes de considerar el juego "listo"; `destroy()` debe poder cancelar una carga en curso si el componente se desmonta antes.
- **Botón "PAUSA" de React puede quedar desincronizado un frame tras un salto de nivel por click** — el click en el overlay pone `isPaused = false` dentro del engine sin que React lo sepa hasta el próximo toggle. Mitigación: aceptado como riesgo conocido (ver Not in scope); no se resuelve con estado compartido adicional en este spec.
- **`dt` sin cap** — si la pestaña pierde foco y vuelve, un `dt` grande puede teletransportar la pelota a través de bloques/paredes en un solo frame. Mitigación: ninguna en este spec (comportamiento heredado del original); candidato a spec futuro si se reporta como bug real.
- **Assets binarios servidos desde `public/`** — a diferencia de otros juegos ya integrados (sin assets), un despliegue que no copie `public/games/arkanoid/` correctamente rompe silenciosamente sprites/sonido. Mitigación: paso 2 del plan verifica explícitamente que las URLs resuelven antes de continuar.
