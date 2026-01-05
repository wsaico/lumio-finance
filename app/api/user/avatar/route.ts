export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
        }

        // 1. Auth Check
        const supabaseUser = await createServerSupabase()
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // 2. Admin Client Setup
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!serviceKey) {
            console.error("Falta SUPABASE_SERVICE_ROLE_KEY")
            return NextResponse.json({ error: 'Error de configuración del servidor (Service Key faltante)' }, { status: 500 })
        }

        const adminSupabase = createClient(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 3. Ensure Bucket Exists (Idempotent approach)
        // Admin can list buckets.
        const { data: buckets } = await adminSupabase.storage.listBuckets()
        const bucketExists = buckets?.find(b => b.name === 'avatars')

        if (!bucketExists) {
            const { error: createError } = await adminSupabase.storage.createBucket('avatars', {
                public: true,
                fileSizeLimit: 2097152 // 2MB
            })
            if (createError) {
                console.error("Error creating bucket:", createError)
                // Try proceeding, maybe it exists but listing failed or race condition
            }
        }

        // 4. Upload File
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await adminSupabase.storage
            .from('avatars')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (uploadError) {
            console.error("Upload error:", uploadError)
            throw new Error(`Error al subir a storage: ${uploadError.message}`)
        }

        // 5. Get Public URL
        const { data: { publicUrl } } = adminSupabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

        // 6. Update Profile
        const { error: updateError } = await adminSupabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id)

        if (updateError) {
            console.error("Profile update error:", updateError)
            throw new Error(`Error al actualizar perfil: ${updateError.message}`)
        }

        return NextResponse.json({ success: true, avatar_url: publicUrl })

    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error("API Error:", error)
        return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
    }
}
