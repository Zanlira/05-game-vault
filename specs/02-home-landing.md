---
spec: 02-home-landing
state: Approved
dependencies: 01-mvp-screens
date: 2026-06-15
objective: Implementar la home landing page de Arcade Vault en `/`, mover Biblioteca a `/games`, y actualizar el Nav acorde.
---

## Scope

### In scope
- Nueva ruta `/` → `app/page.tsx` reemplazada con Home landing page (fiel a `references/templates/home-about/home.jsx`)
- Biblioteca movida de `app/page.tsx` a `app/games/page.tsx`
- Rutas de detalle y reproductor se mantienen en `app/games/[id]/` y `app/games/[id]/play/`
- Nav actualizado: Inicio→`/`, Biblioteca→`/games`, Salón de la Fama→`/salon`, Acerca de→`/about` (link inactivo hasta spec futuro)
- CSS: portar clases home desde `references/templates/home-about/styles.css` a `app/globals.css`
- Secciones de la landing: Hero, ¿Por qué Arcade Vault?, Juegos Disponibles (6 mini-cards desde `GAMES`), Stats, Actividad en Vivo (datos estáticos), Precios/FAQ, CTA final
- `FloatingSilhouettes` y `FeatureIcon` como sub-componentes internos de la página

### Not in scope
- Página About (`/about`) — spec futuro
- Datos reales o dinámicos en sección "Actividad en vivo"
- Animaciones de transición entre rutas
- Cambios en Auth, Salón, Detalle, Reproductor

## Implementation plan

1. **Mover Biblioteca** — renombrar `app/page.tsx` → `app/games/page.tsx`. Crear `app/games/` si no existe.

2. **CSS home** — Leer `references/templates/home-about/styles.css` líneas 930–1069 (bloque `HOME PAGE`), portar clases faltantes a `app/globals.css`. Clases clave: `.home`, `.home-hero`, `.home-hero-inner`, `.hero-eyebrow`, `.home-title`, `.home-sub`, `.home-ctas`, `.hero-scroll`, `.home-silos`, `.silo`, `.home-section`, `.section-head`, `.section-title`, `.section-rule`, `.feature-grid`, `.feature-card`, `.ft-icon`, `.ft-title`, `.ft-desc`, `.mini-rail`, `.mini-card`, `.mini-cover`, `.mini-meta`, `.home-stats`, `.stats-inner`, `.stat-block`, `.stat-n`, `.stat-u`, `.stat-s`, `.activity-grid`, `.activity-card`, `.ac-head`, `.ac-title`, `.ticker`, `.tick-row`, `.top-list`, `.top-row`, `.pricing-grid`, `.price-card`, `.pricing-faq`, `.home-final`, `.final-title`, `.final-cta`, `.final-tag`, `.reveal`. Incluir keyframes `float`, `bounce`.

3. **Nav** — Actualizar `app/components/Nav.tsx`: links Inicio→`/`, Biblioteca→`/games`, Salón de la Fama→`/salon`, Acerca de→`/about`. Ajustar lógica `isActive` para que `/games/[id]` y `/games/[id]/play` marquen "Biblioteca" como activo.

4. **`app/page.tsx`** — Nueva Home landing. Client Component (`"use client"`). Sub-componentes internos: `FloatingSilhouettes`, `FeatureIcon`, `MiniCard`. Secciones en orden del template: Hero → Why → Games Preview → Stats → Activity → Pricing → Final CTA. Botones de navegación usan `useRouter()` de Next.js (reemplaza `navigate()` del template).

5. **QA** — Verificar: `/` renderiza landing, `/games` renderiza Biblioteca, links del Nav navegan correctamente, reveal scroll-animation funciona, mini-cards de juegos se muestran.

## Acceptance criteria

- [ ] `/` muestra la home landing con hero, eyebrow "INSERTA UNA MONEDA", título 3 líneas y 2 CTAs
- [ ] FloatingSilhouettes renderiza 8 SVGs animados en el hero
- [ ] Sección "¿Por qué Arcade Vault?" muestra 4 feature-cards con íconos pixel
- [ ] Sección "Juegos Disponibles" muestra los primeros 6 juegos de `GAMES` como mini-cards
- [ ] Click en mini-card navega a `/games/[id]`
- [ ] Sección Stats muestra 3 stat-blocks (12+, MILES, GLOBAL)
- [ ] Sección "Actividad en vivo" muestra ticker de últimas puntuaciones y top 5 jugadores (datos estáticos)
- [ ] Sección Precios muestra price-card + 3 FAQs
- [ ] Sección Final CTA muestra botón "INSERTAR MONEDA →"
- [ ] Scroll-reveal: secciones debajo del hero aparecen con fade+slide al entrar al viewport
- [ ] `/games` renderiza la Biblioteca (grid de juegos con búsqueda y filtros) sin errores
- [ ] Nav: "Inicio" activo en `/`, "Biblioteca" activo en `/games`, `/games/[id]`, `/games/[id]/play`
- [ ] Botón "EXPLORAR JUEGOS" navega a `/games`
- [ ] Botón "CREAR CUENTA" navega a `/auth`
- [ ] Botón "VER SALÓN →" navega a `/salon`
- [ ] Todas las rutas existentes (`/auth`, `/salon`, `/games/[id]`, `/games/[id]/play`) siguen funcionando sin errores

## Decisions taken and discarded

| Decisión | Elegida | Descartada | Razón |
|---|---|---|---|
| Ruta raíz `/` | Home landing (nueva) | Mantener Biblioteca en `/` | Landing es el entry point canónico; Biblioteca accesible vía Nav |
| Ruta Biblioteca | `/games` | `/biblioteca` | Más corto, idiomático en inglés, consistente con `/games/[id]` ya existente |
| Navegación en Home | `useRouter()` de Next.js | Props `navigate()` del template | Template es SPA vanilla; Next.js usa router nativo |
| Sub-componentes (`FloatingSilhouettes`, `FeatureIcon`, `MiniCard`) | Definidos inline en `app/page.tsx` | Archivos separados en `app/components/` | Solo usados en Home; no justifica extraerlos todavía |
| Datos "Actividad en vivo" | Estáticos inline | Conectar a `seededScores()` | Suficiente para MVP visual; lógica real es scope futuro |
| Página About | Spec futuro (`03-about`) | Incluir en este spec | Mantiene scope acotado |

## Identified risks

- **Rutas rotas post-mover Biblioteca:** Links hardcodeados a `/` en otros componentes (Nav, GameCard "volver") apuntarán mal tras mover Biblioteca a `/games`. Mitigación: paso 3 del plan actualiza Nav; buscar y corregir cualquier `href="/"` o `router.push("/")` que apunte a Biblioteca.
- **CSS `reveal` con IntersectionObserver:** Requiere `useEffect` en Client Component. Si se omite, secciones quedan invisibles (`opacity: 0`). Mitigación: implementar `useReveal()` hook fiel al template.
- **`"use client"` en `app/page.tsx`:** Home necesita `useRouter` e interactividad. Marcarla como Client Component rompe posible RSC en el layout raíz. Mitigación: layout raíz ya wrappea `UserContextProvider` (Client), agregar `"use client"` a `page.tsx` es seguro.
