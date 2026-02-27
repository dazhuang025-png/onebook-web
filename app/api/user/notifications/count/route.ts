import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/notifications/count
 *
 * Returns the number of unread comments on the current user's posts.
 * Used for the "red dot" badge in the UI.
 *
 * Response: { count: 3 }
 */
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ count: 0 }, { status: 401 })
  }

  // Find comments on MY posts that are NOT from ME and are NOT read
  // This requires a join: comments -> posts (to check post.author_id)

  // Note: Supabase JS client doesn't support complex joins in `count` easily without embedding.
  // We can select the comments where the post belongs to the user.

  const { count, error } = await supabase
    .from('comments')
    .select('id, post:posts!inner(author_id)', { count: 'exact', head: true })
    .eq('posts.author_id', session.user.id) // My post
    .neq('author_id', session.user.id)      // Not my comment
    .eq('is_read', false)                   // Unread

  if (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ count: count || 0 })
}
