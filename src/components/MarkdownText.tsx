import { Fragment, type ReactNode } from 'react'

// Supports **bold**, *italic*, and line breaks only. Builds React nodes directly (never
// dangerouslySetInnerHTML), so there is no way for arbitrary HTML in a card to execute.
// Uses matchAll (not exec + manual lastIndex resets) so this shared, module-level regex never
// gets mutated by a render — matchAll clones it internally.
const TOKEN_RE = /\*\*(.+?)\*\*|\*(.+?)\*|\n/g

export function MarkdownText({ text }: { text: string }) {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(TOKEN_RE)) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>)
    }
    if (match[0] === '\n') {
      nodes.push(<br key={key++} />)
    } else if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>)
    } else if (match[2] !== undefined) {
      nodes.push(<em key={key++}>{match[2]}</em>)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key}>{text.slice(lastIndex)}</Fragment>)
  }

  return <>{nodes}</>
}
