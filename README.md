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

## Despliegue

Producción: **https://germanmallo-flashcards.netlify.app**

- Desplegado en Netlify a partir del repo de GitHub (`netlify.toml`: `npm run build` → `dist`, con
  redirección SPA `/* → /index.html`).
- Variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) configuradas en Netlify,
  iguales que en `.env.local`.
- La URL de Netlify está añadida a las **Redirect URLs** de Supabase (Authentication → URL
  Configuration), junto a `http://localhost:5173`, para que el login funcione en ambos sitios.
- Cada push a `main` dispara un nuevo deploy automático.

### Instalar la PWA

- **iPhone (Safari):** abre la URL → icono Compartir → **Añadir a pantalla de inicio**.
- **Android (Chrome):** abre la URL → menú (⋮) → **Instalar aplicación** / **Añadir a pantalla de
  inicio**.

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
- **Los tipos de `src/types/database.ts` usan `type`, no `interface`:** con `@supabase/supabase-js`
  2.119, declarar las filas (`Row`/`Insert`/`Update`) de las tablas como `interface` hace que el
  chequeo genérico interno del cliente (`Schema extends GenericSchema ? Schema : never`) colapse a
  `never` para TODAS las tablas — mismos campos, mismo tipo, solo cambia `interface` por `type` y
  deja de pasar. Aislado con un repro mínimo antes de aplicar el cambio; si se vuelve a tocar ese
  archivo, mantener `type`.
- **`react-hooks/set-state-in-effect` desactivada:** `eslint-plugin-react-hooks` v7 empaqueta el
  análisis estático del React Compiler en su config "recommended" aunque el proyecto no use el
  Compiler. Esa regla marca como error el patrón estándar "fetch al montar" en un hook
  personalizado (efecto que llama a una función async que en algún momento hace `setState`), que
  es perfectamente válido en React 18 sin `useEffectEvent` (API de React 19). Las versiones del
  plugin sin esa regla solo soportan ESLint hasta v9, y aquí se usa v10, así que desactivarla es
  más simple que bajar de versión ambos paquetes.
- **Racha (streak) calculada ya en el Home, no solo en Estadísticas:** la sección 6.1 del prompt
  pide mostrarla en el resumen del día, así que `src/lib/streak.ts` se implementó en esta fase y se
  reutilizará en la fase de Estadísticas.

## Cómo funciona el algoritmo

El algoritmo vive en tres módulos puros y testeados con Vitest (`src/lib/`), sin dependencias de
Supabase ni de la UI:

- **`studyDay.ts`:** el "día de estudio" empieza a las 04:00 hora local (como en Anki), no a
  medianoche. `studyDayStart` calcula a qué día de estudio pertenece una fecha; `addStudyDays`
  suma N días de estudio completos. Usa los métodos locales de `Date` (`setHours`/`setDate`), que
  mantienen la hora de pared (04:00) correcta incluso al cruzar un cambio de hora de verano/invierno.
- **`scheduler.ts`:** la función pura `schedule(card, rating, now, config?, rng?)` implementa SM-2.
  El campo `step` indica el índice del próximo retraso de aprendizaje/reaprendizaje a aplicar: con
  "Bien" se sirve el retraso del paso actual y se avanza uno; cuando el índice se sale del array de
  pasos, la tarjeta gradúa. Esto es lo que hace que `learningSteps = [1, 10]` necesite exactamente
  tres pulsaciones de "Bien" para graduar (1 min → 10 min → graduar), tal como pide el criterio de
  aceptación.
  - **Decisión no trivial:** al fallar una tarjeta de repaso (lapse), el intervalo posterior al
    fallo (`max(1, round(interval * lapseMultiplier))`) se guarda temporalmente en el propio campo
    `intervalDays` mientras la tarjeta está en `relearning` (ese campo no se usa para nada más en
    ese estado), y se aplica al graduar de vuelta a `review`.
  - **Decisión no trivial:** al entrar en reaprendizaje, el campo `step` se inicializa a
    `relearningSteps.length` (no a 0) porque el primer paso de reaprendizaje ya se "sirve" en ese
    mismo momento (el `due` se fija a `now + relearningSteps[0]`). Con la configuración por defecto
    (un único paso de 10 min), esto hace que una sola respuesta "Bien" tras el fallo gradúe la
    tarjeta, como en Anki. Pulsar "Otra vez" dentro del reaprendizaje reinicia `step` a 0 y obliga a
    repetir el paso completo.
  - El fuzz aleatorio (±5 %) solo se aplica a los intervalos calculados a partir de una tarjeta ya
    en `review` (Difícil/Bien/Fácil), no a los intervalos fijos de graduación
    (`graduatingInterval`/`easyInterval`) ni al intervalo de reaprendizaje guardado.
- **`queue.ts`:** `buildStudyQueue` arma la cola de la sesión: primero las tarjetas de
  aprendizaje/reaprendizaje ya vencidas, después las de repaso vencidas (con un barajado ligero por
  ventanas) intercaladas con tarjetas nuevas (una nueva cada 3 repasos, por defecto), respetando el
  límite `new_per_day` de cada mazo menos las nuevas ya estudiadas hoy (contadas en los
  `review_logs` desde el inicio del día de estudio). Si no queda nada vencido pero hay tarjetas de
  aprendizaje programadas más tarde ese mismo día, se muestran antes de tiempo en vez de terminar la
  sesión, igual que hace Anki.

## Ideas futuras (fuera de alcance de este proyecto)

- Imágenes o audio propio en las tarjetas (de momento solo TTS del navegador).
- Mazos compartidos o multiusuario.
- Otros algoritmos de repetición espaciada (FSRS).
- Importar `.apkg` de Anki.
- Notificaciones push.

## Aviso sobre el plan gratuito de Supabase

En el plan gratuito, Supabase pausa los proyectos tras 7 días sin actividad. Si usas la app a
diario no debería ocurrir; si pasa, se reactiva desde el panel de Supabase.
