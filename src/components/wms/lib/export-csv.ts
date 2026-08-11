export interface CsvColumn {
  key: string
  label: string
  format?: 'currency' | 'date'
}

/**
 * Export an array of objects to a CSV file with UTF-8 BOM for Excel compatibility.
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  columns: CsvColumn[],
) {
  // UTF-8 BOM for Excel to recognize Spanish characters
  const BOM = '\uFEFF'

  // Header row
  const header = columns.map((c) => csvEscape(c.label)).join(',')

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        let value = row[col.key]

        // Format currency columns with $ prefix
        if (col.format === 'currency' && value != null) {
          const num = typeof value === 'string' ? parseFloat(value) : value
          value = '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }

        // Format date columns as dd/mm/yyyy
        if (col.format === 'date' && value != null) {
          const d = new Date(value)
          if (!isNaN(d.getTime())) {
            value = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
          }
        }

        return csvEscape(value ?? '')
      })
      .join(','),
  )

  const csvContent = BOM + header + '\n' + rows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function csvEscape(value: string | number | boolean): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
