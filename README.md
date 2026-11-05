# Flashcards C1

PWA de flashcards con repetición espaciada (algoritmo estilo Anki/SM-2), pensada para repasar
vocabulario de inglés a diario de cara al examen C1 (Pearson English International Certificate,
Level 4).

## Stack

- Vite + React 18 + TypeScript (modo estricto)
- Tailwind CSS v4 (modo oscuro automático vía `prefers-color-scheme`, con toggle manual guardado
  en `localStorage` usando una clase `dark` en `<html>`)
- React Router
- Supabase (`@supabase/supabase-js`) para auth y datos, protegido con Row Level Security
- vite-plugin-pwa para manifest, service worker e iconos
- Vitest + Testing Library para tests unitarios
- Despliegue como SPA estática en Netlify

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # y rellena las claves de Supabase
npm run dev
```

## Variables de entorno

| Variable                 | Descripción                                                                     |
| ------------------------ | ------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL del proyecto Supabase                                                       |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase. Es pública por diseño; la seguridad la da RLS |

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción (`tsc -b && vite build`)
- `npm run preview` — sirve el build de producción localmente
- `npm run lint` — ESLint
- `npm run format` — Prettier (escribe los cambios)
- `npm test` — Vitest (una pasada)
- `npm run test:watch` — Vitest en modo watch

## Decisiones tomadas

- **React 18 (no 19) y TypeScript 5.9 (no 7):** el prompt original pedía React 18 explícitamente.
  Al hacer el scaffolding, `create-vite` instala por defecto React 19 y TypeScript 7 (el nuevo
  compilador en Go, muy reciente). `typescript-eslint` todavía no soporta TypeScript 7, así que se
  fijó TypeScript en la última 5.x estable para mantener el ecosistema de lint compatible.
- **`react-router` en vez de `react-router-dom`:** desde la v7, `react-router` es el paquete
  unificado (incluye los bindings de DOM); `react-router-dom` se mantiene solo por compatibilidad.
- **Oxlint → ESLint + Prettier:** el scaffolding moderno de Vite usa Oxlint por defecto, pero el
  prompt pedía explícitamente ESLint + Prettier, así que se sustituyó.
- **Tailwind CSS v4:** configuración "CSS-first" (sin `tailwind.config.js`), con el plugin
  `@tailwindcss/vite`. El modo oscuro usa una `@custom-variant dark` basada en la clase `.dark` de
  `<html>` para poder combinar detección automática del sistema con un toggle manual persistente.
- **Alias `@/*` → `src/*`:** configurado en `tsconfig.app.json` y `vite.config.ts` para imports más
  limpios a medida que crezca el proyecto.

## Cómo funciona el algoritmo

Pendiente (fase 2): se documentará aquí el algoritmo SM-2 de `src/lib/scheduler.ts` una vez
implementado.

## Ideas futuras (fuera de alcance de este proyecto)

- Imágenes o audio propio en las tarjetas (de momento solo TTS del navegador).
- Mazos compartidos o multiusuario.
- Otros algoritmos de repetición espaciada (FSRS).
- Importar `.apkg` de Anki.
- Notificaciones push.

## Aviso sobre el plan gratuito de Supabase

En el plan gratuito, Supabase pausa los proyectos tras 7 días sin actividad. Si usas la app a
diario no debería ocurrir; si pasa, se reactiva desde el panel de Supabase.
