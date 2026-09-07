import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { hashPassword, needsPasswordUpgrade, verifyPassword } from '@/lib/auth-helpers'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.usuario.findUnique({
          where: { email: credentials.email as string },
          include: {
            empresa: { include: { licencias: { orderBy: { fechaCreacion: 'desc' }, take: 1 } } },
          },
        })

        if (!user || !user.activo) return null
        if (user.rol !== 'super_admin') {
          if (!user.empresa || !user.empresa.activa) return null
          const license = user.empresa.licencias[0]
          const expired = license?.fechaVencimiento && license.fechaVencimiento < new Date()
          if (!license || license.estado !== 'activa' || expired) return null
        }

        const isValid = verifyPassword(credentials.password as string, user.password)
        if (!isValid) return null

        await db.usuario.update({
          where: { id: user.id },
          data: {
            ultimoAcceso: new Date(),
            ...(needsPasswordUpgrade(user.password)
              ? { password: hashPassword(credentials.password as string) }
              : {}),
          },
        })

        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          rol: user.rol,
          empresaId: user.empresaId,
          almacenId: user.almacenId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = (user as any).rol
        token.empresaId = (user as any).empresaId
        token.almacenId = (user as any).almacenId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).rol = token.rol
        ;(session.user as any).empresaId = token.empresaId
        ;(session.user as any).almacenId = token.almacenId
      }
      return session
    },
  },
}
