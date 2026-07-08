---
spec: 05-asteroids-game
state: Implemented
dependencies: 03-about-contact
date: 2026-07-07
objective: Adaptar el juego Asteroids (references/started-games/02-asteroids/game.js) a un componente React canvas montado en /games/asteroids/play, renombrando el id/título del juego de "rocas" a "asteroids" y reusando el HUD y modal de fin de partida existentes.
---

## Scope

### In scope

- Renombrar en `app/data/games.ts` el juego `id: "rocas"` → `id: "asteroids"`, `title: "ROCAS"` → `title: "ASTEROIDS"` (short/long se mantienen, ajustar solo si mencionan "rocas" textualmente)
- Copiar `references/started-games/02-asteroids/game.js` a `app/components/games/asteroids-engine.ts` con la MÍNIMA adaptación necesaria para que corra como módulo TS dentro de un componente React: recibir el `canvas` por parámetro en vez de `document.getElementById`, exponer una función `createAsteroidsGame(canvas, hooks)` que arranca el loop y devuelve controles (`pause()`, `resume()`, `forceGameOver()`, `destroy()`). Toda la lógica de clases (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`), `update()`, `draw()` y su propio `drawHUD()`/overlay de game over se mantienen intactos, sin reescritura ni recreación
- Nuevo componente `app/components/games/Asteroids.tsx` — client component que monta un `<canvas>` de 800×600, instancia `createAsteroidsGame` en un `useEffect`, y limpia (`destroy()`) al desmontar
- `hooks` que el motor llama en los puntos donde ya muta `score`/`lives`/`level`/`state` (dentro de `update()` y `killShip()`/`nextLevel()`/game over): `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)`, `onGameOver(finalScore)` — el motor sigue dibujando su propio HUD en el canvas igual que el original; estos hooks solo notifican a React para que el HUD externo (`player-hud` en `[id]/play/page.tsx`) también se actualice. Ambos HUD coexisten, ninguno se oculta ni se borra
- Modificar `app/games/[id]/play/page.tsx` para detectar `id === "asteroids"` y renderizar `<Asteroids ... />` en vez del mock (interval de score aleatorio) dentro del mismo `crt-screen`, conectando los hooks a los `setState` del HUD React existente
- `ref` imperativo (`forwardRef`/`useImperativeHandle`) sobre `Asteroids` que expone `forceGameOver()` (delega al `controls.forceGameOver()` del motor) para que el botón "FIN" del HUD dispare el mismo flujo de game over que morir en el juego
- Prop `paused: boolean` en `Asteroids` — al cambiar a `true` llama `controls.pause()` (congela `update(dt)` pero el loop y `draw()` siguen corriendo), al volver a `false` llama `controls.resume()`
- Controles: solo teclado (flechas + espacio), igual que el original — los listeners de `keydown`/`keyup` del motor se agregan/quitan sobre `window` en el mount/unmount del componente
- Cuando el motor llega a `state === 'gameover'`, además de pintar su propio overlay "GAME OVER... ESPACIO PARA REINICIAR" en canvas, dispara `onGameOver(score)` para que el modal React (nombre + guardar en `localStorage` `av_scores`) también aparezca superpuesto — el jugador puede guardar el puntaje desde el modal React o reiniciar con ESPACIO desde el propio juego (motor detecta `pressed('Space')` en gameover y llama `initGame()` de nuevo, lo que dispara `onScoreChange(0)`, etc., re-sincronizando el HUD React)

### Not in scope

- Controles táctiles/mobile — el tag "TÁCTIL" en games.ts queda como está, sin implementar
- Persistencia de score en Supabase — sigue usando `localStorage` como el resto del vault
- Cambios a la lógica de juego original (`PowerUp`, triple-disparo, física, spawns) — se copia tal cual, cero recreación
- Sonido/música — el juego original no lo tiene
- Adaptar otros juegos de `references/started-games/` (Tetris, Arkanoid) — spec separado
- Leaderboard real conectado a `asteroids` — sigue usando `seededScores` mock en `[id]/page.tsx`

## Data model

No introduce estructuras de datos nuevas persistentes. Cambios son de tipos/forma de función existentes:

- `app/data/games.ts` — entrada existente muta valores (`id`, `title`), tipo `Game` no cambia
- `asteroids-engine.ts` — expone tipos nuevos, solo en memoria (no persisten):

```ts
type AsteroidsHooks = {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

type AsteroidsControls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  hooks: AsteroidsHooks
): AsteroidsControls;
```

- `Asteroids.tsx` — props:

```ts
type AsteroidsProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

type AsteroidsHandle = {
  forceGameOver: () => void;
};
```

- El registro guardado en `localStorage` `av_scores` no cambia forma (`{ game, score, name, at }`), solo `game` pasará a valer `"asteroids"` en vez de `"rocas"`

## Implementation plan

1. **Renombrar juego en `games.ts`** — cambiar `id: "rocas"` → `id: "asteroids"` y `title: "ROCAS"` → `title: "ASTEROIDS"` en `app/data/games.ts`. App sigue compilando y navegable (ruta `/games/asteroids` funciona vía `[id]`, mock de play sigue corriendo con el nuevo id).

2. **Copiar el motor a `asteroids-engine.ts`** — crear `app/components/games/asteroids-engine.ts` copiando el contenido de `references/started-games/02-asteroids/game.js`, convertido a TS/módulo:
   - Envolver todo en `createAsteroidsGame(canvas, hooks)`
   - Reemplazar `document.getElementById('canvas')` por el parámetro `canvas`
   - Reemplazar `window.addEventListener` global por listeners agregados dentro de `createAsteroidsGame` y removidos en `destroy()`
   - Insertar llamadas a `hooks.onScoreChange`, `hooks.onLivesChange`, `hooks.onLevelChange` en los puntos donde `score`/`lives`/`level` cambian (dentro de `update()`, `killShip()`, `nextLevel()`, `initGame()`)
   - Insertar `hooks.onGameOver(score)` en el punto donde `state` pasa a `'gameover'`
   - Reemplazar el único `requestAnimationFrame(loop)` inicial por uno que se pueda cancelar (`destroy()` llama `cancelAnimationFrame`)
   - Añadir bandera interna `isPaused`; `pause()`/`resume()` la togglean; `update()` retorna temprano si `isPaused` (excepto lectura de `pressed()` para no perder inputs — draw sigue llamándose siempre)
   - `forceGameOver()` setea `lives = 0` y llama la misma ruta que `killShip()` usa para transicionar a `'gameover'`
   - Nada de la lógica de física/spawns/clases se reescribe, solo se envuelve
   - Verificar: build de TS pasa (`tsc --noEmit`), no quedan referencias a `document`/`window` fuera del scope del canvas pasado

3. **Crear `Asteroids.tsx`** — client component en `app/components/games/Asteroids.tsx`:
   - `"use client"`, `forwardRef<AsteroidsHandle, AsteroidsProps>`
   - Renderiza `<canvas width={800} height={600} ref={canvasRef} />`
   - `useEffect` monta `createAsteroidsGame(canvasRef.current, hooks)` una vez, guarda `controls` en un ref, limpia con `controls.destroy()` en el cleanup
   - `useEffect` separado observa prop `paused` y llama `controls.pause()`/`controls.resume()`
   - `useImperativeHandle(ref, () => ({ forceGameOver: () => controlsRef.current?.forceGameOver() }))`
   - Verificar: componente monta sin errores en consola, canvas se ve y responde a flechas/espacio en un uso manual aislado

4. **Conectar en `[id]/play/page.tsx`** — en `app/games/[id]/play/page.tsx`:
   - Si `id === "asteroids"`, renderizar `<Asteroids ref={asteroidsRef} paused={paused} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={handleGameOver} />` dentro de `crt-screen`, en vez del `game-arena` mock
   - `lives` deja de ser `useState(3)` constante — pasa a `useState<number>(3)` actualizable
   - `handleGameOver(finalScore)` setea `over(true)` (reutiliza el modal existente, ya recibe `score` vía state actualizado por `onScoreChange`)
   - Botón "FIN" — si `id === "asteroids"`, su `onClick` llama `asteroidsRef.current?.forceGameOver()` en vez de `endGame()` directo
   - Para otros `id` (no asteroids), todo el comportamiento mock actual se mantiene sin cambios
   - Verificar en navegador: jugar una partida completa en `/games/asteroids/play` — mover nave, disparar, romper asteroides, ver HUD React y HUD canvas ambos actualizados, morir 3 veces, ver modal de game over, guardar puntaje, verificar en `localStorage` que `game: "asteroids"`

5. **Ajustar leaderboard mock** — confirmar que `app/games/[id]/page.tsx` (detail) sigue funcionando con `id="asteroids"` vía `seededScores(id.length * 17 + 3, 10)` sin cambios (el seed cambia porque cambia el largo del string, es aceptable).

## Acceptance criteria

- [ ] `app/data/games.ts` tiene `id: "asteroids"`, `title: "ASTEROIDS"` (ya no existe `id: "rocas"`)
- [ ] `app/components/games/asteroids-engine.ts` existe y exporta `createAsteroidsGame(canvas, hooks)` con la lógica de clases/física idéntica al `game.js` de referencia
- [ ] `app/components/games/Asteroids.tsx` existe, monta el canvas 800×600 y limpia el motor al desmontar
- [ ] En `/games/asteroids/play`, mover con flechas y disparar con espacio funciona (motor original responde a input)
- [ ] HUD canvas original (score/nivel/vidas dibujado dentro del canvas) se sigue viendo, sin ocultarse
- [ ] HUD React externo (`player-hud`) refleja score/vidas/nivel en tiempo real vía los hooks, sincronizado con el motor
- [ ] Botón "PAUSA" congela el juego (asteroides/nave dejan de moverse) sin romper el render
- [ ] Botón "FIN" fuerza game over y abre el modal de guardar puntaje
- [ ] Morir 3 veces en el juego dispara `onGameOver`, abre el modal React con el puntaje final correcto
- [ ] Guardar puntaje desde el modal escribe en `localStorage` `av_scores` con `game: "asteroids"`
- [ ] Reiniciar con ESPACIO en game over (flujo propio del motor) vuelve a sincronizar el HUD React a 0/3/1
- [ ] Otros juegos (`caida`, `serpentina`, etc.) en `/games/[id]/play` siguen usando el mock sin cambios de comportamiento
- [ ] App compila sin errores TypeScript (`tsc --noEmit`)

## Decisions taken and discarded

| Decisión                   | Elegida                                               | Descartada                                   | Razón                                                                              |
| -------------------------- | ----------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Lógica del juego           | Copiar `game.js` casi intacto, envuelto en función    | Reescribir lógica en componentes React/hooks | Usuario pidió explícito no recrear el juego; motor original ya probado y funcional |
| HUD                        | Mantener ambos (canvas + React) coexistiendo          | Ocultar uno de los dos                       | Usuario pidió explícito usar los 2, no reemplazar ni borrar el HUD del juego       |
| Id/título del juego        | `asteroids` / `ASTEROIDS`                             | Mantener `rocas` / `ROCAS`                   | Usuario pidió alinear id con nombre real del juego                                 |
| Comunicación motor→React   | Callbacks/hooks inyectados                            | Polling de estado global / eventos DOM       | Callbacks son explícitos, tipados, y no requieren exponer estado mutable global    |
| Pausa                      | `update()` retorna temprano, `draw()` sigue corriendo | Cancelar `requestAnimationFrame`             | Mantiene HUD canvas visible y evita relanzar el loop manualmente al reanudar       |
| Controles táctiles         | Fuera de scope                                        | Agregar botones on-screen                    | No existían en el juego original; se deja para spec futuro si se necesita          |
| Otros juegos de referencia | Fuera de scope                                        | Adaptar Tetris/Arkanoid en este spec         | Mantiene el spec acotado a un solo juego                                           |

## Identified risks

- **React Strict Mode (dev) monta/desmonta efectos dos veces** — puede crear dos loops `requestAnimationFrame` o listeners duplicados si `destroy()` no limpia bien. Mitigación: `destroy()` debe cancelar rAF y remover listeners de forma idempotente.
- **Canvas fijo 800×600** — no es responsive; en pantallas móviles pequeñas puede desbordar el `crt-screen`. Mitigación: fuera de scope de este spec (mismo comportamiento que el resto de juegos mock), pero queda como candidato para spec de responsive futuro.
- **Listeners globales de teclado (`window.addEventListener`)** — si el usuario navega fuera de `/games/asteroids/play` sin desmontar limpio, podrían quedar colgados. Mitigación: cleanup en `useEffect` cubre esto siempre que `destroy()` esté bien implementado.
