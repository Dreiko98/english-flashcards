export interface ImportOptions {
  fieldSeparator: string
  cardSeparator: string
  hasExample: boolean
  hasNotes: boolean
}

export interface ParsedImportRow {
  front: string
  back: string
  example?: string
  notes?: string
}

export interface ParsedImportRowWithDuplicate extends ParsedImportRow {
  isDuplicate: boolean
}

export function parseImportText(text: string, options: ImportOptions): ParsedImportRow[] {
  const { fieldSeparator, cardSeparator, hasExample, hasNotes } = options
  if (!fieldSeparator || !cardSeparator) return []

  return text
    .split(cardSeparator)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.split(fieldSeparator).map((col) => col.trim())
      const front = columns[0] ?? ''
      const back = columns[1] ?? ''
      const example = hasExample ? columns[2] : undefined
      const notes = hasNotes ? columns[hasExample ? 3 : 2] : undefined
      return {
        front,
        back,
        example: example || undefined,
        notes: notes || undefined,
      }
    })
    .filter((row) => row.front && row.back)
}

/**
 * Flags duplicates against both the target deck's existing cards and earlier rows in the same
 * batch (so pasting the same line twice is caught too, not just collisions with the database).
 */
export function markDuplicates(
  rows: ParsedImportRow[],
  existingFronts: Iterable<string>,
): ParsedImportRowWithDuplicate[] {
  const seen = new Set(Array.from(existingFronts, (front) => front.toLowerCase()))
  return rows.map((row) => {
    const key = row.front.toLowerCase()
    const isDuplicate = seen.has(key)
    seen.add(key)
    return { ...row, isDuplicate }
  })
}
