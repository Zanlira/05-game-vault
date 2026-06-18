---
spec: 04-supabase-setup
state: Implemented
dependencies: 03-about-contact
date: 2026-06-18
objective: Integrar Supabase en la app Next.js creando clientes browser y server listos para auth, scores, realtime y edge functions.
---

## Scope

### In scope

- Instalar `@supabase/ssr` y `@supabase/supabase-js`
- `lib/supabase/client.ts` — cliente browser (usa `createBrowserClient`)
- `lib/supabase/server.ts` — cliente server (usa `createServerClient` con cookies de Next.js)
- `.env.local` — vars `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `.env.example` — documenta ambas vars sin valores

### Not in scope

- Auth (registro/login) — spec futuro
- Tablas o schema en Supabase (scores, perfiles) — spec futuro
- Realtime subscriptions — spec futuro
- Edge Functions — spec futuro
- Middleware de sesión — spec futuro

## Implementation plan

1. **Instalar dependencias** — `npm install @supabase/supabase-js @supabase/ssr`

2. **Env vars** — Crear `.env.local` con:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<tu project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon key>
   ```

3. **Cliente browser** — Crear `lib/supabase/client.ts`:

   ```ts
   import { createBrowserClient } from "@supabase/ssr";

   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     );
   }
   ```

4. **Cliente server** — Crear `lib/supabase/server.ts`:

   ```ts
   import { createServerClient } from "@supabase/ssr";
   import { cookies } from "next/headers";

   export async function createClient() {
     const cookieStore = await cookies();
     return createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() {
             return cookieStore.getAll();
           },
           setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) =>
                 cookieStore.set(name, value, options)
               );
             } catch {}
           },
         },
       }
     );
   }
   ```

5. **Verificar conexión** — En un Server Component temporal (o `app/page.tsx`), importar `createClient` del server, llamar `supabase.from("_test").select()` y confirmar que no hay error de red/auth (error de tabla inexistente es esperado y válido).

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` en `package.json`
- [ ] `.env.local` existe con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `.env.example` documenta ambas vars sin valores
- [ ] `lib/supabase/client.ts` exporta `createClient()` usando `createBrowserClient`
- [ ] `lib/supabase/server.ts` exporta `createClient()` async usando `createServerClient` con cookies
- [ ] Llamada de prueba al cliente server no arroja error de red ni de credenciales (error de tabla inexistente es aceptable)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` nunca aparece en un `server-only` context sin `NEXT_PUBLIC_` prefix
- [ ] App compila sin errores TypeScript (`tsc --noEmit`)

## Decisions taken and discarded

| Decisión                 | Elegida                    | Descartada                      | Razón                                                                                                  |
| ------------------------ | -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Librería cliente         | `@supabase/ssr`            | `@supabase/auth-helpers-nextjs` | `auth-helpers` deprecado; `ssr` es el reemplazo oficial para App Router                                |
| Clientes                 | Browser + Server separados | Un solo cliente universal       | App Router requiere separación: server client usa cookies del request, browser client usa localStorage |
| Auth en este spec        | Fuera de scope             | Incluir registro/login          | Mantiene scope mínimo; auth es spec propio                                                             |
| Middleware de sesión     | Fuera de scope             | Incluir `middleware.ts`         | Solo necesario cuando hay rutas protegidas; no las hay aún                                             |
| Verificación de conexión | Llamada de prueba temporal | Test automatizado               | No hay test runner configurado en el proyecto                                                          |
