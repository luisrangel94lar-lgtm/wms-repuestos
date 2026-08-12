import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('Seeding auth data...')

  const existingAdmin = await db.usuario.findUnique({ where: { email: 'admin@almacen.com' } })
  if (!existingAdmin) {
    const hashedPassword = hashPassword('admin123')
    await db.usuario.create({
      data: {
        nombre: 'Administrador',
        email: 'admin@almacen.com',
        password: hashedPassword,
        rol: 'admin',
        activo: true,
      },
    })
    console.log('✅ Admin user created: admin@almacen.com / admin123')
  } else {
    console.log('ℹ️  Admin user already exists')
  }

  const existingLicense = await db.licencia.findFirst()
  if (!existingLicense) {
    const now = new Date()
    await db.licencia.create({
      data: {
        clave: 'TRIAL-2024-WMS-DEMO',
        tipo: 'trial',
        estado: 'activa',
        fechaActivacion: now,
        fechaVencimiento: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        maxUsuarios: 3,
        diasPrueba: 30,
      },
    })
    console.log('✅ Trial license created (30 days)')
  } else {
    console.log('ℹ️  License already exists')
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
