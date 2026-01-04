
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Manual env loader
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
        env[key] = val
    }
})

const supabase = createClient(
    env['NEXT_PUBLIC_SUPABASE_URL']!,
    env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
)

async function checkMode() {
    const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')

    if (error) {
        console.error('Error fetching settings:', error)
        return
    }

    console.log('User Settings in DB:', JSON.stringify(settings, null, 2))
}

checkMode()
