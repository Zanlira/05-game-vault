---
name: add-game
description: Genera un spec para integrar un juego (de references/started-games o externo) al Arcade Vault — engine canvas envuelto en componente React, registro en games.ts, y leaderboard Supabase. Hace preguntas sobre la fuente del juego y produce specs/NN-slug.md listo para /spec-impl. Úsalo al añadir un juego nuevo.
disable-model-invocation: true
argument-hint: "nombre del juego o carpeta de references (ej. tetris)"
---

# /add-game — Generador de specs para integrar juegos

Este skill produce un spec en `specs/NN-slug.md` que describe cómo integrar un juego canvas (de `references/started-games/` o externo) al Arcade Vault: engine envuelto en componente React, registro en `app/data/games.ts`, y leaderboard real en Supabase. **No escribes código aquí.** Tu trabajo termina cuando el spec queda guardado. La implementación la hace `/spec-impl NN-slug` después.

Lee `game-integration.md` (en el mismo directorio que este skill) **antes de la Fase 3** — ahí está todo el conocimiento del patrón: los 5 artefactos, el checklist de gotchas por juego, el diseño del registro genérico, y el esqueleto de spec a rellenar. Apóyate en él en cada paso.

Tus respuestas deben estar en el mismo idioma del prompt inicial. Los specs de este proyecto (`specs/05-asteroids-game.md`, `specs/06-leaderboard-supabase.md`) están en español — sigue esa convención salvo que el usuario pida lo contrario.

## Fases

### Fase 1 — Contexto del proyecto

1. Leer `CLAUDE.md` y `AGENTS.md` en la raíz del repo.
2. Listar `specs/` para ver la numeración y determinar el próximo número.
3. Leer los specs más recientes relacionados con juegos: `specs/05-asteroids-game.md` y `specs/06-leaderboard-supabase.md` — son la plantilla real que este skill emula.
4. Leer `game-integration.md` completo (companion de este skill).

### Fase 2 — Identificar la fuente del juego

`$ARGUMENTS` trae el nombre del juego o carpeta. Si viene vacío, pregunta.

1. Buscar en `references/started-games/` una carpeta cuyo nombre coincida (aproximado) con `$ARGUMENTS`. Si existe:
   - Leer su `game.js` (o archivo principal) completo.
   - Detectar y leer también archivos externos que importe: `levels.js`, `assets/spritesheet.js`, sonidos (`assets/sounds/*`), `style.css` si tiene HUD en DOM.
2. Si no coincide con ninguna carpeta de referencia, preguntar si el juego viene de otra ruta o si el usuario va a pegar el código directamente.
3. Recolectar con el usuario (o inferir del `index.html`/`README.md` de la referencia y confirmar) la metadata para `app/data/games.ts`:
   - `id` (slug en minúsculas, ej. `tetris`)
   - `title` (MAYÚSCULAS, ej. `TETRIS`)
   - `short` (una línea, teaser)
   - `long` (párrafo, descripción para el detalle)
   - `cat` (`ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`)
   - `color` (`cyan` | `magenta` | `yellow` | `green`)
   - `cover` (nombre de clase CSS nueva, ej. `cover-tetro` — confirmar si ya existe una clase o hay que crearla)
   - `best`, `plays` (valores iniciales tipo "stat", pueden ser placeholder razonable)

No avances a la Fase 3 sin tener el `game.js` completo leído y la metadata confirmada.

### Fase 3 — Analizar el `game.js` (checklist de gotchas)

Usa el checklist de `game-integration.md` sección "Checklist de adaptación por-juego". Como mínimo, determina y anota explícitamente:

1. **Canvas**: cómo lo obtiene hoy (`getElementById` → se reemplaza por parámetro), dimensiones (¿constantes hardcodeadas `W`/`H`? ¿derivadas de otras constantes? ¿lee `canvas.width` en runtime?), ¿usa más de un canvas?
2. **Input**: target de los listeners (`window` vs `document` vs el propio canvas), `e.code` vs `e.key`, ¿usa mouse? (`mousemove`/`click` con `getBoundingClientRect`).
3. **Estado del juego**: qué variables trackea (`score`/`lives`/`level`/`state`, o variantes como `lines`, `gameState`, `isPaused`, `paused`, `gameOver`, ¿tiene estado "win"?).
4. **HUD**: ¿se dibuja en el canvas (fácil) o se actualiza vía DOM (`textContent`, hay que convertir a estado React)?
5. **Assets externos**: ¿depende de un spritesheet/imagen, sonidos (`new Audio`), datos de niveles en otro archivo? ¿el arranque es async (gate antes del primer frame)?
6. **`dt`**: ¿segundos (con o sin cap) o milisegundos con acumulador?
7. **Game over / restart**: ¿cómo transiciona a game over? ¿cómo reinicia (tecla en el loop, botón DOM que reconstruye, o no tiene restart)?
8. **Puntos de mutación**: en qué funciones exactas cambian `score`/`lives`/`level` y dónde se decide game over — ahí van los hooks `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`.

Muestra este análisis al usuario como resumen antes de seguir (bloque corto, no todo el código).

### Fase 4 — Decidir si aplica el refactor del registro genérico

Verificar si ya existe `app/components/games/registry.ts` (o un campo `engine`/`GAME_ENGINES` ya presente en el código).

- Si **no existe** (caso típico: primer juego que se añade con este skill después de asteroids): el spec debe incluir, como primeros pasos del plan de implementación, el refactor one-time descrito en `game-integration.md` sección "Registro genérico" — que elimina los `id === "asteroids"` hardcodeados en `app/games/[id]/play/page.tsx`, `app/games/[id]/page.tsx` y `app/salon/page.tsx`.
- Si **ya existe**: el spec solo agrega la entrada en `GAMES`, el engine, el wrapper, y la línea en `GAME_ENGINES` — sin tocar las páginas.

Confirma con el usuario cuál de los dos casos aplica antes de escribir el spec.

### Fase 5 — Escribir el spec

Antes de generar el archivo, lee `.agents/skills/spec/SKILL.md` y `.agents/skills/spec/template.md` completos (el skill `/spec` y su plantilla) — son la referencia canónica de cómo este proyecto escribe specs. Toma de ahí la forma exacta (Header con estados válidos, Scope In/Out, Data model, Implementation plan con pasos commiteables, Acceptance criteria verificable en booleano, Decisions con razón, Risks opcional) y las reglas duras de `/spec` (una frase por objetivo, nombres concretos, sin TODOs, sin código largo). Cruza también otra vez `specs/05-asteroids-game.md` y `specs/06-leaderboard-supabase.md` (ya leídos en Fase 1) como ejemplo real de esa forma aplicada a un juego. Usa el esqueleto de `game-integration.md` sección "Esqueleto de spec" como base, rellenado con los datos concretos de las Fases 2–4.

- `Depends on:` = `04-supabase-setup` (siempre, porque el leaderboard es obligatoriamente Supabase) + `05-asteroids-game`/el spec del refactor si aplica (Fase 4).
- Status inicial: `Draft`.
- No generes el spec completo de un tirón si el usuario quiere revisar por secciones — puedes ofrecerlo, pero por defecto (para mantener este skill rápido) puedes presentar el spec completo y pedir confirmación en bloque, dado que gran parte del contenido ya salió del análisis de las fases previas.
- Determinar el número siguiente listando `specs/`.
- Confirmar el nombre de archivo propuesto (`specs/NN-slug.md`) con el usuario antes de escribirlo.

Al guardar, confirma al usuario:

- Ruta del archivo creado.
- Recordatorio: el spec está en `Draft`. Cambiar a `Approved` tras revisarlo.
- Próximo paso: correr `/spec-impl NN-slug`.
- **Detente ahí.** No propongas implementar, no escribas código de la app.

## Reglas duras

- **Nunca escribas código de la app en este skill.** Solo el `.md` del spec al final.
- **Nunca implementes ni propongas implementar después de guardar.** Tu trabajo termina al escribir el archivo.
- **El leaderboard siempre es Supabase** para juegos integrados con este skill (`getTopScores(id, N)` / `insertScore({ game: id, ... })`) — no ofrezcas mock como alternativa salvo que el usuario explícitamente pida un juego sin persistencia real (en cuyo caso, aclara que ese caso ya lo cubre añadir solo una entrada a `GAMES` sin este skill).
- **No asumas metadata ni decisiones de arquitectura sin confirmar** — si falta algo (id, título, categoría, si aplica el refactor del registro), pregunta.
- **No copies el `game.js` completo dentro del spec.** El spec describe la adaptación (qué cambia y dónde), no reescribe el juego línea por línea — igual que hizo `specs/05-asteroids-game.md`.
