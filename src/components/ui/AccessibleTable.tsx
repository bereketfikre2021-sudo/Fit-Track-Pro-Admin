/**
 * AccessibleTable.tsx
 *
 * Visually hidden table rendered alongside charts for screen reader users.
 * Satisfies WCAG 2.1 SC 1.1.1 (non-text content) and SC 1.3.1 (info and relationships).
 */

interface AccessibleTableProps {
  caption: string
  headers: string[]
  rows: (string | number)[][]
}

export function AccessibleTable({ caption, headers, rows }: AccessibleTableProps) {
  return (
    <table className="sr-only" aria-label={caption}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} scope="col">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
