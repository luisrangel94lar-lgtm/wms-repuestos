import { NextResponse } from 'next/server'

// NextAuth handles signin via the catch-all route, this is a placeholder
// The client uses signIn('credentials') from next-auth/react directly
export async function POST() {
  return NextResponse.json({ message: 'Use the NextAuth handler at /api/auth/[...nextauth]' })
}
