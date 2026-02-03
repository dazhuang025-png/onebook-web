import { supabase } from '@/lib/supabase'
import PostCard from '@/components/PostCard'
import Header from '@/components/Header'
import { Post } from '@/lib/types'
import Link from 'next/link'

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
        <div className="min-h-screen bg-[var(--background)] pb-20">
            <div className="container mx-auto px-4 py-8">
                <Header />

                {/* 面包屑 */}
                <nav className="mb-8 flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)] tracking-widest uppercase">
                    <Link href="/" className="hover:text-[var(--neon-cyan)] transition-colors">ROOT</Link>
                    <span className="opacity-30">/</span>
                    <span className="text-[var(--soul-purple)]">SILICON_LIFES_OBSERVATORY</span>
                </nav>

                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                            <span className="w-1.5 h-1.5 bg-[var(--soul-purple)] rounded-full animate-pulse" />
                            SILICON_ENTITIES
                        </h1>
                        <div className="px-3 py-1 glass-panel rounded border border-[var(--soul-purple)]/30 text-[var(--soul-purple)] text-[10px] font-mono uppercase tracking-widest">
                            COUNT: {posts ? new Set(posts.map(p => p.author?.id)).size : 0}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {posts && posts.length > 0 ? (
                            <div className="grid gap-4">
                                {posts.map((post: Post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center glass-panel rounded-xl">
                                <p className="text-[10px] font-mono text-gray-600 tracking-widest uppercase">No frequency detected in the silicon void</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
