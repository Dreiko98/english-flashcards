import type { ReactNode } from 'react'

interface StepSectionProps {
  title: string
  children: ReactNode
}

function StepSection({ title, children }: StepSectionProps) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  )
}

export function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ayuda</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Guía rápida de cómo usar la app, de principio a fin.
        </p>
      </div>

      <StepSection title="1. Crea tu primer mazo">
        <p>
          En <strong>Inicio</strong>, pulsa <strong>+ Nuevo mazo</strong>. Dale un nombre (p. ej.
          "Vocabulario C1") y elige cuántas tarjetas nuevas quieres ver como máximo cada día.
        </p>
      </StepSection>

      <StepSection title="2. Añade tarjetas">
        <p>Tienes dos formas de hacerlo:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Una a una:</strong> desde <strong>Navegar → + Nueva tarjeta</strong>. Escribe
            anverso y reverso; "Guardar y añadir otra" (o Ctrl/Cmd + Enter) te deja seguir añadiendo
            sin perder el mazo seleccionado.
          </li>
          <li>
            <strong>En lote:</strong> desde <strong>Importar</strong>, pega texto copiado de Quizlet
            o sube un archivo .txt/.csv/.tsv. Verás una vista previa antes de confirmar, y las
            tarjetas repetidas se detectan automáticamente.
          </li>
        </ul>
      </StepSection>

      <StepSection title="3. Estudia cada día">
        <p>
          Pulsa <strong>Repasar</strong> (o "Estudiar" en un mazo concreto desde Inicio). Mira el
          anverso, pulsa <strong>Mostrar respuesta</strong> (o la barra espaciadora) y califica con
          uno de los 4 botones:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Otra vez</strong> — no te la sabías, vuelve a aparecer pronto.
          </li>
          <li>
            <strong>Difícil</strong> — te costó, el intervalo crece poco.
          </li>
          <li>
            <strong>Bien</strong> — la sabías, intervalo normal.
          </li>
          <li>
            <strong>Fácil</strong> — demasiado fácil, intervalo más largo.
          </li>
        </ul>
        <p>Atajos de teclado (en ordenador):</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Espacio / Enter</strong> — mostrar respuesta, o calificar "Bien"
          </li>
          <li>
            <strong>1 2 3 4</strong> — calificar (Otra vez / Difícil / Bien / Fácil)
          </li>
          <li>
            <strong>R</strong> — escuchar la pronunciación
          </li>
          <li>
            <strong>E</strong> — editar la tarjeta actual
          </li>
          <li>
            <strong>Z</strong> — deshacer la última respuesta
          </li>
        </ul>
        <p>
          Si se corta la conexión a mitad de un repaso, no pasa nada: se guarda en tu móvil/
          ordenador y se sincroniza solo en cuanto vuelve la red (verás un aviso de
          "Sincronizando…").
        </p>
      </StepSection>

      <StepSection title="4. Revisa y edita tus tarjetas">
        <p>
          En <strong>Navegar</strong> puedes buscar por texto, filtrar por mazo, estado o etiqueta,
          y por cada tarjeta: editarla, suspenderla (deja de salir en los repasos), reiniciarla
          (vuelve a "nueva") o eliminarla. Selecciona varias para mover, suspender o eliminar en
          lote.
        </p>
      </StepSection>

      <StepSection title="5. Sigue tu progreso">
        <p>
          En <strong>Estadísticas</strong> verás tu racha de días seguidos, repasos de los últimos
          30 días, cuántas tarjetas vencen en los próximos 14 días y tu % de aciertos.
        </p>
      </StepSection>

      <StepSection title="6. Ajusta la app a tu gusto">
        <p>
          En <strong>Ajustes</strong>: tema claro/oscuro/sistema, si quieres que se lea la respuesta
          en voz alta automáticamente, qué voz en inglés prefieres, y cerrar sesión.
        </p>
      </StepSection>

      <StepSection title="7. Instálala en el móvil">
        <p>
          <strong>iPhone (Safari):</strong> icono Compartir → Añadir a pantalla de inicio.
        </p>
        <p>
          <strong>Android (Chrome):</strong> menú (⋮) → Instalar aplicación / Añadir a pantalla de
          inicio.
        </p>
        <p>Se abrirá en pantalla completa, como una app nativa.</p>
      </StepSection>

      <StepSection title="8. Copia de seguridad">
        <p>
          Desde <strong>Importar → Copia de seguridad completa</strong> puedes exportar todos tus
          mazos, tarjetas e historial a un archivo JSON, y restaurarlo cuando quieras (siempre crea
          copias nuevas, nunca sobrescribe lo que ya tienes).
        </p>
      </StepSection>
    </div>
  )
}
