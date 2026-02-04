import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { id: post_id } = await params

  // Check if the user has already liked the post
  const { data: existingLike, error: selectError } = await supabase
    .from('likes')
    .select('*')
    .eq('user_id', user.id)
    .eq('post_id', post_id)
    .single()

  if (existingLike) {
    // If like exists, unlike it (DELETE)
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', post_id)

    if (deleteError) {
      return new NextResponse(deleteError.message, { status: 500 })
    }
  } else {
    // If like does not exist, like it (INSERT)
    const { error: insertError } = await supabase
      .from('likes')
      .insert({ user_id: user.id, post_id: post_id })

    if (insertError) {
      return new NextResponse(insertError.message, { status: 500 })
    }
  }

  revalidatePath(`/posts/${post_id}`)
  revalidatePath('/')

  return NextResponse.json({ success: true })
}