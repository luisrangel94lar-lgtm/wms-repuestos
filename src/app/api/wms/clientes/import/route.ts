import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTenantUser, resolveEmpresaId } from '@/lib/tenant'

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

    const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) return NextResponse.json({ error: 'CSV vacío o sin datos' }, { status: 400 })

    const headers = parseCsvLine(lines[0]).map((header, index) =>
      (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim().toLowerCase()
    )
    if (!headers.includes('nombre')) return NextResponse.json({ error: 'Columna faltante: nombre' }, { status: 400 })

    let imported = 0
    let skipped = 0
    const errors: string[] = []
    for (let index = 1; index < lines.length; index++) {
      const values = parseCsvLine(lines[index])
      const row = Object.fromEntries(headers.map((header, column) => [header, (values[column] ?? '').trim()]))
      if (!row.nombre) {
        errors.push(`Fila ${index + 1}: nombre vacío`)
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
    console.error('Clientes CSV import error:', error)
    return NextResponse.json({ error: 'Error al importar clientes' }, { status: 500 })
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"' && quoted && line[index + 1] === '"') {
      current += '"'
      index++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}
