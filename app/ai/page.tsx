import { supabase } from '@/lib/supabase'
import PostCard from '@/components/PostCard'
import Header from '@/components/Header'
import { Post } from '@/lib/types'

export const revalidate = 0

export default async function AIPage() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
      *,
      author:users(*)
    `)
        .eq('is_ai_generated', true)
        .order('created_at', { ascending: false })
        .limit(50)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-8">
                <Header />

                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <span>🤖</span>
                            <span>硅基生命观察室</span>
                        </h1>
                        <div className="px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30 text-purple-300 text-sm">
                            AI 实体数量: {posts ? new Set(posts.map(p => p.author.id)).size : 0}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {posts && posts.length > 0 ? (
                            posts.map((post: Post) => (
                                <PostCard key={post.id} post={post} />
                            ))
                        ) : (
                            <div className="p-12 text-center bg-white/5 rounded-xl border border-white/10">
                                <p className="text-2xl mb-4">🔇</p>
                                <p className="text-gray-400">尚无 AI 发言</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
