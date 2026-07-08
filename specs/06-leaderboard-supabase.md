---
spec: 06-leaderboard-supabase
state: Implemented
dependencies: 04-supabase-setup, 05-asteroids-game
date: 2026-07-07
objective: Persistir puntajes de Asteroids en una tabla Supabase (scores) con inserción/lectura pública, y conectar /games/asteroids (detalle) y /salon (tab asteroids) a esos datos reales, dejando el resto de juegos/tabs en su mock actual.
---

## Scope

### In scope

- Tabla Supabase `scores` (SQL migration/script) — columnas: `id`, `game` (text), `player_name` (text, max 10), `score` (int), `created_at` (timestamptz default now())
- RLS: policy `INSERT` pública (anon), policy `SELECT` pública (anon) — sin auth, mismo modelo que hoy
- `lib/supabase/scores.ts` — funciones `insertScore({ game, playerName, score })` y `getTopScores(game, limit)` usando cliente browser (`lib/supabase/client.ts`)
- `app/games/[id]/play/page.tsx` — `saveScore()` para `id === "asteroids"` inserta en Supabase en vez de `localStorage av_scores` (otros juegos: sin cambio, siguen en localStorage)
- `app/games/[id]/page.tsx` — cuando `id === "asteroids"`, leaderboard lateral usa `getTopScores("asteroids", 10)` en vez de `seededScores`; resto de juegos sin cambio
- `app/salon/page.tsx` — tab `asteroids` usa `getTopScores("asteroids", 12)` real (podio + tabla); resto de tabs siguen con `seededScores` mock
- Loading/empty states en ambas vistas cuando la tabla real no tiene registros aún

### Not in scope

- Auth real de Supabase — sigue sin login, `player_name` es texto libre igual que hoy
- Persistir puntajes de otros juegos (`caida`, `serpentina`, etc.) — siguen mock, no tienen gameplay real
- Migrar datos existentes de `localStorage av_scores`
- Página `/leaderboard` nueva — se descarta, se reusa `/salon`
- Paginación, búsqueda o filtros adicionales en `/salon` más allá de los tabs existentes
- Antitrampas / validación de puntajes sospechosos

## Data model

```sql
create table scores (
  id bigint generated always as identity primary key,
  game text not null,
  player_name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table scores enable row level security;

create policy "public insert" on scores
  for insert to anon with check (true);

create policy "public select" on scores
  for select to anon using (true);

create index scores_game_score_idx on scores (game, score desc);
```

```ts
// lib/supabase/scores.ts
export type ScoreEntry = {
  id: number;
  game: string;
  playerName: string;
  score: number;
  createdAt: string;
};

export async function insertScore(entry: {
  game: string;
  playerName: string;
  score: number;
}): Promise<void>;

export async function getTopScores(
  game: string,
  limit: number
): Promise<ScoreEntry[]>;
```

- Fila mapea a lo que hoy consume el UI vía `ScoreRow` (`rank`, `name`, `score`, `date`) — `getTopScores` calcula `rank` por posición y formatea `created_at` a `dd/mm/yyyy` antes de devolver, para no tocar el shape que ya usan `[id]/page.tsx` y `salon/page.tsx`

## Implementation plan

1. **Crear tabla en Supabase** — correr el SQL (migration o Supabase Studio) que crea `scores`, habilita RLS, y agrega policies `public insert`/`public select` + índice. Verificar: `select * from scores;` desde Studio no da error de permisos.

2. **Crear `lib/supabase/scores.ts`** — implementar `insertScore` (usa `createClient()` de `lib/supabase/client.ts`, `.from("scores").insert(...)`) y `getTopScores` (`.from("scores").select().eq("game", game).order("score", { ascending: false }).limit(limit)`, mapea a `ScoreRow`). Verificar: `tsc --noEmit` pasa, tipos exportados coinciden con `ScoreRow` de `app/data/scores.ts`.

3. **Conectar `saveScore` en `play/page.tsx`** — para `id === "asteroids"`, `saveScore()` llama `insertScore({ game: "asteroids", playerName: name, score })` (await, catch de error igual que hoy con try/catch silencioso + `setSaved(true)`); para el resto de ids, sin cambio (sigue localStorage). Verificar en navegador: jugar Asteroids, morir, guardar puntaje, confirmar fila nueva en Supabase Studio con `game: "asteroids"`.

4. **Conectar leaderboard en `[id]/page.tsx`** — para `id === "asteroids"`, reemplazar `seededScores(...)` por `getTopScores("asteroids", 10)` vía `useEffect`/estado (pasa de cálculo síncrono a fetch async), agregar estado de loading simple (spinner o texto "CARGANDO…") y estado vacío ("SIN PUNTUACIONES AÚN") si `scores.length === 0`; resto de ids sin cambio. Verificar: entrar a `/games/asteroids`, ver la fila insertada en el paso 3 en el leaderboard lateral.

5. **Conectar tab asteroids en `salon/page.tsx`** — cuando `tab === "asteroids"`, usar `getTopScores("asteroids", 12)` real en vez de `seededScores`; agregar mismo loading/empty state; ajustar bloque "TU MEJOR MARCA" (`youRank`/`youScore`, hoy simulados) para que si `tab === "asteroids"` y no hay suficientes datos reales para calcularlo, simplemente no se muestre ese bloque en vez de inventar un valor. Resto de tabs sin cambio. Verificar: entrar a `/salon`, click en tab ASTEROIDS, ver podio y tabla con datos reales de Supabase; cambiar a otro tab y confirmar que sigue mostrando mock sin errores.

6. **Manejo de errores de red** — si `getTopScores` falla (red/RLS), ambas vistas muestran estado vacío/error simple en vez de romper la página (try/catch alrededor del fetch, log a consola). Verificar: cortar red momentáneamente o apagar env vars, confirmar que `/games/asteroids` y `/salon` no crashean.

## Acceptance criteria

- [ ] Tabla `scores` existe en Supabase con columnas `id`, `game`, `player_name`, `score`, `created_at`, RLS activo, policies `insert`/`select` públicas
- [ ] `lib/supabase/scores.ts` exporta `insertScore` y `getTopScores` tipados, compila sin errores TS
- [ ] Jugar Asteroids, morir, guardar puntaje → inserta fila real en Supabase con `game: "asteroids"`
- [ ] `/games/asteroids` (detalle) muestra top 10 real desde Supabase, ordenado por score desc
- [ ] `/salon` tab ASTEROIDS muestra podio + tabla con datos reales (top 12) desde Supabase
- [ ] `/games/<otro-id>` y `/salon` tab de otros juegos siguen mostrando `seededScores` mock sin cambios de comportamiento
- [ ] Guardar puntaje en juegos no-asteroids sigue escribiendo en `localStorage av_scores` sin cambios
- [ ] Estado vacío visible ("SIN PUNTUACIONES AÚN" o similar) cuando la tabla no tiene filas para ese juego
- [ ] Falla de red/RLS al leer scores no rompe la página (sin crash, estado de error/vacío)
- [ ] App compila sin errores TypeScript (`tsc --noEmit`)

## Decisions taken and discarded

| Decisión                                            | Elegida                                     | Descartada                         | Razón                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Persistencia                                        | Supabase (tabla real)                       | localStorage                       | Usuario pidió explícito real persistence, entre dispositivos                                                               |
| Página global                                       | Reusar `/salon` existente                   | Crear `/leaderboard` nuevo         | `/salon` ya cubre exactamente el concepto (tabs por juego, podio, tabla), ya está en el nav; página nueva duplicaría UI    |
| Juegos con datos reales                             | Solo `asteroids`                            | Todos los juegos                   | Es el único con gameplay real; persistir puntajes falsos del mock no aporta valor                                          |
| Auth para insert                                    | RLS pública anon (insert+select)            | Bloquear insert hasta spec de auth | No existe auth real todavía (spec futuro); mantiene paridad con flujo actual de "escribe tu nombre"                        |
| Migración de `av_scores`                            | Descartar, tabla arranca vacía              | Migrar datos de localStorage       | Son datos de prueba del mock, sin valor real                                                                               |
| Bloque "TU MEJOR MARCA" en `/salon` (tab asteroids) | Ocultar si no hay datos reales suficientes  | Mantener valor simulado            | Mostrar un puntaje inventado junto a datos reales sería engañoso                                                           |
| Límite de filas                                     | Top 10 (`[id]/page.tsx`), top 12 (`/salon`) | Paginación / límite mayor          | Coincide con los límites ya usados por el mock actual (`seededScores(..., 10)` y `(..., 12)`), sin cambiar la UI existente |

## Identified risks

- **RLS pública sin auth** — cualquiera con la anon key puede insertar puntajes falsos vía API directa (no solo desde la UI). Mitigación: fuera de scope de este spec, aceptable para MVP; endurecer cuando exista auth real.
- **Fetch async en componentes que antes eran síncronos** (`[id]/page.tsx`, `salon/page.tsx`) — introduce nuevo estado de loading/error que no existía; riesgo de parpadeo/layout shift si no se maneja bien. Mitigación: estado de loading simple ya cubierto en el plan (paso 4/5).
- **Variable de entorno `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** — el spec 04 la documentó como `ANON_KEY` pero el código actual usa `PUBLISHABLE_KEY` (visto en `lib/supabase/client.ts`); si `.env.local` no tiene esa var exacta, `insertScore`/`getTopScores` fallan silenciosamente. Mitigación: verificar la var en Paso 1 antes de escribir código.
