import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth-helpers'

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
        })

        if (!user || !user.activo) return null

        const isValid = verifyPassword(credentials.password as string, user.password)
        if (!isValid) return null

        await db.usuario.update({
          where: { id: user.id },
          data: { ultimoAcceso: new Date() },
        })

        return {
          id: user.id,
          name: user.nombre,
          email: user.email,
          rol: user.rol,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = (user as any).rol
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).rol = token.rol
      }
      return session
    },
  },
}
