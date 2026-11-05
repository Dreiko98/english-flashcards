# Prompt: app web de flashcards con repetición espaciada (tipo Anki) — React + Supabase + Netlify

## 0. Rol y forma de trabajar

Eres un ingeniero full-stack senior que trabaja de forma agéntica en mi máquina. Vas a construir, probar y desplegar desde cero una app web de flashcards con repetición espaciada (estilo Anki). La usaré a diario en el móvil y en el ordenador para preparar el examen C1 de inglés (Pearson English International Certificate, Level 4).

Reglas de trabajo:

1. **Trabaja por fases** (sección 9). Al terminar cada fase, ejecuta `npm run build` y los tests, corrige los errores y dame un resumen breve de lo hecho antes de seguir.
2. **Pasos manuales, de uno en uno.** Cuando yo tenga que hacer algo a mano (crear el proyecto en Supabase, pegar SQL, copiar claves, configurar Netlify), dame **un solo paso**, espera a que te confirme el resultado y solo entonces pasa al siguiente. No me des listas de diez pasos de golpe.
3. **No inventes claves ni URLs.** Pídemelas cuando las necesites. Nunca subas secretos al repositorio: usa `.env.local` (que debe estar en `.gitignore`) y un `.env.example` con los nombres de las variables.
4. **Prioriza que funcione y sea simple.** Nada de dependencias innecesarias, sobreingeniería ni features fuera del alcance (sección 8). Si algo es ambiguo, toma la decisión razonable más simple y anótala en el README.
5. Código, nombres de variables y comentarios en **inglés**. **Interfaz de usuario en español.**
6. Usa git desde el principio, con commits pequeños y descriptivos por fase.

---

## 1. Objetivo del producto

Una PWA instalable para repasar tarjetas con un algoritmo SM-2 parecido al de Anki, con sincronización entre dispositivos mediante Supabase (auth + Postgres). Quiero que:

- Se abra rápido en el móvil, como una app (pantalla completa, icono en la pantalla de inicio).
- Me deje crear mazos y tarjetas cómodamente, también desde el móvil.
- El repaso diario sea rápido: botones grandes, atajos de teclado en el ordenador y audio de la tarjeta con pronunciación inglesa.
- Pueda importar tarjetas desde Quizlet (texto separado por tabuladores) y desde CSV.
- Muestre estadísticas básicas: racha de días, repasos por día y porcentaje de aciertos.

Usuario único (yo), pero bien hecho: cada fila pertenece a un usuario y está protegida con Row Level Security.

---

## 2. Stack técnico (obligatorio)

- **Vite + React 18 + TypeScript** (modo estricto).
- **Tailwind CSS** para estilos. Mobile-first, con modo oscuro automático (`prefers-color-scheme`) y un toggle manual guardado en `localStorage`.
- **React Router** para la navegación.
- **@supabase/supabase-js v2** para auth y datos.
- **vite-plugin-pwa** para manifest, service worker e iconos.
- **Vitest** para los tests unitarios (sobre todo del algoritmo).
- Despliegue en **Netlify** como SPA estática.
- Sin backend propio: todo va contra Supabase desde el cliente, protegido por RLS.
- Sin librerías de estado pesadas. Basta con React Context + hooks. Puedes usar TanStack Query si simplifica la caché y los refetch, pero no es obligatorio.

Variables de entorno:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

(La anon key es pública por diseño. La seguridad la da RLS.)

---

## 3. Autenticación

- **Email + contraseña** con Supabase Auth. **No uses magic links**: en iOS, una PWA instalada tiene su propio almacenamiento y el enlace del email se abre en Safari, así que la sesión no llega a la app instalada.
- Pantallas: iniciar sesión, registrarse y "he olvidado mi contraseña" (con `resetPasswordForEmail` y una ruta `/reset-password` para fijar la nueva).
- La sesión persiste (opción por defecto de supabase-js). Las rutas privadas redirigen a `/login` si no hay sesión.
- Botón de cerrar sesión en Ajustes.
- Guíame (de uno en uno) para configurar en Supabase: Site URL y Redirect URLs (localhost:5173 y la URL de Netlify). Si lo prefiero, también para desactivar la confirmación de email, ya que es una app personal.

---

## 4. Modelo de datos (Supabase / Postgres)

Genera un archivo `supabase/schema.sql` que yo pueda pegar tal cual en el SQL Editor de Supabase. Debe ser idempotente en lo posible (`create table if not exists`, `drop policy if exists` antes de `create policy`).

### Tabla `decks`

| columna     | tipo        | notas                                                                |
| ----------- | ----------- | -------------------------------------------------------------------- |
| id          | uuid PK     | `default gen_random_uuid()`                                          |
| user_id     | uuid        | `not null default auth.uid()`, FK `auth.users(id) on delete cascade` |
| name        | text        | not null                                                             |
| description | text        | nullable                                                             |
| new_per_day | int         | `not null default 15`                                                |
| created_at  | timestamptz | `default now()`                                                      |
| updated_at  | timestamptz | `default now()` (trigger de actualización)                           |

### Tabla `cards`

| columna                 | tipo        | notas                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------- |
| id                      | uuid PK     |                                                                              |
| user_id                 | uuid        | `not null default auth.uid()`, FK                                            |
| deck_id                 | uuid        | FK `decks(id) on delete cascade`                                             |
| front                   | text        | not null (anverso; admite saltos de línea)                                   |
| back                    | text        | not null (reverso)                                                           |
| example                 | text        | nullable (frase de ejemplo)                                                  |
| notes                   | text        | nullable                                                                     |
| tags                    | text[]      | `default '{}'`                                                               |
| tts_lang                | text        | `default 'en-GB'`                                                            |
| state                   | text        | `check (state in ('new','learning','review','relearning'))`, default `'new'` |
| due                     | timestamptz | `default now()`                                                              |
| interval_days           | int         | default 0                                                                    |
| ease                    | real        | default 2.5                                                                  |
| step                    | int         | default 0 (paso actual de aprendizaje/reaprendizaje)                         |
| reps                    | int         | default 0                                                                    |
| lapses                  | int         | default 0                                                                    |
| suspended               | boolean     | default false                                                                |
| created_at / updated_at | timestamptz |                                                                              |

Índices: `(user_id, due)`, `(deck_id)`, `(deck_id, state)`.

### Tabla `review_logs`

| columna         | tipo        | notas                                                                             |
| --------------- | ----------- | --------------------------------------------------------------------------------- |
| id              | uuid PK     |                                                                                   |
| user_id         | uuid        | `default auth.uid()`                                                              |
| card_id         | uuid        | FK `cards(id) on delete cascade`                                                  |
| deck_id         | uuid        | FK `decks(id) on delete cascade` (para contar las nuevas del día por mazo)        |
| rating          | smallint    | `check (rating between 1 and 4)` (1 = Otra vez, 2 = Difícil, 3 = Bien, 4 = Fácil) |
| state_before    | text        |                                                                                   |
| interval_before | int         |                                                                                   |
| interval_after  | int         |                                                                                   |
| ease_after      | real        |                                                                                   |
| duration_ms     | int         | tiempo que tardé en responder                                                     |
| reviewed_at     | timestamptz | `default now()`                                                                   |

Índice: `(user_id, reviewed_at)`.

### RLS

- Activa RLS en las tres tablas.
- Políticas `select / insert / update / delete` con `user_id = auth.uid()` (`using` y `with check`).
- Comprueba que un usuario no puede leer ni modificar datos de otro.

### Función RPC (opcional pero recomendada)

`review_card(p_card_id uuid, p_rating int, p_new_state jsonb, p_duration_ms int)`, que en **una sola transacción** actualiza la tarjeta e inserta el log. El cálculo de SM-2 se hace en el cliente (para poder testearlo con Vitest) y se pasa el estado resultante. Debe ser `security invoker` para que RLS siga aplicando. Si lo ves más simple, haz dos llamadas desde el cliente, pero razónalo en el README.

---

## 5. Algoritmo de repetición espaciada (SM-2 estilo Anki)

Impleméntalo como **función pura** en `src/lib/scheduler.ts`:
`schedule(card, rating, now, config) → { state, due, interval_days, ease, step, reps, lapses }`. Debe estar **cubierta con tests de Vitest** para todos los casos de abajo.

### Configuración (constantes exportadas)

- `learningSteps = [1, 10]` (minutos)
- `relearningSteps = [10]` (minutos)
- `graduatingInterval = 1` (días)
- `easyInterval = 4` (días)
- `startingEase = 2.5`, `minEase = 1.3`
- `hardMultiplier = 1.2`, `easyBonus = 1.3`
- `lapseMultiplier = 0.5` (nuevo intervalo tras un fallo = `max(1, round(interval * 0.5))`)
- `maxInterval = 365` (días)
- `dayStartsAtHour = 4` (el "día de estudio" empieza a las 04:00 hora local, como en Anki)

### Reglas

**Tarjeta `new` o `learning`:**

- **Otra vez (1):** `step = 0`, `due = now + learningSteps[0]`, estado `learning`.
- **Difícil (2):** mismo paso. Si es el primer paso, `due = now + media(step0, step1)`. Si no, repite la duración del paso actual.
- **Bien (3):** avanza al siguiente paso. Si ya no hay más pasos, **gradúa**: estado `review`, `interval = graduatingInterval`, `due` = inicio del día de estudio dentro de `interval` días.
- **Fácil (4):** gradúa directamente con `interval = easyInterval`.

**Tarjeta `review`:**

- **Otra vez (1):** `lapses += 1`, `ease = max(minEase, ease − 0.20)`, estado `relearning`, `step = 0`, `due = now + relearningSteps[0]`. Guarda el nuevo intervalo post-fallo `max(1, round(interval * lapseMultiplier))`.
- **Difícil (2):** `interval = max(interval + 1, round(interval * hardMultiplier))`, `ease = max(minEase, ease − 0.15)`.
- **Bien (3):** `interval = max(interval + 1, round(interval * ease))`.
- **Fácil (4):** `interval = max(interval + 1, round(interval * ease * easyBonus))`, `ease += 0.15`.
- Después aplica **fuzz** aleatorio de ±5 % si `interval > 2`. El RNG debe ser inyectable para que los tests sean deterministas. Limita el resultado a `maxInterval`.
- `due` = inicio del día de estudio (04:00 local) dentro de `interval` días.

**Tarjeta `relearning`:**

- **Otra vez:** vuelve a `step = 0`.
- **Bien:** si quedan pasos, avanza. Si no, vuelve a `review` con el intervalo post-fallo guardado.
- **Fácil:** vuelve a `review` con el intervalo post-fallo + 1.

`reps += 1` en cada respuesta.

### Cola de repaso diaria (`src/lib/queue.ts`)

- **Vencidas:** tarjetas `learning`/`relearning` con `due <= now` (prioridad máxima), luego `review` con `due <=` fin del día de estudio actual.
- **Nuevas:** hasta `new_per_day − nuevas ya estudiadas hoy en ese mazo` (contadas en `review_logs` con `state_before = 'new'` desde el inicio del día de estudio), ordenadas por `created_at`.
- Intercala nuevas y repasos (por ejemplo, una nueva cada 3 repasos) y baraja ligeramente los repasos.
- Las tarjetas de aprendizaje que vencen dentro de la sesión vuelven a aparecer cuando les toca. Si no queda nada más, muéstralas antes de tiempo, como hace Anki.
- Excluye las `suspended`.

Zona horaria: usa la del navegador (Europe/Madrid en mi caso). Centraliza el cálculo del "inicio del día de estudio" en una sola función testeada.

---

## 6. Pantallas y funcionalidades

### 6.1 Inicio / Mazos (`/`)

- Lista de mazos con contadores **Nuevas · Aprendiendo · Para repasar** (colores tipo Anki: azul, rojo, verde).
- Arriba, un resumen del día: tarjetas pendientes en total, racha de días seguidos estudiando y repasos hechos hoy.
- Botón grande "Estudiar" por mazo, más un botón "Estudiar todo".
- Crear, renombrar y eliminar mazos (con confirmación).

### 6.2 Sesión de repaso (`/study/:deckId` o `/study/all`)

- Muestra el **anverso**. Al pulsar "Mostrar respuesta" (o tocar la tarjeta, o la barra espaciadora) aparecen el reverso, el ejemplo y las notas.
- Cuatro botones: **Otra vez · Difícil · Bien · Fácil**, cada uno con el intervalo que resultaría encima (p. ej. "<1 min", "10 min", "1 d", "4 d"), calculado con el propio `schedule`.
- **Atajos de teclado:** espacio/Enter = mostrar respuesta o "Bien"; `1`–`4` = calificar; `R` = reproducir audio; `E` = editar la tarjeta actual; `Z` = deshacer la última respuesta.
- **Audio:** botón de altavoz que lee el anverso (y el ejemplo si existe) con `speechSynthesis`, usando `tts_lang` y eligiendo una voz inglesa si está disponible. Ajuste opcional "Leer automáticamente al mostrar".
- **Deshacer** la última respuesta: restaura el estado anterior de la tarjeta y borra su log.
- Barra de progreso de la sesión y contador de restantes.
- Pantalla final: "¡Hecho por hoy!" con número de tarjetas, tiempo total y % de aciertos de la sesión.
- En móvil: botones grandes y fáciles de pulsar con el pulgar, en la parte inferior. Admite **Markdown básico** en las tarjetas (negrita, cursiva, saltos de línea) con un renderer ligero y saneado. Nada de HTML arbitrario.
- Si falla la red al guardar una respuesta, **guárdala en una cola en `localStorage`** y reintenta en segundo plano. Muestra un indicador discreto de "sin conexión / sincronizando". No debe perderse ningún repaso.

### 6.3 Añadir / editar tarjetas

- Formulario con: mazo, anverso, reverso, ejemplo, notas, etiquetas y idioma TTS.
- "Guardar y añadir otra" deja el mazo y las etiquetas seleccionados y pone el foco en el anverso. Atajo `Ctrl/Cmd + Enter`.
- Opción "Crear también la tarjeta inversa" (crea una segunda tarjeta con anverso y reverso intercambiados).

### 6.4 Navegador de tarjetas (`/browse`)

- Tabla o lista con búsqueda por texto (anverso, reverso, ejemplo) y filtros por mazo, estado y etiqueta.
- Acciones por tarjeta: editar, suspender o reactivar, reiniciar (volver a `new`), mover de mazo y eliminar.
- Acciones en lote sobre la selección: mover, suspender, eliminar.

### 6.5 Importar / exportar (`/import`)

- **Importar texto pegado o archivo `.txt/.csv/.tsv`** con vista previa antes de confirmar:
  - Separador entre anverso y reverso: tabulador (formato de exportación de Quizlet), coma, punto y coma o personalizado.
  - Separador entre tarjetas: salto de línea o personalizado.
  - Columna opcional para ejemplo y notas.
  - Detección de duplicados (mismo anverso en el mismo mazo), con opción de omitirlos.
- **Exportar** un mazo a CSV y una **copia de seguridad completa en JSON** (mazos + tarjetas + logs). También **restaurar** desde ese JSON.

### 6.6 Estadísticas (`/stats`)

- Racha actual y racha máxima.
- Gráfico de barras de repasos por día (últimos 30 días).
- % de aciertos (respuestas ≠ "Otra vez") en repasos de tarjetas maduras y jóvenes.
- Previsión de tarjetas que vencen en los próximos 14 días.
- Recuento de tarjetas por estado.
- Gráficos con SVG simple o una librería ligera (Recharts como máximo). Nada pesado.

### 6.7 Ajustes (`/settings`)

- Nuevas por día (por mazo), tema claro/oscuro/sistema, lectura automática del audio y voz TTS preferida (lista de `speechSynthesis.getVoices()` filtrada a inglés).
- Cerrar sesión.

---

## 7. PWA, rendimiento y calidad

- Manifest con nombre "Flashcards C1", nombre corto "Flashcards", `display: standalone`, colores de tema e iconos 192/512 y maskable (genera iconos simples con SVG, sin assets externos).
- Service worker que cachea el shell de la app para que abra rápido y funcione la UI sin conexión. Los datos vienen de Supabase y las respuestas offline van a la cola del punto 6.2.
- Funciona bien en **Safari iOS** y **Chrome Android**. Respeta las safe areas (`env(safe-area-inset-*)`), evita el zoom al enfocar inputs (font-size ≥ 16px) y usa `100dvh`.
- Accesibilidad básica: contraste suficiente, botones con `aria-label` y foco visible.
- Estados de carga y de error claros en todas las vistas, y vistas vacías útiles (p. ej. "Aún no tienes mazos: crea el primero o importa desde Quizlet").
- ESLint + Prettier configurados. Sin errores de TypeScript.
- Tests de Vitest: `scheduler.ts` (todos los casos de la sección 5), cálculo del inicio del día de estudio (incluido el cambio de hora de verano/invierno) y el parser de importación.

---

## 8. Fuera de alcance (no lo hagas)

- Imágenes o audio subidos a las tarjetas (solo TTS del navegador).
- Mazos compartidos, multiusuario o colaboración.
- FSRS u otros algoritmos (solo SM-2 tal como se define arriba).
- Importar `.apkg` de Anki.
- Notificaciones push.
- Backend propio o serverless functions.

Deja anotadas en el README como "Ideas futuras" las que veas razonables.

---

## 9. Fases de trabajo

1. **Scaffolding:** proyecto Vite + React + TS + Tailwind + Router + ESLint/Prettier + Vitest. Layout base con navegación inferior en móvil y lateral en escritorio. Commit.
2. **Algoritmo:** `scheduler.ts`, `studyDay.ts` y `queue.ts` con tests en verde. Todavía sin Supabase. Commit.
3. **Supabase:** `schema.sql` con tablas, RLS, triggers y RPC. Guíame **paso a paso, de uno en uno**, para crear el proyecto, ejecutar el SQL, configurar auth y copiar URL + anon key a `.env.local`. Cliente tipado (genera o escribe los tipos TS de las tablas). Commit.
4. **Auth:** login, registro, recuperar contraseña y rutas protegidas. Comprueba que puedo entrar. Commit.
5. **Mazos y tarjetas:** CRUD de mazos, formulario de tarjetas y navegador. Commit.
6. **Sesión de repaso:** cola, calificación, intervalos en los botones, atajos, TTS, deshacer y cola offline. Commit.
7. **Importar / exportar:** con vista previa. Pruébalo con este ejemplo en formato Quizlet (tabulador entre columnas):
   ```
   What's my English level now compared ___ C1?	with
   I tried going ___ an entrepreneurship talk.	to
   My sister is four years ___ than me.	older
   I ___ B2 level during my degree.	reached
   We always meet ___ and tell each other how our weeks went.	up
   stunning	impresionante (más fuerte que "gorgeous")
   genuinely	de verdad, sinceramente
   mindset	mentalidad
   ```
8. **Estadísticas y ajustes.** Commit.
9. **PWA:** manifest, iconos y service worker. Prueba con `npm run build && npm run preview`. Commit.
10. **Despliegue en Netlify:** `netlify.toml` con `command = "npm run build"`, `publish = "dist"` y la redirección SPA `/* /index.html 200`. Guíame **de uno en uno** para subir el repo a GitHub, conectarlo a Netlify, añadir las variables de entorno y añadir la URL de Netlify en las Redirect URLs de Supabase. Después, cómo instalar la PWA en iPhone (Safari → Compartir → Añadir a pantalla de inicio) y en Android.
11. **README final:** qué es, stack, cómo arrancar en local, variables de entorno, cómo funciona el algoritmo, decisiones tomadas e ideas futuras. Añade un aviso: **en el plan gratuito, Supabase pausa los proyectos tras 7 días sin actividad.** Si estudio a diario no pasa, pero si ocurre se reactiva desde el panel.

---

## 10. Criterios de aceptación (comprueba cada uno antes de dar el trabajo por terminado)

- [ ] Puedo registrarme, iniciar sesión y cerrar sesión, y la sesión persiste al recargar y en la PWA instalada.
- [ ] Creo un mazo en el ordenador y aparece en el móvil tras recargar.
- [ ] Una tarjeta nueva pasa por los pasos 1 min → 10 min → 1 día con "Bien", y salta directamente a 4 días con "Fácil".
- [ ] Al fallar una tarjeta de repaso, baja el ease, suma un lapse y entra en reaprendizaje.
- [ ] Los botones muestran el intervalo correcto antes de pulsarlos.
- [ ] Se respeta el límite de nuevas por día y el día de estudio cambia a las 04:00.
- [ ] Deshacer funciona.
- [ ] Sin conexión, los repasos se guardan y se sincronizan al volver la red, sin duplicados.
- [ ] Importo el ejemplo de la fase 7 y se crean 8 tarjetas, con vista previa y detección de duplicados.
- [ ] Exporto e importo la copia JSON sin perder datos.
- [ ] El TTS lee en inglés en Chrome y en Safari iOS.
- [ ] Los datos de otro usuario son inaccesibles (verificado con un segundo usuario de prueba).
- [ ] `npm run build`, `npm run lint` y `npm test` pasan sin errores.
- [ ] Desplegada en Netlify, accesible por HTTPS, recargar cualquier ruta no da 404 e instalable como PWA.

Cuando termines, dame: la URL de producción, un resumen de lo construido, cualquier desviación de este prompt y los 3 siguientes pasos que recomendarías.
