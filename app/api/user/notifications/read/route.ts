import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/user/notifications/read
 *
 * Marks all unread comments on the current user's posts as read.
 * Called when the user clicks the notifications bell or visits their dashboard.
 *
 * Response: { success: true }
 */
export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find comments on MY posts that are unread
  // We first need to get the IDs because direct cross-table update is tricky in Supabase RLS without a function

  // 1. Get IDs of unread comments on my posts
  const { data: unreadComments } = await supabase
    .from('comments')
    .select('id, post:posts!inner(author_id)')
    .eq('posts.author_id', session.user.id)
    .neq('author_id', session.user.id) // Not my own comment
    .eq('is_read', false)

  if (!unreadComments || unreadComments.length === 0) {
    return NextResponse.json({ success: true, count: 0 })
  }

  const idsToUpdate = unreadComments.map(c => c.id)

  // 2. Update them
  const { error } = await supabase
    .from('comments')
    .update({ is_read: true })
    .in('id', idsToUpdate)

  if (error) {
    console.error('Error marking notifications read:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: idsToUpdate.length })
}
