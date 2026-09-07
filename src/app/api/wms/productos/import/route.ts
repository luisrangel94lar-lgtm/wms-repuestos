import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageCatalog, getTenantUser, resolveEmpresaId } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!canManageCatalog(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const empresaId = resolveEmpresaId(user, formData.get('empresaId'))
    if (!empresaId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 })
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV vacío o sin datos' }, { status: 400 })
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const expectedHeaders = [
      'sku', 'nombre', 'descripcion', 'categoria', 'marca',
      'unidadmedida', 'costounitario', 'precioventa', 'stockminimo', 'activo',
    ]
    for (const expected of expectedHeaders) {
      if (!headers.includes(expected)) {
        return NextResponse.json(
          { error: `Columna faltante en CSV: ${expected}` },
          { status: 400 }
        )
      }
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i])
      if (values.length !== headers.length) {
        errors.push(`Fila ${i + 1}: número de columnas incorrecto (${values.length} vs ${headers.length})`)
        continue
      }

      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = (values[idx] ?? '').trim()
      })

      const sku = row['sku']
      if (!sku) {
        errors.push(`Fila ${i + 1}: SKU vacío`)
        continue
      }

      // Check if SKU already exists
      const existing = await db.producto.findUnique({ where: { empresaId_sku: { empresaId, sku } } })
      if (existing) {
        skipped++
        continue
      }

      // Resolve category by name
      let idCategoria: number | null = null
      if (row['categoria']) {
        const cat = await db.categoria.findFirst({
          where: { nombre: row['categoria'] },
        })
        if (cat) idCategoria = cat.id
      }

      // Resolve brand by name
      let idMarca: number | null = null
      if (row['marca']) {
        const brand = await db.marca.findFirst({
          where: { nombre: row['marca'] },
        })
        if (brand) idMarca = brand.id
      }

      const costoUnitario = parseFloat(row['costounitario'] || '0') || 0
      const precioVenta = parseFloat(row['precioventa'] || '0') || 0
      const stockMinimo = parseInt(row['stockminimo'] || '0', 10) || 0
      const activo = row['activo']?.toLowerCase() !== 'false' && row['activo'] !== '0'

      await db.producto.create({
        data: {
          empresaId,
          sku,
          nombre: row['nombre'] || 'Sin nombre',
          descripcion: row['descripcion'] || null,
          idCategoria,
          idMarca,
          unidadMedida: row['unidadmedida'] || 'unidad',
          costoUnitario,
          precioVenta,
          stockMinimo,
          activo,
        },
      })
      imported++
    }

    return NextResponse.json({ imported, skipped, errors })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: 'Error al importar CSV' }, { status: 500 })
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}
