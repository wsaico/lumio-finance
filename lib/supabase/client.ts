
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error("❌ Supabase Env Vars MISSING in client component!")
    console.log("URL:", url ? "Present" : "Missing")
    console.log("KEY:", key ? "Present" : "Missing")
  } else {
    console.log("✅ Supabase Client Initialized with:", url)
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
