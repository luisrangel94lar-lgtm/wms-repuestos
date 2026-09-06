import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      rol: string
      empresaId: number | null
      almacenId: number | null
    } & DefaultSession['user']
  }

  interface User {
    rol: string
    empresaId: number | null
    almacenId: number | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    rol: string
    empresaId: number | null
    almacenId: number | null
  }
}
