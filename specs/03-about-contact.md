---
spec: 03-about-contact
state: Approved
dependencies: 02-home-landing
date: 2026-06-15
objective: Implementar la página About en `/about` con formulario de contacto que envía emails vía Resend.
---

## Scope

### In scope
- `app/about/page.tsx` — nueva ruta `/about` (Client Component), fiel a `references/templates/home-about/about.jsx`
- Secciones: hero (kicker + título + misión + 3 highlight-cards), divider animado, contacto (intro + formulario)
- `app/api/contact/route.ts` — API Route POST que usa Resend SDK para enviar email a `zantlira@gmail.com`
- Estados del formulario: idle → loading (`TRANSMITIENDO...`, botón disabled) → success (terminal UI) → error (terminal UI con mensaje de fallo)
- CSS: portar clases About desde `references/templates/home-about/styles.css` líneas 1071–1147 a `app/globals.css`
- Nav: activar link `/about` en `app/components/Nav.tsx` (actualmente marcado como inactivo)
- Env var `RESEND_API_KEY` en `.env.local`

### Not in scope
- Verificación de dominio propio en Resend
- Rate limiting en la API route
- Guardar mensajes en base de datos
- Captcha / anti-spam
- Animación de transición entre rutas

## Data model

No hay estructuras persistidas. Solo tipos TypeScript en-memoria:

```ts
// Estado del formulario
type FormState = { name: string; email: string; msg: string }
type SubmitStatus = "idle" | "loading" | "success" | "error"

// Body del POST /api/contact
type ContactPayload = { name: string; email: string; msg: string }

// Respuesta de la API
type ContactResponse = { ok: true } | { ok: false; error: string }
```

`RESEND_API_KEY` — env var solo en servidor, nunca expuesta al cliente.

## Implementation plan

1. **Instalar Resend SDK** — `npm install resend` en el proyecto.

2. **Env var** — Añadir `RESEND_API_KEY=<tu_key>` a `.env.local`. Documentar la variable (sin valor) en `.env.example` si existe, o crear uno.

3. **API Route** — Crear `app/api/contact/route.ts`:
   - Método POST, lee `{ name, email, msg }` del body
   - Valida que los 3 campos no estén vacíos → 400 si fallan
   - Llama a Resend SDK: `from: "onboarding@resend.dev"`, `to: "zantlira@gmail.com"`, subject con nombre del remitente, body con nombre + email + mensaje
   - Retorna `{ ok: true }` (200) o `{ ok: false, error }` (500)

4. **CSS About** — Portar bloques `/* ===== ABOUT PAGE ===== */` (líneas 1071–1147) de `references/templates/home-about/styles.css` a `app/globals.css`. Verificar que `.reveal` y `@keyframes pxblink` no estén duplicados (`.reveal` ya existe desde spec 02).

5. **`app/about/page.tsx`** — Client Component (`"use client"`):
   - Sub-componente `HighlightIcon` inline (igual al template)
   - `useEffect` con IntersectionObserver para `.reveal` (igual al template)
   - Estado: `form: FormState`, `status: SubmitStatus`
   - `onSubmit`: valida campos → si vacíos, shake; si OK, `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })` → actualiza `status` según respuesta
   - Loading: botón muestra `TRANSMITIENDO...` y `disabled`
   - Success: terminal UI del template con nombre del usuario
   - Error: terminal UI alternativo con mensaje `FALLO EN TRANSMISIÓN. INTENTA DE NUEVO.` y botón para reintentar

6. **Nav** — En `app/components/Nav.tsx`, quitar comentario/flag que marca `/about` como inactivo; activar el link normalmente.

## Acceptance criteria

- [ ] `/about` renderiza sin errores: hero con kicker, título, texto de misión y 3 highlight-cards
- [ ] `HighlightIcon` muestra SVG correcto para HEART, BROWSER y PLANT
- [ ] Divider animado (pixel dots) visible entre secciones
- [ ] Sección contacto muestra intro (kicker, título, tips) + formulario
- [ ] Submit con campos vacíos → formulario hace animación shake, no envía
- [ ] Submit válido → botón cambia a `TRANSMITIENDO...` y queda disabled
- [ ] Respuesta exitosa de API → formulario reemplazado por terminal success con nombre del usuario
- [ ] Botón `ENVIAR OTRO MENSAJE` en success → limpia formulario, vuelve a idle
- [ ] Respuesta con error de API → terminal error con `FALLO EN TRANSMISIÓN. INTENTA DE NUEVO.`
- [ ] `POST /api/contact` con body válido → Resend envía email a `zantlira@gmail.com` y retorna `{ ok: true }`
- [ ] `POST /api/contact` con campos vacíos → retorna 400
- [ ] `RESEND_API_KEY` no expuesta al cliente (solo `NEXT_PUBLIC_` vars van al bundle)
- [ ] Nav: link "Acerca de" activo y resaltado en cyan al estar en `/about`
- [ ] Scroll-reveal: secciones debajo del hero aparecen con fade+slide al entrar al viewport
- [ ] CSS About en `globals.css` sin duplicar `.reveal` ni keyframes ya existentes

## Decisions taken and discarded

| Decisión | Elegida | Descartada | Razón |
|---|---|---|---|
| Remitente email | `onboarding@resend.dev` (sandbox) | Dominio propio verificado | MVP rápido sin configuración DNS |
| Destinatario | `zantlira@gmail.com` | Env var configurable | Solo un destinatario, hardcodeado es suficiente para ahora |
| Error UI | Terminal style (igual al success) | Toast / banner | Consistencia visual con el design system arcade |
| Loading UI | Botón `TRANSMITIENDO...` disabled | Spinner pixel-art | Más simple, mismo estilo del template |
| `HighlightIcon` | Inline en `app/about/page.tsx` | `app/components/HighlightIcon.tsx` | Solo usado en About; no justifica archivo separado |
| Rate limiting | Fuera de scope | Middleware en API route | MVP; se añade cuando haya tráfico real |
| Anti-spam / captcha | Fuera de scope | reCAPTCHA | Overhead innecesario para MVP |
