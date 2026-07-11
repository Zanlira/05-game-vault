---
name: game-jam
description: Da un tema libre (ej. "juego sobre café") y lanza 2 agentes game-jam en paralelo con ángulos (categoría/color) distintos, cada uno inventando un juego original y escribiendo su spec completo en specs/game-jam/<game-id>/spec.md. Úsalo para explorar rápido 2 candidatos divergentes de un tema antes de decidir cuál implementar.
disable-model-invocation: true
argument-hint: "tema del jam (ej. café)"
---

# /game-jam — Generador paralelo de 2 propuestas de juego

Este skill dispara el agente `game-jam` **2 veces en paralelo**, cada instancia con un ángulo (categoría + color) distinto, sobre el mismo tema. Cada instancia inventa un juego original y escribe su spec completo en `specs/game-jam/<game-id>/spec.md`. Tu trabajo aquí es orquestar el lanzamiento paralelo y resumir el resultado — no escribes specs ni código.

## Pasos

1. `$ARGUMENTS` = tema. Si viene vacío, pregunta al usuario un tema en una frase (ej. "café", "espacio profundo", "lluvia").

2. Elegir 2 ángulos **divergentes**: categoría (`ARCADE | PUZZLE | SHOOTER | VERSUS`) y color (`cyan | magenta | yellow | green`) distintos entre sí. Antes de elegir, lee `app/data/games.ts` para ver qué categorías/colores ya están sobre-representadas en el catálogo (8 juegos) y prioriza huecos si es razonable; si no hay señal clara, usa dos categorías cualesquiera que no coincidan entre sí (ej. `ARCADE`/`PUZZLE`).

3. Lanzar **ambos agentes `game-jam` en un solo mensaje, en paralelo** (dos llamadas Agent en el mismo turno, no secuenciales), pasando a cada uno:
   - El mismo `tema`.
   - Su `angle` asignado (categoría + color, distinto del otro).

   Ejemplo de prompts:
   - Agente A: `tema: "café", angle: { cat: "ARCADE", color: "cyan" }`
   - Agente B: `tema: "café", angle: { cat: "PUZZLE", color: "magenta" }`

4. Cuando ambos terminen, resume al usuario lado a lado:
   - Nombre/título de cada juego, categoría, color, mecánica en una línea, por qué encaja con el tema.
   - Ruta del spec de cada uno (`specs/game-jam/<id>/spec.md`).
   - Recordatorio: ambos specs quedan en `Draft` — revisar, y si se elige uno, moverlo/aprobarlo y correr `/spec-impl` sobre él (o pedir a `/add-game` que lo formalice si hace falta ajustar el número de spec fuera de `game-jam/`).

## Reglas duras

- No escribas tú ningún spec ni código — eso lo hacen las 2 instancias del agente `game-jam`.
- No elijas tú cuál de los 2 juegos es "mejor" — preséntalos neutralmente, la decisión es del usuario.
- Si el usuario pide más de 2 propuestas, puedes lanzar más instancias con más ángulos distintos, pero el comportamiento por defecto sin pedirlo explícitamente es 2.
