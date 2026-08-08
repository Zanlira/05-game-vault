# SPEC 10 — Controles táctiles móviles

> **Status:** approved   · **Depends on:** SPEC 07 (tetris-game, `registry.ts`), SPEC 08 (arkanoid-game), SPEC 09 (snake-game) · **Date:** 2026-08-08
> **Objective:** Agregar D-pad y botones on-screen táctiles a los 4 juegos jugables (arkanoid, asteroids, snake, tetris) mediante un componente `TouchControls.tsx` compartido que dispara `KeyboardEvent` sintéticos hacia los engines existentes (sin modificarlos), y hacer los canvas responsive vía CSS scale-down para que quepan en pantalla móvil.

## Scope

**In:**

- Crear `app/components/games/TouchControls.tsx` — componente genérico configurable por props (qué botones mostrar y a qué `code` de teclado mapea cada uno). Detecta touch (`'ontouchstart' in window || matchMedia('(pointer: coarse)').matches`) y solo se renderiza si detecta capacidad táctil.
- Cada botón dispara `document.dispatchEvent(new KeyboardEvent('keydown', { code }))` en `touchstart` y `keyup` en `touchend`/`touchcancel` — hold continuo, mismo comportamiento que mantener presionada una tecla física. Se dispatch sobre `document` (no `window`) porque el evento burbujea de `document` hacia `window`, cubriendo tanto el listener de snake (`document`) como los de arkanoid/asteroids/tetris (`window`) sin duplicar dispatch.
- Mapeo por juego (botones concretos a renderizar):
  - **Arkanoid:** flecha izq / flecha der (`ArrowLeft`/`ArrowRight`) — mueve paddle
  - **Asteroids:** flecha izq / flecha der (rotar), flecha arriba (empuje), botón "DISPARAR" (`Space`)
  - **Snake:** D-pad de 4 flechas (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`)
  - **Tetris:** flecha izq / flecha der / flecha abajo (soft drop), botón "ROTAR" (`ArrowUp`), botón "CAER" hard-drop (`Space`)
- Montaje: cada wrapper (`Arkanoid.tsx`, `Asteroids.tsx`, `Snake.tsx`, `Tetris.tsx`) renderiza `<TouchControls buttons={...} />` debajo de su `<canvas>`, dentro del mismo componente — no toca `registry.ts` ni las páginas (`GameProps`/`GameHandle` sin cambios).
- Canvas responsive: envolver cada `<canvas>` en un contenedor con `max-width: 100%; height: auto` (o clase Tailwind equivalente) para que escale visualmente al ancho del viewport en móvil. Resolución interna (`width`/`height` attrs) de cada canvas **no cambia** — mismos valores actuales (arkanoid/asteroids 800×600, snake 600×600, tetris board 300×600 + next 120×120).
- Verificación manual en viewport móvil (DevTools o dispositivo real) de los 4 juegos: controles visibles, funcionales, canvas legible sin overflow horizontal de la página.

**Out of scope (para specs futuros):**

- Gestos (swipe/drag) — se descarta explícito, solo D-pad/botones.
- Redimensionar resolución interna del canvas (recalcular grid/física por viewport) — CSS scale-down alcanza para este spec.
- Resize dinámico en vivo (rotación de pantalla, cambio de tamaño de ventana mientras se juega) — cálculo solo al montar.
- Ocultar controles táctiles en tablets grandes con detección adicional de ancho — se usa solo capacidad touch, sin combinar con viewport width.
- Vibración/haptics al presionar botones.
- Layout landscape-específico u orientación forzada.
- Sonido de UI en botones táctiles.

## Data model

No introduce estructuras persistentes nuevas (nada en Supabase/localStorage cambia). Solo tipos nuevos en memoria:

```ts
// TouchControls.tsx
type TouchButton = {
  code: string; // KeyboardEvent.code a simular, ej. "ArrowLeft", "Space"
  label: string; // texto/ícono del botón, ej. "◀", "DISPARAR"
  position: "dpad-left" | "dpad-right" | "dpad-up" | "dpad-down" | "action";
};

type TouchControlsProps = {
  buttons: TouchButton[];
};

function TouchControls(props: TouchControlsProps): JSX.Element | null;
// retorna null si no detecta touch capability
```

- `GameProps`/`GameHandle` (`registry.ts`) no cambian — `TouchControls` vive dentro de cada wrapper, no en el contrato del engine.
- Los 4 `*-engine.ts` no cambian su tipo `Hooks`/`Controls` — siguen escuchando `keydown`/`keyup` como hoy, ajenos a si el origen del evento fue teclado físico o `TouchControls`.

## Implementation plan

1. **Crear `TouchControls.tsx`** — componente genérico: detecta touch capability al montar (`useEffect` + `'ontouchstart' in window || matchMedia('(pointer: coarse)').matches`), retorna `null` si no aplica. Renderiza `buttons` prop como grid de `<button>` posicionados (`dpad-left`/`dpad-right`/`dpad-up`/`dpad-down` agrupados como cruz, `action` aparte a la derecha). Cada botón: `onTouchStart` → `document.dispatchEvent(new KeyboardEvent('keydown', { code }))`, `onTouchEnd`/`onTouchCancel` → `keyup` con el mismo `code`. Verificar: `tsc --noEmit` pasa, componente aislado no rompe si `buttons` es `[]`.

2. **Envolver canvas en contenedor responsive** en los 4 wrappers (`Arkanoid.tsx`, `Asteroids.tsx`, `Snake.tsx`, `Tetris.tsx`) — `<div className="max-w-full">` (o utilidad Tailwind equivalente) alrededor de cada `<canvas>`, agregar `className="max-w-full h-auto"` al propio `<canvas>`. `width`/`height` attrs sin cambios. Verificar: en desktop no cambia nada visualmente (canvas sigue a tamaño real); en viewport angosto (DevTools 375px) el canvas se ve completo sin overflow horizontal de la página.

3. **Montar `TouchControls` en `Arkanoid.tsx`** — `buttons={[ArrowLeft, ArrowRight]}` debajo del canvas. Verificar en emulación touch: presionar/soltar mueve el paddle igual que teclado.

4. **Montar `TouchControls` en `Asteroids.tsx`** — `buttons={[ArrowLeft, ArrowRight, ArrowUp, Space(disparar)]}`. Verificar: rotar, empuje y disparo responden a touch.

5. **Montar `TouchControls` en `Snake.tsx`** — `buttons={[4 flechas D-pad]}`. Verificar: cambia dirección sin permitir giro 180° (regla ya existente en el engine, no se toca).

6. **Montar `TouchControls` en `Tetris.tsx`** — `buttons={[ArrowLeft, ArrowRight, ArrowDown, ArrowUp(rotar), Space(hard-drop)]}`. Verificar: mover, rotar y caer responden a touch; segundo canvas ("next piece") no necesita controles.

7. **Verificación cruzada final** — jugar los 4 juegos en emulación móvil (DevTools device toolbar, ≥1 dispositivo real si disponible): controles visibles solo en modo touch, ausentes en desktop con mouse; teclado físico sigue funcionando en paralelo sin conflicto; canvas legible en pantallas 360–414px de ancho; `tsc --noEmit` limpio en todo el repo.

## Acceptance criteria

- [ ] `TouchControls.tsx` existe, exporta componente que recibe `buttons: TouchButton[]`
- [ ] En dispositivo/emulación sin touch (mouse), `TouchControls` no renderiza nada visible en ningún juego
- [ ] En dispositivo/emulación con touch, aparece debajo del canvas en los 4 juegos jugables
- [ ] Arkanoid: botones izq/der mueven el paddle mientras se mantienen presionados, se detiene al soltar
- [ ] Asteroids: botones izq/der rotan la nave, botón arriba empuja, botón disparar dispara — todos funcionan mientras se sostiene
- [ ] Snake: D-pad cambia dirección, bloquea giro de 180° (comportamiento heredado del engine)
- [ ] Tetris: izq/der/abajo mueven pieza, botón rotar rota, botón caer ejecuta hard-drop
- [ ] Teclado físico sigue funcionando en los 4 juegos sin conflicto con `TouchControls`
- [ ] Los 4 canvas escalan visualmente sin overflow horizontal en viewport ≤414px de ancho
- [ ] Resolución interna (`width`/`height` attrs) de los canvas no cambió respecto al valor actual
- [ ] `registry.ts`, `GameProps`, `GameHandle` sin cambios
- [ ] Ningún `*-engine.ts` fue modificado
- [ ] App compila sin errores TypeScript (`tsc --noEmit`)

## Decisions taken and discarded

- **Sí:** cubrir los 4 juegos jugables en un solo spec. **No:** spec piloto de 1 juego — usuario confirmó explícito, patrón de `TouchControls` es el mismo para los 4, no amerita dividir.
- **Sí:** D-pad + botones on-screen. **No:** gestos (swipe/drag) — mecánica más simple y uniforme entre juegos con controles muy distintos (paddle 1D vs nave 2D vs grid discreto).
- **Sí:** `TouchControls` dispara `KeyboardEvent` sintéticos vía `document.dispatchEvent`. **No:** API `press()/release()` nueva en cada engine — evita tocar los 4 `*-engine.ts` ya probados, reusa el listener existente tal cual.
- **Sí:** dispatch sobre `document` (no `window`) para cubrir tanto el listener de snake (`document`) como los de arkanoid/asteroids/tetris (`window`) vía bubbling — un solo dispatch, sin lógica condicional por juego.
- **Sí:** CSS scale-down (`max-width:100%; height:auto`) sobre resolución interna fija. **No:** recalcular resolución interna del canvas por viewport — evita tocar lógica de grid/física de cada engine, que no era parte de este spec.
- **Sí:** hold continuo (touchstart=keydown, touchend=keyup). **No:** tap discreto — usuario confirmó, coherente con comportamiento de tecla física sostenida que los engines ya asumen.
- **Sí:** detección solo por touch capability (`pointer:coarse`/`ontouchstart`). **No:** combinar con ancho de viewport — usuario confirmó explícito, tablets grandes con touch también ven controles.
- **Sí:** controles debajo del canvas, dentro del flujo normal. **No:** overlay flotante sobre el canvas — evita tapar el área de juego.
- **Sí:** resize solo al montar (sin recalcular en `resize`/`orientationchange`). **No:** resize dinámico en vivo — usuario confirmó, evita riesgo de bugs de coordenadas en juegos de grid (snake/tetris) a mitad de partida.

## Identified risks

| Riesgo                                                                                                                       | Mitigación                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `KeyboardEvent` sintético no dispara en algún navegador/engine si listener usa `.key` en vez de `.code` con chequeo estricto | Verificar en paso 1 que los 4 engines leen `.code`/`.key` de forma compatible con el `code` emitido antes de dar por buena la conexión |
| Doble input si usuario tiene teclado físico conectado a un dispositivo touch (ej. tablet con teclado)                        | No es un riesgo funcional grave — ambos inputs producen el mismo evento, es redundante pero no rompe nada                              |
| CSS scale-down puede verse borroso o con pixelado excesivo si el canvas se achica mucho (ej. 800px→320px)                    | Aceptado para este spec; ajuste de nitidez con `devicePixelRatio`/resolución interna queda para spec futuro                            |
| Botones táctiles pueden solaparse con notch/safe-area en algunos dispositivos                                                | Fuera de scope de verificación automatizada — se revisa visualmente en el paso 7, sin `env(safe-area-inset-*)` en este spec            |
| `touchcancel` no disparado por el navegador en algún caso raro deja una tecla "trabada" (`keydown` sin `keyup`)              | Aceptado como riesgo conocido; mitigación futura sería un timeout de seguridad, fuera de scope aquí                                    |
