import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // The client handles clearing state and calling signOut from next-auth/react
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 })
  }
}
