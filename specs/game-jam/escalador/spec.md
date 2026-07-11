# SPEC — Juego Escalador

> **Status:** Draft · **Tema:** ascenso vertical / plataformas con escaleras y barriles · **Categoría:** ARCADE · **Date:** 2026-07-11
> **Objective:** Diseñar desde cero un juego de plataformas verticales tipo "escalador clásico" (torre de plataformas escalonadas, escaleras, barriles rodantes, salto) montado en `/games/escalador/play` con leaderboard real en Supabase.

## Por qué este spec existe

El tema pedido es explícitamente el arquetipo de plataformas verticales con escaleras y barriles esquivables (estilo Donkey Kong clásico), pero **no existe ningún `game.js` de referencia** en `references/started-games/` para este género en el vault — se diseña la lógica completa desde cero (igual que Snake en `specs/09-snake-game.md`), evitando cualquier nombre, sprite o asset con marca registrada: el juego se llama **Escalador**, protagonista genérico ("el Trepador"), sin gorila, sin princesa, sin logo de ninguna franquicia. Respeta el contrato de wrapper `create<Name>Game(canvas, hooks)` → `<Name>Controls` que ya usan arkanoid/tetris/snake/asteroids, así `registry.ts` no necesita cambios estructurales.

La categoría asignada es `ARCADE` con color `cyan` — encaja naturalmente: es un arcade de reflejos y timing puro (saltar/subir), sin mecánica de combinación (no es PUZZLE), sin proyectiles (no es SHOOTER) y de un solo jugador (no es VERSUS).

## Scope

**In:**

- Nueva entrada en `app/data/games.ts`: `id: "escalador"`, `title: "ESCALADOR"`, `cat: "ARCADE"`, `color: "cyan"`, `cover: "cover-escalador"`
- Nueva clase `.cover-escalador` en `app/globals.css` — gradiente oscuro con acentos cyan (plataformas horizontales sugeridas con `linear-gradient`/`::after`), siguiendo el patrón visual del resto de `cover-*`
- `app/components/games/escalador-engine.ts` — lógica diseñada desde cero: torre de 5 plataformas escalonadas con escaleras, jugador con física de salto/gravedad, barriles que spawnean arriba y ruedan hacia abajo por las plataformas, meta en la plataforma superior. Expone `createEscaladorGame(canvas, hooks): EscaladorControls`
- Estructura de nivel: 5 plataformas horizontales alternando inclinación visual izquierda/derecha (zigzag clásico), conectadas por escaleras verticales en posiciones fijas alternadas, canvas 480×640 (vertical, formato "torre")
- Física de salto: salto vertical corto de altura fija (arco parabólico simple, no salto variable por press-and-hold) que permite pasar por encima de un barril en el tramo horizontal
- Barriles: spawnean en la plataforma superior a intervalo decreciente por nivel, ruedan en una dirección por plataforma, bajan por la primera escalera que encuentran con probabilidad fija (o siguen de largo si no baja), se destruyen al salir del canvas por abajo o al colisionar con el jugador
- Colisión barril-jugador: game over inmediato (pierde una vida) salvo que el jugador esté en estado "saltando" y la posición vertical del salto lo mantenga por encima del barril (hitbox reducida en el pico del arco)
- Vidas: 3 vidas, al perderlas todas → `onGameOver(finalScore)`
- Puntuación: subir de plataforma (+100), saltar sobre un barril (+50), llegar a la meta de la torre (+500 y sube de nivel, reinicia la torre con más velocidad de barriles)
- Niveles: cada torre completada incrementa `level`, reduce el intervalo de spawn de barriles y aumenta su velocidad, hasta un piso/techo razonable
- Controles: teclado — flechas izquierda/derecha (mover), flecha arriba/abajo (subir/bajar escalera cuando está alineado con una), barra espaciadora (saltar)
- HUD dibujado en canvas (plataformas, escaleras, jugador, barriles, meta) — coexiste con el HUD React externo (`player-hud`) que consume los hooks
- `pause()`/`resume()` controlados por el prop `paused` (mismo patrón que snake/tetris/arkanoid): `update()` retorna temprano si `isPaused`, `draw()` sigue corriendo
- Reinicio interno: en estado `gameover`, tecla `Space` reinicia la partida completa y re-emite `onScoreChange(0)`, `onLivesChange(3)`, `onLevelChange(1)`
- `forceGameOver()` fuerza la transición a `gameover`
- `app/components/games/Escalador.tsx` — `forwardRef<GameHandle, GameProps>`, monta `<canvas width={480} height={640}>`, instancia `createEscaladorGame`, limpia con `destroy()`
- Registrar `escalador: Escalador` en `app/components/games/registry.ts`
- Leaderboard real: `getTopScores("escalador", 10)` en `[id]/page.tsx`, `getTopScores("escalador", 12)` en `salon/page.tsx`, `insertScore({ game: "escalador", ... })` en `play/page.tsx` — automático vía `GAME_ENGINES`

**Out of scope (para specs futuros):**

- Sprites/assets bitmap (spritesheet de personaje/barril) — el motor dibuja todo con formas geométricas (`fillRect`/`arc`) en la primera versión, igual que arkanoid dibuja bloques como rectángulos coloreados
- Sonido — no hay original que portar, se omite
- Power-ups (martillo, invencibilidad temporal) — se descartan explícito para mantener el scope simple
- Objetos coleccionables adicionales (frutas, ítems bonus) más allá del sistema de puntos por acción
- Barriles que "explotan" en llamas al tocar el suelo o mecánicas de fuego
- Más de una torre/tema visual (solo un layout de plataformas, reciclado con velocidad creciente por nivel)
- Controles táctiles/mobile
- Multijugador o modo versus (la categoría asignada es ARCADE, no VERSUS)

## Data model

Nueva entrada en `app/data/games.ts` (tipo `Game` sin cambios):

```ts
{
  id: "escalador",
  title: "ESCALADOR",
  short: "Esquiva barriles y trepa hasta la cima.",
  long: "El Trepador debe subir una torre de plataformas escalonadas esquivando barriles que ruedan cuesta abajo. Sube escaleras, salta en el momento justo y alcanza la cima antes de perder las tres vidas.",
  cat: "ARCADE",
  cover: "cover-escalador",
  color: "cyan",
  best: 4200,
  plays: "0",
}
```

`app/components/games/registry.ts` — se agrega la línea `escalador: Escalador` a `GAME_ENGINES`, tipos `GameProps`/`GameHandle` **sin cambios** (Escalador calza directo con `paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`, `forceGameOver`).

`escalador-engine.ts` — tipos nuevos, solo en memoria:

```ts
type EscaladorHooks = {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

type EscaladorControls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

function createEscaladorGame(
  canvas: HTMLCanvasElement,
  hooks: EscaladorHooks
): EscaladorControls;
```

Estado interno del motor (no exportado, solo referencia de diseño):

```ts
type Platform = { y: number; direction: "left" | "right" };
type Ladder = { x: number; platformIndexTop: number };
type Barrel = {
  x: number;
  y: number;
  platformIndex: number;
  vx: number;
  falling: boolean;
};
type Player = {
  x: number;
  y: number;
  platformIndex: number;
  vy: number;
  state: "idle" | "walking" | "climbing" | "jumping";
};
```

Convenciones: origen de coordenadas arriba-izquierda; velocidades en píxeles/frame; `platformIndex` 0 = suelo, 4 = plataforma superior (meta).

Assets: ninguno — todo se dibuja con primitivas de canvas (rectángulos para plataformas/jugador, líneas para escaleras, círculos para barriles), evitando dependencia de sprites externos y cualquier parecido visual con material registrado.

No hay cambios al contrato `GameProps`/`GameHandle` de `registry.ts` — Escalador se ajusta 100% al patrón existente.

## Implementation plan

1. **Agregar entrada en `games.ts`** — insertar el objeto `escalador` (sección Data model) al array `GAMES`. App sigue compilando, `/games/escalador` navegable con leaderboard vacío/mock hasta el paso 6.

2. **Crear clase `.cover-escalador` en `globals.css`** — gradiente oscuro cyan con `::after` sugiriendo franjas horizontales (plataformas), mismo patrón que `.cover-snake`/`.cover-invaders`. Verificar: la card en `/games` renderiza el cover sin romper el grid.

3. **Crear `escalador-engine.ts` — esqueleto y torre estática**
   - Canvas 480×640 recibido por parámetro
   - Definir las 5 plataformas (`Platform[]`) con `y` fijo espaciado uniforme y escaleras (`Ladder[]`) en posiciones alternadas que conectan plataformas consecutivas
   - `draw()` pinta el fondo, las 5 plataformas (rectángulos delgados con inclinación visual alternada vía `ctx.save/rotate` leve o simplemente offset visual), las escaleras (líneas verticales con travesaños) y la meta en la plataforma superior
   - Verificar: `tsc --noEmit` pasa, canvas muestra la torre estática

4. **Añadir jugador y controles de movimiento/escalera**
   - Estado `Player` con posición inicial en el suelo (`platformIndex: 0`)
   - Listener `keydown`/`keyup` sobre `document`: flechas izquierda/derecha mueven `vx` mientras `state !== "jumping"`; flecha arriba/abajo cambian a `state: "climbing"` solo si `player.x` está dentro del rango de una escalera que conecta con la plataforma adyacente correspondiente
   - `update(dt)`: aplica movimiento horizontal clamped a los límites de la plataforma actual, aplica movimiento vertical continuo mientras `climbing`, hasta alcanzar la `y` de la plataforma destino (`platformIndex` cambia ahí)
   - Verificar manualmente: el jugador camina por una plataforma y sube/baja por escaleras alineadas, sin atravesar bordes

5. **Añadir física de salto**
   - Barra espaciadora dispara `state: "jumping"` solo si el jugador está sobre una plataforma (no en escalera)
   - Arco parabólico fijo: `vy` inicial negativo, gravedad constante por frame, retorna a `state: "idle"`/`"walking"` al aterrizar en la `y` de la plataforma actual
   - Verificar: el jugador salta y aterriza en el mismo `platformIndex`, sin permitir doble salto

6. **Añadir barriles: spawn, rodado y colisión**
   - Timer de spawn en la plataforma superior (posición fija de origen), intervalo inicial en ms, decrece con el nivel hasta un piso
   - Cada barril rueda con `vx` constante en la dirección de la plataforma (`direction`); al llegar al extremo, con probabilidad fija baja por la escalera más cercana (cambia `platformIndex - 1`, ajusta `y` en rampa) o revierte `vx` si no baja
   - Barril fuera del canvas (`y > 640`) se elimina del array
   - Colisión AABB barril-jugador: si se solapan y el jugador no está en el pico de un salto sobre esa `x`, resta una vida (`hooks.onLivesChange`), reposiciona al jugador en el suelo; si las vidas llegan a 0, `gameState = "gameover"` + `hooks.onGameOver(score)`
   - Saltar sobre un barril (jugador en `jumping` cruza la `x` de un barril en la misma plataforma sin colisión) suma +50 una sola vez por barril (`hooks.onScoreChange`)
   - Verificar manualmente: barriles ruedan, bajan escaleras ocasionalmente, colisión resta vida, salto exitoso suma puntos sin restar vida

7. **Añadir progresión de nivel y meta**
   - Subir de `platformIndex` por primera vez en la partida suma +100 (`hooks.onScoreChange`)
   - Llegar a la plataforma superior (meta) suma +500, incrementa `level` (`hooks.onLevelChange`), reduce el intervalo de spawn de barriles y aumenta su velocidad, reposiciona al jugador en el suelo de una torre "reiniciada" (misma disposición, mayor dificultad)
   - Verificar: completar la torre reinicia la posición del jugador y sube el nivel visible en el HUD

8. **Cablear `pause`/`resume`/`forceGameOver`/`destroy` y reinicio por `Space`**
   - `pause()`/`resume()` togglean `isPaused`; `update()` retorna temprano si `isPaused`, `draw()` sigue corriendo
   - En `gameover`, tecla `Space` reinicia posición/vidas/score/nivel y re-emite los hooks iniciales
   - `forceGameOver()` fuerza la misma transición que quedarse sin vidas
   - `destroy()` cancela `requestAnimationFrame` y remueve los listeners de teclado de forma idempotente
   - Verificar: `tsc --noEmit` pasa, sin referencias a `document`/`window` fuera de los listeners propios del engine

9. **Crear `Escalador.tsx`** — `forwardRef<GameHandle, GameProps>`, canvas 480×640, instancia `createEscaladorGame` en `useEffect`, limpia con `destroy()` en cleanup, `useImperativeHandle` expone `forceGameOver`. Verificar: componente monta sin errores, canvas responde a teclado en uso aislado.

10. **Registrar en `GAME_ENGINES`** — agregar `escalador: Escalador` en `registry.ts`.

11. **Verificar leaderboard** — jugar `/games/escalador/play`, subir plataformas, esquivar/saltar barriles, perder las 3 vidas, guardar puntaje, confirmar fila en Supabase con `game: "escalador"`; confirmar `/games/escalador` y `/salon` tab `escalador` muestran top real.

## Acceptance criteria

- [ ] `app/data/games.ts` tiene la entrada `id: "escalador"`, `title: "ESCALADOR"`, `cat: "ARCADE"`, `color: "cyan"`, `cover: "cover-escalador"`
- [ ] `.cover-escalador` existe en `globals.css` y la card se ve correctamente en `/games`
- [ ] `escalador-engine.ts` exporta `createEscaladorGame(canvas, hooks)` con torre, escaleras, salto y barriles funcionando
- [ ] `Escalador.tsx` monta el canvas 480×640 y limpia el motor al desmontar
- [ ] En `/games/escalador/play`, flechas mueven al jugador por la plataforma actual sin salirse de los bordes
- [ ] Flecha arriba/abajo sube/baja por una escalera solo cuando el jugador está alineado con ella
- [ ] Barra espaciadora ejecuta un salto de arco fijo y el jugador aterriza en la misma plataforma
- [ ] Los barriles spawnean en la plataforma superior, ruedan y ocasionalmente bajan por una escalera
- [ ] Colisionar con un barril sin estar saltando por encima resta una vida
- [ ] Saltar sobre un barril sin colisionar suma +50 puntos una sola vez por barril
- [ ] Subir de plataforma por primera vez suma +100 puntos
- [ ] Llegar a la plataforma superior (meta) suma +500, sube el nivel y aumenta la dificultad de los barriles
- [ ] Perder las 3 vidas dispara `onGameOver(finalScore)` y detiene el juego
- [ ] Botón "PAUSA" congela el movimiento sin detener el render
- [ ] Botón "FIN" fuerza game over y abre el modal de guardar puntaje
- [ ] Guardar puntaje inserta en Supabase con `game: "escalador"`
- [ ] `/games/escalador` (detalle) y `/salon` tab ESCALADOR muestran leaderboard real desde Supabase
- [ ] Arkanoid/Tetris/Snake/Asteroids siguen funcionando igual (sin cambios en `registry.ts` fuera de la línea nueva)
- [ ] Otros juegos mock restantes (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen sin cambios de comportamiento
- [ ] App compila sin errores TypeScript (`tsc --noEmit`)

## Decisions taken and discarded

- **Sí:** diseñar la lógica completa desde cero, sin `game.js` de referencia (no existe para este género en `references/started-games/`). **No:** buscar/adaptar un clon externo de terceros — el usuario no proveyó ninguno, y evita cualquier riesgo de parecido con material registrado.
- **Sí:** nombre genérico "Escalador" / protagonista "el Trepador", sin gorila ni princesa ni logos. **No:** usar nombres o iconografía asociada a la franquicia original que inspiró el tema — riesgo de marca registrada, tema pedido explícitamente como "estilo" (mecánica), no como copia.
- **Sí:** dibujar todo con primitivas de canvas (rectángulos, líneas, círculos), sin spritesheet. **No:** crear un atlas de sprites nuevo — mantiene el scope de una primera versión simple, consistente con cómo arkanoid dibuja sus bloques como rectángulos coloreados; un spec futuro puede añadir sprites.
- **Sí:** salto de arco fijo (altura y duración constantes), sin salto variable por press-and-hold. **No:** física de salto variable — simplifica el balance de "saltar sobre un barril" a una ventana de tiempo predecible, más fiel al género clásico de plataformas de un solo botón.
- **Sí:** 5 plataformas fijas por torre, reiniciada con mayor dificultad en cada nivel (mismo layout, más velocidad). **No:** generar layouts de torre aleatorios o distintos por nivel — mantiene el spec simple y predecible para el jugador, evita el riesgo de generar configuraciones de escaleras injugables.
- **Sí:** 3 vidas con reset de posición al suelo tras perder una. **No:** una sola vida (como snake) — el género de plataformas con enemigos aleatorios (barriles) necesita margen de error, 3 vidas es el estándar razonable y consistente con arkanoid/asteroids.
- **Sí:** canvas vertical 480×640 (formato "torre"), distinto del 600×600 de snake/tetris. **No:** forzar un canvas cuadrado — la mecánica es inherentemente vertical, el formato debe reflejarlo; se documenta como desviación intencional del resto del catálogo.
- **Suposición documentada:** no se recibió `angle` explícito con pista de mecánica en el prompt de esta tarea (el usuario ya fijó juego, categoría ARCADE y color cyan directamente) — se asumió que "estilo Donkey Kong clásico" definido por el usuario ya satisface el criterio de angle sin necesidad de inventar una pista adicional.

## Identified risks

| Riesgo                                                                                                           | Mitigación                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Colisión de "salto sobre barril" es difícil de balancear sin playtesting real                                    | Hitbox de salto con ventana amplia (ej. mitad superior del arco = invulnerable), ajustable en un solo lugar del código         |
| Barriles bajando por escaleras con probabilidad fija pueden generar rachas injustas (todos bajan o ninguno baja) | Semilla de aleatoriedad por barril individual, no global; se puede ajustar el porcentaje en implementación                     |
| Canvas vertical 480×640 fijo, no responsive                                                                      | Mismo riesgo aceptado que el resto de juegos del vault; candidato a spec de responsive futuro                                  |
| Parecido conceptual con la obra que inspiró el tema (mecánica genérica del género de plataformas)                | Nombres, protagonista y assets 100% genéricos y originales; ninguna mecánica de spec depende de elementos protegidos por marca |
| React Strict Mode (dev) monta/desmonta efectos dos veces                                                         | `destroy()` cancela `requestAnimationFrame` y remueve los listeners de teclado de forma idempotente                            |

## What is **not** in this spec

- Sprites/assets bitmap para personaje o barriles (formas geométricas en esta primera versión).
- Sonido.
- Power-ups (martillo, invencibilidad, etc.).
- Coleccionables adicionales más allá del sistema de puntos por acción.
- Barriles en llamas o variantes de enemigo.
- Múltiples layouts de torre.
- Controles táctiles/mobile.
- Multijugador o modo versus.

Cada uno de estos, si se implementa, va en su propio spec futuro.
