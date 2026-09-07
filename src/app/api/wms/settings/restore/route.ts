import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, resolveEmpresaId } from '@/lib/tenant'

interface BackupData {
  version: string
  exportedAt: string
  data: {
    marcas?: { nombre: string }[]
    categorias?: { nombre: string; categoriaPadre?: number | null }[]
    products?: {
      sku: string
      nombre: string
      descripcion?: string | null
      categoria?: string | null
      marca?: string | null
      codigoBarras?: string | null
      unidadMedida?: string
      costoUnitario?: number
      precioVenta?: number
      stockMinimo?: number
      activo?: boolean
    }[]
    equipment?: {
      modelo: string
      marca?: string | null
      tipoEquipo?: string | null
    }[]
    locations?: {
      pasillo: string
      estante: string
      nivel: string
      activo?: boolean
    }[]
    clients?: {
      nombre: string
      telefono?: string | null
      email?: string | null
      tipoCliente?: string
    }[]
    stock?: {
      productoSku: string
      locationIndex?: number
      cantidad: number
    }[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const backup: BackupData = await request.json()
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(user.rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const empresaId = resolveEmpresaId(user, (backup as BackupData & { empresaId?: number }).empresaId)
    if (!empresaId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 })
    const primaryWarehouse = await db.almacen.findFirst({ where: { empresaId, activo: true }, orderBy: { id: 'asc' } })

    if (!backup.version || !backup.data) {
      return NextResponse.json({ error: 'Formato de respaldo inválido' }, { status: 400 })
    }

    let imported = { products: 0, equipment: 0, locations: 0, clients: 0, stock: 0 }

    // Import locations first (needed for stock)
    if (backup.data.locations) {
      for (const loc of backup.data.locations) {
        const exists = await db.ubicacion.findFirst({
          where: { pasillo: loc.pasillo, estante: loc.estante, nivel: loc.nivel, almacen: { empresaId } },
        })
        if (!exists) {
          await db.ubicacion.create({
            data: {
              pasillo: loc.pasillo,
              estante: loc.estante,
              nivel: loc.nivel,
              activo: loc.activo ?? true,
              almacenId: primaryWarehouse?.id ?? null,
            },
          })
          imported.locations++
        }
      }
    }

    // Import clients
    if (backup.data.clients) {
      for (const c of backup.data.clients) {
        const exists = await db.cliente.findFirst({
          where: { nombre: c.nombre, telefono: c.telefono ?? undefined, empresaId },
        })
        if (!exists) {
          await db.cliente.create({
            data: {
              empresaId,
              nombre: c.nombre,
              telefono: c.telefono ?? null,
              email: c.email ?? null,
              tipoCliente: c.tipoCliente ?? 'Tecnico',
            },
          })
          imported.clients++
        }
      }
    }

    // Import products
    if (backup.data.products) {
      for (const p of backup.data.products) {
        const exists = await db.producto.findUnique({ where: { empresaId_sku: { empresaId, sku: p.sku } } })
        if (exists) continue

        let idCategoria: number | null = null
        if (p.categoria) {
          const cat = await db.categoria.findFirst({ where: { nombre: p.categoria } })
          if (cat) idCategoria = cat.id
        }

        let idMarca: number | null = null
        if (p.marca) {
          const brand = await db.marca.findFirst({ where: { nombre: p.marca } })
          if (brand) idMarca = brand.id
        }

        await db.producto.create({
          data: {
            empresaId,
            sku: p.sku,
            nombre: p.nombre,
            descripcion: p.descripcion ?? null,
            idCategoria,
            idMarca,
            codigoBarras: p.codigoBarras ?? null,
            unidadMedida: p.unidadMedida ?? 'unidad',
            costoUnitario: p.costoUnitario ?? 0,
            precioVenta: p.precioVenta ?? 0,
            stockMinimo: p.stockMinimo ?? 0,
            activo: p.activo ?? true,
          },
        })
        imported.products++
      }
    }

    // Import equipment
    if (backup.data.equipment) {
      for (const eq of backup.data.equipment) {
        const exists = await db.equipo.findFirst({ where: { modelo: eq.modelo } })
        if (exists) continue

        let idMarca = 1
        if (eq.marca) {
          const brand = await db.marca.findFirst({ where: { nombre: eq.marca } })
          if (brand) idMarca = brand.id
        }

        await db.equipo.create({
          data: {
            idMarca,
            modelo: eq.modelo,
            tipoEquipo: eq.tipoEquipo ?? null,
          },
        })
        imported.equipment++
      }
    }

    // Import stock entries
    if (backup.data.stock) {
      for (const s of backup.data.stock) {
        if (!s.productoSku) continue
        const product = await db.producto.findUnique({ where: { empresaId_sku: { empresaId, sku: s.productoSku } } })
        if (!product) continue

        const existingStock = await db.stock.findFirst({
          where: { idProducto: product.id, idUbicacion: s.locationIndex ?? 1 },
        })
        if (!existingStock && s.cantidad > 0) {
          const locExists = await db.ubicacion.findUnique({ where: { id: s.locationIndex ?? 1 } })
          const targetLoc = locExists ? s.locationIndex ?? 1 : (await db.ubicacion.findFirst({ where: { activo: true } }))?.id
          if (targetLoc) {
            await db.stock.create({
              data: { idProducto: product.id, idUbicacion: targetLoc, cantidad: s.cantidad },
            })
            imported.stock++
          }
        }
      }
    }

    return NextResponse.json({ imported })
  } catch (error: unknown) {
    console.error('Restore error:', error)
    const msg = error instanceof Error ? error.message : 'Error al restaurar datos'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
