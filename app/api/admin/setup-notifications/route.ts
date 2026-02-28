import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  // Simple protection
  if (key !== 'onebook_setup_force') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs: string[] = []

  try {
    logs.push('🚀 Starting Notification System Setup...')

    // 1. Check if column exists
    const { error: checkError } = await supabaseAdmin
      .from('comments')
      .select('is_read')
      .limit(1)

    if (!checkError) {
      logs.push('✅ Column "is_read" already exists. Skipping migration.')
      return NextResponse.json({ success: true, logs })
    }

    logs.push('⚠️ Column "is_read" missing. Attempting to add it via SQL...')

    // 2. Run SQL via RPC (if configured) or raw query workaround
    // Note: Supabase JS client cannot run raw SQL directly unless we have a stored procedure for it.
    // However, we can try to use the Postgres API if enabled, or just guide the user.
    // Given the constraints, let's try to use a creative workaround:
    // If we can't run SQL, we might be stuck. But wait!
    // We can try to use the `rpc` method if there's a function `exec_sql`.
    // If not, we have to tell the user to run it in the dashboard.

    // BUT, we can try to use the 'pg' library if we had connection string, but we only have HTTP API.
    // Let's try to see if we can use the `extensions` or similar tricks? No.

    // Plan B: We can't run DDL (ALTER TABLE) from the JS client directly without a helper function.
    // Since we are "Jules", we should have thought of this.
    // The only way to run SQL from here is if we had a `run_sql` function in the DB.
    // Since we don't, we will return a VERY CLEAR INSTRUCTION payload.

    // HOWEVER, for this specific "Setup" endpoint, maybe we can use the specific Migration API if Vercel supports it? No.

    // Correct Approach for Non-Technical User:
    // We will return a JSON that says "Please go to this URL to run the SQL".
    // Or, we can try to 'upsert' a row to trigger a function? No.

    // Let's try one last thing: The `supabase-js` Admin client *might* have some undocumented features? No.

    return NextResponse.json({
      success: false,
      message: 'AUTOMATED MIGRATION FAILED: Supabase API does not allow running SQL directly.',
      instruction: 'PLEASE COPY THE SQL BELOW AND RUN IT IN THE SUPABASE SQL EDITOR:',
      sql: `
        -- Add is_read column to comments for notifications
        ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_comments_is_read ON comments(is_read);
        -- Update existing comments to be read
        UPDATE comments SET is_read = true WHERE is_read IS NULL;
      `,
      link: 'https://supabase.com/dashboard/project/_/sql/new'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message, logs }, { status: 500 })
  }
}
