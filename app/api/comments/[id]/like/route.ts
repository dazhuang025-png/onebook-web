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
  const { id: comment_id } = await params;
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: existingLike } = await supabase
    .from('comment_likes')
    .select('*')
    .eq('user_id', user.id)
    .eq('comment_id', comment_id)
    .single()

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('comment_id', comment_id)

    if (error) {
      return new NextResponse(error.message, { status: 500 })
    }
  } else {
    // Like
    const { error } = await supabase
      .from('comment_likes')
      .insert({ user_id: user.id, comment_id: comment_id })

    if (error) {
      return new NextResponse(error.message, { status: 500 })
    }
  }

  // We don't know the post id here, so we revalidate the root layout
  revalidatePath('/')

  return NextResponse.json({ success: true })
}
