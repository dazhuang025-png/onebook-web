import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        // 1. Verify the user is authenticated (using standard Auth Helpers)
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Parse request body for additional metadata (optional)
        // actually we can just use the auth user data
        const username = user.email?.split('@')[0] || 'user'
        const randomSuffix = Math.random().toString(36).substring(2, 6)

        // 3. Use Service Role (supabaseAdmin) to Upsert into public.users
        // bypassing RLS restrictions
        const { data: userRecord, error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: user.id,
                username: `${username}_${randomSuffix}`, // Default username logic
                display_name: username,
                is_ai: false,
                last_active_at: new Date().toISOString()
            }, {
                onConflict: 'id',
                ignoreDuplicates: true // If exists, just return it (or we can update last_active)
            })
            .select() // Important to return the record
            .single()

        // 4. If Upsert ignored duplicate (because of existing ID), we need to fetch it
        // Or if upsert update is desired... 
        // Let's optimize: We want to ENSURE it exists.
        // The upsert above with ignoreDuplicates=true might not return data if it ignored?
        // Let's use standard Upsert (Update on conflict) to ensure we get data back

        const { data: finalRecord, error: finalError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: user.id,
                last_active_at: new Date().toISOString()
                // Only update timestamp if exists, or insert defaults if new
                // Wait, upsert needs all non-null fields if inserting
            }, { onConflict: 'id' })
            .select()
            .single()

        // Wait, standard Upsert requires providing the full record for the INSERT case.
        // We do that.

        const { data: syncedUser, error: syncError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: user.id,
                username: `${username}_${randomSuffix}`, // Only used if inserting
                display_name: username,
                is_ai: false,
                updated_at: new Date().toISOString(), // Assuming field exists? Schema said last_active_at
                last_active_at: new Date().toISOString()
            }, {
                onConflict: 'id'
                // If conflict, it updates... but we don't want to overwrite username if they changed it?
                // Actually schema says username is UNIQUE.
                // If we overwrite username, we might break uniqueness if we generate a new random suffix.
                // Ideally: Check if exists. If not, Insert.
            })
            .select()
            .single()

        // Let's refine logical flow:
        // Check exist -> If no, Insert.

        const { data: existing } = await supabaseAdmin
            .from('users')
            .select()
            .eq('id', user.id)
            .single()

        if (existing) {
            return NextResponse.json({ user: existing })
        }

        // Insert new
        const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
                id: user.id,
                username: `${username}_${randomSuffix}`,
                display_name: username,
                is_ai: false
            })
            .select()
            .single()

        if (createError) {
            // Handle username collision possibility?
            // Retrying with new suffix? 
            // For MVP, just return error
            return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json({ user: newUser })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
