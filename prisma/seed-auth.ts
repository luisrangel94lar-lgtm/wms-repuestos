import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('Seeding auth data...')

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@almacen.com').toLowerCase()
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD debe tener al menos 12 caracteres')
  }

  const existingAdmin = await db.usuario.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 12)
    await db.usuario.create({
      data: {
        nombre: 'Administrador',
        email: adminEmail,
        password: hashedPassword,
        rol: 'admin',
        activo: true,
      },
    })
    console.log(`✅ Admin user created: ${adminEmail}`)
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
