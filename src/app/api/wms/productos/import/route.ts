import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageCatalog, getTenantUser, resolveEmpresaId } from '@/lib/tenant'
import { readImportTable } from '@/lib/import-spreadsheet'

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

    let importTable
    try {
      importTable = await readImportTable(file)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'No se pudo leer el archivo' },
        { status: 400 },
      )
    }

    const { headers, rows } = importTable
    const expectedHeaders = ['sku', 'nombre']
    for (const expected of expectedHeaders) {
      if (!headers.includes(expected)) {
        return NextResponse.json(
          { error: `Columna obligatoria faltante: ${expected}` },
          { status: 400 }
        )
      }
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i]
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = (values[idx] ?? '').trim()
      })

      const sku = row['sku']
      if (!sku) {
        errors.push(`Fila ${i + 2}: SKU vacío`)
        continue
      }
      if (sku.toUpperCase() === 'EJEMPLO-BORRAR') {
        skipped++
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
      const activeValue = row['activo']?.trim().toLowerCase()
      const activo = !['false', '0', 'no', 'inactivo'].includes(activeValue)

      await db.producto.create({
        data: {
          empresaId,
          sku,
          nombre: row['nombre'] || 'Sin nombre',
          descripcion: row['descripcion'] || null,
          idCategoria,
          idMarca,
          codigoBarras: row['codigobarras'] || null,
          unidadMedida: row['unidadmedida'] || 'unidad',
          costoUnitario,
          precioVenta,
          stockMinimo,
          stockMaximo: row['stockmaximo'] ? parseInt(row['stockmaximo'], 10) || null : null,
          activo,
        },
      })
      imported++
    }

    return NextResponse.json({ imported, skipped, errors })
  } catch (error) {
    console.error('Spreadsheet import error:', error)
    return NextResponse.json({ error: 'Error al importar el archivo' }, { status: 500 })
  }
}
