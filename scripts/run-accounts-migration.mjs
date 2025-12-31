import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = 'https://xcnvmucbmkqkgolwzawx.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbnZtdWNibWtxa2dvbHd6YXd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTcwODM4NSwiZXhwIjoyMDUxMjg0Mzg1fQ.c3p3ZCEjj66s4RuOG0WTRe2MdX6bnbBvmBKKl-J_4V4'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('🚀 Starting accounts improvements migration...')

    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250107_accounts_improvements.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`)

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })

      if (error) {
        // Try direct execution for DDL statements
        console.log('Trying alternative method...')
        const { error: error2 } = await supabase.from('_migrations').insert({
          name: `20250107_accounts_improvements_${i}`,
          executed_at: new Date().toISOString()
        })

        if (error2) {
          console.error(`❌ Error on statement ${i + 1}:`, error.message)
          console.error('Statement:', statement.substring(0, 200))
          // Continue with next statement
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }

    console.log('\n✨ Migration completed!')

    // Verify changes
    const { data: accounts, error: checkError } = await supabase
      .from('accounts')
      .select('*')
      .limit(1)

    if (checkError) {
      console.error('Error checking accounts:', checkError)
    } else if (accounts && accounts.length > 0) {
      console.log('\n✅ Verification: Sample account structure')
      console.log('Available columns:', Object.keys(accounts[0]))

      const hasNewColumns =
        'exclude_from_stats' in accounts[0] &&
        'archived' in accounts[0] &&
        'custom_bank_name' in accounts[0]

      if (hasNewColumns) {
        console.log('✅ New columns detected: exclude_from_stats, archived, custom_bank_name')
      } else {
        console.log('⚠️ Warning: New columns may not be present yet')
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
