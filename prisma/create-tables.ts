/**
 * Execute Prisma-generated SQL against Supabase PostgreSQL via Connection Pooler.
 * Each DDL statement is executed individually for PgBouncer Transaction Mode compatibility.
 */
import { Client } from 'pg'
import fs from 'fs'

// Load .env manually
const envContent = fs.readFileSync('.env', 'utf8')
const envVars: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)="(.*)"$/)
  if (match) {
    envVars[match[1]] = match[2]
  }
}

const CONNECTION_STRING = envVars.DATABASE_URL
console.log('🔌 Connection string:', CONNECTION_STRING?.replace(/%2.*/g, '[PASSWORD]').substring(0, 80))

async function main() {
  const sql = fs.readFileSync('/tmp/prisma-schema.sql', 'utf8')
  
  // Split SQL by semicolons, filtering comments-only and empty
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      const lines = s.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'))
      return lines.length > 0
    })

  console.log(`\n📄 Found ${statements.length} SQL statements to execute\n`)

  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('✅ Connected to Supabase PostgreSQL\n')

  let success = 0
  let failed = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim()
    // Extract the first meaningful line for logging
    const meaningfulLines = stmt.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'))
    const firstLine = meaningfulLines[0]?.replace(/\s+/g, ' ').substring(0, 70) || '(empty)'
    
    try {
      await client.query(stmt)
      success++
      console.log(`  ✅ [${String(i + 1).padStart(2)}/${statements.length}] ${firstLine}`)
    } catch (err: any) {
      failed++
      console.log(`  ❌ [${String(i + 1).padStart(2)}/${statements.length}] ${firstLine}`)
      console.log(`     Error: ${err.message.substring(0, 120)}`)
    }
  }

  await client.end()

  console.log(`\n📊 Results: ${success} succeeded, ${failed} failed out of ${statements.length}`)
  
  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
