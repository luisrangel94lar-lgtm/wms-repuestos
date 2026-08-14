import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

// SHA-256 hash (same as auth-helpers.ts)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('🔧 Creando Super Admin...')
  
  // Check if empresa exists, if not create one
  let empresa = await db.empresa.findFirst({ where: { nombre: 'Empresa Demo' } })
  if (!empresa) {
    empresa = await db.empresa.create({
      data: {
        nombre: 'Empresa Demo',
        nit: '900.123.456-7',
        direccion: 'Dirección de prueba',
        telefono: '3001234567',
        email: 'demo@empresa.com',
        plan: 'anual',
      },
    })
    console.log('✅ Empresa Demo creada (ID:', empresa.id, ')')
  } else {
    console.log('📋 Empresa existente (ID:', empresa.id, ')')
  }

  // Check if almacen exists, if not create one
  let almacen = await db.almacen.findFirst({ where: { nombre: 'Almacén Principal' } })
  if (!almacen) {
    almacen = await db.almacen.create({
      data: {
        nombre: 'Almacén Principal',
        direccion: 'Bodega 1',
        telefono: '3001234567',
        encargado: 'Super Admin',
        activo: true,
        empresaId: empresa.id,
      },
    })
    console.log('✅ Almacén Principal creado (ID:', almacen.id, ')')
  } else {
    console.log('📋 Almacén existente (ID:', almacen.id, ')')
  }

  // Create or update super admin
  const email = 'superadmin@wms.com'
  const password = 'SuperAdmin2024!'
  
  const existing = await db.usuario.findUnique({ where: { email } })
  
  if (existing) {
    // Update password and role
    await db.usuario.update({
      where: { id: existing.id },
      data: {
        password: hashPassword(password),
        rol: 'super_admin',
        empresaId: empresa.id,
        activo: true,
      },
    })
    console.log('✏️ Super Admin actualizado (ID:', existing.id, ')')
  } else {
    const admin = await db.usuario.create({
      data: {
        nombre: 'Super Admin',
        email,
        password: hashPassword(password),
        rol: 'super_admin',
        activo: true,
        empresaId: empresa.id,
      },
    })
    console.log('✅ Super Admin creado (ID:', admin.id, ')')
  }

  // Create default admin user for the demo empresa
  const adminEmail = 'admin@wms.com'
  const existingAdmin = await db.usuario.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    await db.usuario.create({
      data: {
        nombre: 'Admin Empresa',
        email: adminEmail,
        password: hashPassword('Admin2024!'),
        rol: 'admin',
        activo: true,
        empresaId: empresa.id,
        almacenId: almacen.id,
      },
    })
    console.log('✅ Admin de empresa creado')
  }

  console.log('')
  console.log('🎉 Listo! Puedes ingresar con:')
  console.log('   🔑 Super Admin: superadmin@wms.com / SuperAdmin2024!')
  console.log('   🔑 Admin:        admin@wms.com / Admin2024!')
  
  await db.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Error:', e)
  await db.$disconnect()
  process.exit(1)
})
