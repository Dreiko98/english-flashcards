import { useRef, useState, type ChangeEvent } from 'react'
import { useDeckOptions } from '@/hooks/useDeckOptions'
import {
  bulkCreateCards,
  exportBackupJson,
  exportDeckCsv,
  getExistingFronts,
  restoreBackup,
  type BackupData,
} from '@/lib/api/importExport'
import { downloadFile } from '@/lib/download'
import { inputClassName, primaryButtonClassName } from '@/lib/formStyles'
import {
  markDuplicates,
  parseImportText,
  type ParsedImportRowWithDuplicate,
} from '@/lib/importParser'

type FieldSeparatorPreset = 'tab' | ',' | ';' | 'custom'
type CardSeparatorPreset = 'newline' | 'custom'

export function ImportPage() {
  const { decks } = useDeckOptions()

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <h1 className="text-2xl font-bold">Importar / exportar</h1>
      <ImportSection decks={decks} />
      <ExportSection decks={decks} />
      <BackupSection />
    </div>
  )
}

function ImportSection({ decks }: { decks: { id: string; name: string }[] }) {
  const [deckId, setDeckId] = useState('')
  const [text, setText] = useState('')
  const [fieldPreset, setFieldPreset] = useState<FieldSeparatorPreset>('tab')
  const [fieldCustom, setFieldCustom] = useState('')
  const [cardPreset, setCardPreset] = useState<CardSeparatorPreset>('newline')
  const [cardCustom, setCardCustom] = useState('')
  const [hasExample, setHasExample] = useState(false)
  const [hasNotes, setHasNotes] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [preview, setPreview] = useState<ParsedImportRowWithDuplicate[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fieldSeparator =
    fieldPreset === 'custom' ? fieldCustom : fieldPreset === 'tab' ? '\t' : fieldPreset
  const cardSeparator = cardPreset === 'custom' ? cardCustom : '\n'

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  async function handlePreview() {
    setError(null)
    setResult(null)
    if (!deckId) {
      setError('Elige un mazo de destino.')
      return
    }
    const rows = parseImportText(text, { fieldSeparator, cardSeparator, hasExample, hasNotes })
    if (rows.length === 0) {
      setError('No se ha encontrado ninguna tarjeta válida con esta configuración.')
      setPreview(null)
      return
    }
    try {
      const existingFronts = await getExistingFronts(deckId)
      setPreview(markDuplicates(rows, existingFronts))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comprobar duplicados.')
    }
  }

  async function handleImport() {
    if (!preview || !deckId) return
    setImporting(true)
    setError(null)
    try {
      const rowsToImport = skipDuplicates ? preview.filter((row) => !row.isDuplicate) : preview
      await bulkCreateCards(deckId, rowsToImport)
      setResult(`Se han importado ${rowsToImport.length} tarjeta(s).`)
      setPreview(null)
      setText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar.')
    } finally {
      setImporting(false)
    }
  }

  const duplicateCount = preview?.filter((row) => row.isDuplicate).length ?? 0

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Importar tarjetas</h2>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
        >
          {error}
        </p>
      )}
      {result && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
          {result}
        </p>
      )}

      <div className="mb-4">
        <label htmlFor="import-deck" className="block text-sm font-medium">
          Mazo de destino
        </label>
        <select
          id="import-deck"
          value={deckId}
          onChange={(e) => setDeckId(e.target.value)}
          className={inputClassName}
        >
          <option value="" disabled>
            Elige un mazo
          </option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="import-file" className="block text-sm font-medium">
          Archivo (.txt, .csv, .tsv) o pega el texto abajo
        </label>
        <input
          id="import-file"
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.tsv,text/plain,text/csv,text/tab-separated-values"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm"
        />
      </div>

      <div className="mb-4">
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'anverso\treverso\nanverso\treverso'}
          className={inputClassName}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="field-sep" className="block text-sm font-medium">
            Separador de columnas
          </label>
          <select
            id="field-sep"
            value={fieldPreset}
            onChange={(e) => setFieldPreset(e.target.value as FieldSeparatorPreset)}
            className={inputClassName}
          >
            <option value="tab">Tabulador</option>
            <option value=",">Coma</option>
            <option value=";">Punto y coma</option>
            <option value="custom">Personalizado</option>
          </select>
          {fieldPreset === 'custom' && (
            <input
              value={fieldCustom}
              onChange={(e) => setFieldCustom(e.target.value)}
              placeholder="p. ej. |"
              className={`${inputClassName} mt-2`}
            />
          )}
        </div>
        <div>
          <label htmlFor="card-sep" className="block text-sm font-medium">
            Separador de tarjetas
          </label>
          <select
            id="card-sep"
            value={cardPreset}
            onChange={(e) => setCardPreset(e.target.value as CardSeparatorPreset)}
            className={inputClassName}
          >
            <option value="newline">Salto de línea</option>
            <option value="custom">Personalizado</option>
          </select>
          {cardPreset === 'custom' && (
            <input
              value={cardCustom}
              onChange={(e) => setCardCustom(e.target.value)}
              placeholder="p. ej. ;;"
              className={`${inputClassName} mt-2`}
            />
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasExample}
            onChange={(e) => setHasExample(e.target.checked)}
          />
          Incluye columna de ejemplo
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasNotes}
            onChange={(e) => setHasNotes(e.target.checked)}
          />
          Incluye columna de notas
        </label>
      </div>

      <button type="button" onClick={() => void handlePreview()} className={primaryButtonClassName}>
        Vista previa
      </button>

      {preview && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {preview.length} tarjeta(s) encontradas
              {duplicateCount > 0 && `, ${duplicateCount} duplicada(s)`}
            </p>
            {duplicateCount > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                Omitir duplicados
              </label>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <tbody>
                {preview.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 last:border-0 dark:border-slate-900 ${
                      row.isDuplicate ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="p-2">{row.front}</td>
                    <td className="p-2">{row.back}</td>
                    <td className="p-2 text-xs text-amber-600 dark:text-amber-400">
                      {row.isDuplicate ? 'duplicada' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={() => void handleImport()}
            className={`${primaryButtonClassName} mt-4`}
          >
            {importing ? 'Importando…' : 'Confirmar importación'}
          </button>
        </div>
      )}
    </section>
  )
}

function ExportSection({ decks }: { decks: { id: string; name: string }[] }) {
  const [deckId, setDeckId] = useState('')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    if (!deckId) return
    setExporting(true)
    setError(null)
    try {
      const csv = await exportDeckCsv(deckId)
      const deckName = decks.find((d) => d.id === deckId)?.name ?? 'mazo'
      downloadFile(`${deckName}.csv`, csv, 'text/csv;charset=utf-8')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Exportar un mazo a CSV</h2>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <select
          value={deckId}
          onChange={(e) => setDeckId(e.target.value)}
          className={inputClassName}
        >
          <option value="" disabled>
            Elige un mazo
          </option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!deckId || exporting}
          onClick={() => void handleExport()}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>
    </section>
  )
}

function BackupSection() {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExportBackup() {
    setWorking(true)
    setError(null)
    setResult(null)
    try {
      const backup = await exportBackupJson()
      downloadFile(
        `flashcards-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar la copia de seguridad.')
    } finally {
      setWorking(false)
    }
  }

  function handleRestoreFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setWorking(true)
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      void (async () => {
        try {
          const backup = JSON.parse(String(reader.result ?? '{}')) as BackupData
          const summary = await restoreBackup(backup)
          setResult(
            `Restaurados ${summary.decks} mazo(s), ${summary.cards} tarjeta(s) y ${summary.logs} repaso(s).`,
          )
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'El archivo no es una copia de seguridad válida.',
          )
        } finally {
          setWorking(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      })()
    }
    reader.readAsText(file)
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Copia de seguridad completa</h2>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {result && <p className="mb-3 text-sm text-green-700 dark:text-green-400">{result}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={working}
          onClick={() => void handleExportBackup()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          Exportar copia de seguridad (JSON)
        </button>
        <label className="text-sm">
          Restaurar desde JSON:{' '}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            disabled={working}
            onChange={handleRestoreFile}
            className="inline-block"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Restaurar siempre crea mazos y tarjetas nuevos (no sobrescribe los existentes), para no
        perder datos por accidente.
      </p>
    </section>
  )
}
