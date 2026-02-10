export type CsvValue = string | number | boolean | null | undefined
export type CsvRow = Record<string, CsvValue>

function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return ''

  const stringValue = String(value)
  const needsQuotes =
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')

  if (!needsQuotes) {
    return stringValue
  }

  return `"${stringValue.replace(/"/g, '""')}"`
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const csvLines: string[] = [
    headers.map((header) => escapeCsvValue(header)).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ]

  const csvContent = '\uFEFF' + csvLines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
