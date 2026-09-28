import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTenantUser, resolveEmpresaId } from '@/lib/tenant'
import { readImportTable } from '@/lib/import-spreadsheet'

export async function POST(request: NextRequest) {
  try {
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(user.rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const formData = await request.formData()
    const empresaId = resolveEmpresaId(user, formData.get('empresaId'))
    if (!empresaId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 })
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })

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
    if (!headers.includes('nombre')) return NextResponse.json({ error: 'Columna obligatoria faltante: nombre' }, { status: 400 })

    let imported = 0
    let skipped = 0
    const errors: string[] = []
    for (let index = 0; index < rows.length; index++) {
      const values = rows[index]
      const row = Object.fromEntries(headers.map((header, column) => [header, (values[column] ?? '').trim()]))
      if (!row.nombre) {
        errors.push(`Fila ${index + 2}: nombre vacío`)
        continue
      }
      if (row.nombre.toUpperCase() === 'CLIENTE DE EJEMPLO') {
        skipped++
        continue
      }

      const duplicate = await db.cliente.findFirst({
        where: row.email
          ? { empresaId, email: { equals: row.email, mode: 'insensitive' } }
          : { empresaId, nombre: { equals: row.nombre, mode: 'insensitive' }, telefono: row.telefono || null },
      })
      if (duplicate) {
        skipped++
        continue
      }

      const allowedTypes = ['Tecnico', 'Empresa', 'Particular']
      const requestedType = row.tipocliente || 'Tecnico'
      const tipoCliente = allowedTypes.find((type) => type.toLowerCase() === requestedType.toLowerCase()) ?? 'Tecnico'
      await db.cliente.create({
        data: { empresaId, nombre: row.nombre, telefono: row.telefono || null, email: row.email || null, tipoCliente },
      })
      imported++
    }

    return NextResponse.json({ imported, skipped, errors })
  } catch (error) {
    console.error('Clientes spreadsheet import error:', error)
    return NextResponse.json({ error: 'Error al importar clientes' }, { status: 500 })
  }
}
