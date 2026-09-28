import { readSheet } from 'read-excel-file/node'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_DATA_ROWS = 5000

const headerAliases: Record<string, string> = {
  codigodebarras: 'codigobarras',
  correoelectronico: 'email',
  correoelectronicoemail: 'email',
  preciodeventa: 'precioventa',
  tipodecliente: 'tipocliente',
  unidaddemedida: 'unidadmedida',
}

export type ImportTable = {
  headers: string[]
  rows: string[][]
  format: 'xlsx' | 'csv'
}

export async function readImportTable(file: File): Promise<ImportTable> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo supera el límite de 5 MB')
  }

  const extension = file.name.toLowerCase().split('.').pop()
  const parsed = extension === 'xlsx'
    ? await readXlsx(file)
    : extension === 'csv'
      ? await readCsv(file)
      : null

  if (!parsed) {
    throw new Error('Formato no permitido. Usa un archivo Excel (.xlsx) o CSV (.csv)')
  }

  if (parsed.rows.length === 0) {
    throw new Error('El archivo está vacío o no contiene registros')
  }
  if (parsed.rows.length > MAX_DATA_ROWS) {
    throw new Error(`El archivo contiene más de ${MAX_DATA_ROWS.toLocaleString('es-CO')} registros`)
  }

  return parsed
}

export function normalizeHeader(value: string): string {
  const normalized = value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  return headerAliases[normalized] ?? normalized
}

function cleanRows(rows: string[][]): string[][] {
  return rows.filter((row) => row.some((value) => value.trim() !== ''))
}

async function readXlsx(file: File): Promise<ImportTable> {
  const parsedRows = await readSheet(Buffer.from(await file.arrayBuffer()))
  const allRows = parsedRows.map((row) => row.map(cellValueToString))

  const [rawHeaders = [], ...rawRows] = cleanRows(allRows)
  return {
    headers: rawHeaders.map(normalizeHeader),
    rows: cleanRows(rawRows),
    format: 'xlsx',
  }
}

function cellValueToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'string') return value.trim()
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

async function readCsv(file: File): Promise<ImportTable> {
  const text = await file.text()
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = countCharacter(firstLine, ';') > countCharacter(firstLine, ',') ? ';' : ','
  const [rawHeaders = [], ...rawRows] = cleanRows(parseDelimitedText(text, delimiter))

  return {
    headers: rawHeaders.map(normalizeHeader),
    rows: cleanRows(rawRows),
    format: 'csv',
  }
}

function countCharacter(value: string, character: string): number {
  return [...value].filter((current) => current === character).length
}

function parseDelimitedText(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (character === '"' && quoted && text[index + 1] === '"') {
      current += '"'
      index++
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === delimiter && !quoted) {
      row.push(current)
      current = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index++
      row.push(current)
      rows.push(row)
      row = []
      current = ''
    } else {
      current += character
    }
  }

  if (current || row.length > 0) {
    row.push(current)
    rows.push(row)
  }

  return rows
}
