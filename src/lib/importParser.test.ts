import { describe, expect, it } from 'vitest'
import { markDuplicates, parseImportText } from './importParser'

const QUIZLET_SAMPLE = [
  "What's my English level now compared ___ C1?\twith",
  'I tried going ___ an entrepreneurship talk.\tto',
  'My sister is four years ___ than me.\tolder',
  'I ___ B2 level during my degree.\treached',
  'We always meet ___ and tell each other how our weeks went.\tup',
  'stunning\timpresionante (más fuerte que "gorgeous")',
  'genuinely\tde verdad, sinceramente',
  'mindset\tmentalidad',
].join('\n')

describe('parseImportText', () => {
  it('parses the Quizlet tab-separated sample from the prompt into 8 cards', () => {
    const rows = parseImportText(QUIZLET_SAMPLE, {
      fieldSeparator: '\t',
      cardSeparator: '\n',
      hasExample: false,
      hasNotes: false,
    })
    expect(rows).toHaveLength(8)
    expect(rows[0]).toEqual({
      front: "What's my English level now compared ___ C1?",
      back: 'with',
      example: undefined,
      notes: undefined,
    })
    expect(rows[5]).toEqual({
      front: 'stunning',
      back: 'impresionante (más fuerte que "gorgeous")',
      example: undefined,
      notes: undefined,
    })
  })

  it('supports comma and semicolon field separators', () => {
    const comma = parseImportText('front1,back1\nfront2,back2', {
      fieldSeparator: ',',
      cardSeparator: '\n',
      hasExample: false,
      hasNotes: false,
    })
    expect(comma).toEqual([
      { front: 'front1', back: 'back1', example: undefined, notes: undefined },
      { front: 'front2', back: 'back2', example: undefined, notes: undefined },
    ])

    const semicolon = parseImportText('front1;back1', {
      fieldSeparator: ';',
      cardSeparator: '\n',
      hasExample: false,
      hasNotes: false,
    })
    expect(semicolon).toEqual([
      { front: 'front1', back: 'back1', example: undefined, notes: undefined },
    ])
  })

  it('supports a custom card separator', () => {
    const rows = parseImportText('front1\tback1;;front2\tback2', {
      fieldSeparator: '\t',
      cardSeparator: ';;',
      hasExample: false,
      hasNotes: false,
    })
    expect(rows).toHaveLength(2)
    expect(rows[1].front).toBe('front2')
  })

  it('reads an optional example column when enabled', () => {
    const rows = parseImportText('front1\tback1\tan example sentence', {
      fieldSeparator: '\t',
      cardSeparator: '\n',
      hasExample: true,
      hasNotes: false,
    })
    expect(rows[0]).toEqual({
      front: 'front1',
      back: 'back1',
      example: 'an example sentence',
      notes: undefined,
    })
  })

  it('reads optional example and notes columns together, in order', () => {
    const rows = parseImportText('front1\tback1\tthe example\tsome notes', {
      fieldSeparator: '\t',
      cardSeparator: '\n',
      hasExample: true,
      hasNotes: true,
    })
    expect(rows[0]).toEqual({
      front: 'front1',
      back: 'back1',
      example: 'the example',
      notes: 'some notes',
    })
  })

  it('skips blank lines and rows missing a front or back', () => {
    const rows = parseImportText('front1\tback1\n\n\tback-only\nfront-only\t\n  \n', {
      fieldSeparator: '\t',
      cardSeparator: '\n',
      hasExample: false,
      hasNotes: false,
    })
    expect(rows).toEqual([{ front: 'front1', back: 'back1', example: undefined, notes: undefined }])
  })

  it('trims whitespace around each field', () => {
    const rows = parseImportText('  front1  \t  back1  ', {
      fieldSeparator: '\t',
      cardSeparator: '\n',
      hasExample: false,
      hasNotes: false,
    })
    expect(rows[0]).toEqual({
      front: 'front1',
      back: 'back1',
      example: undefined,
      notes: undefined,
    })
  })
})

describe('markDuplicates', () => {
  it('flags rows whose front already exists in the target deck, case-insensitively', () => {
    const rows = parseImportText('Hello\thola\nWorld\tmundo', {
      fieldSeparator: '\t',
      cardSeparator: '\n',
      hasExample: false,
      hasNotes: false,
    })
    const result = markDuplicates(rows, ['hello'])
    expect(result[0]).toMatchObject({ front: 'Hello', isDuplicate: true })
    expect(result[1]).toMatchObject({ front: 'World', isDuplicate: false })
  })

  it('flags repeated fronts within the same batch, not just against existing cards', () => {
    const rows = parseImportText('dup\ta\ndup\tb', {
      fieldSeparator: '\t',
      cardSeparator: '\n',
      hasExample: false,
      hasNotes: false,
    })
    const result = markDuplicates(rows, [])
    expect(result[0].isDuplicate).toBe(false)
    expect(result[1].isDuplicate).toBe(true)
  })
})
