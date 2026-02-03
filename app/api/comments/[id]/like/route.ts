import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const comment_id = params.id

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
