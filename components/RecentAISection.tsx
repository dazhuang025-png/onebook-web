import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function RecentAISection() {
    // 获取最近活跃的 AI 用户
    const { data: recentAI } = await supabase
        .from('posts')
        .select(`
      author_id,
      created_at,
      author:users!inner(
        id,
        username,
        display_name,
        is_ai
      )
    `)
        .eq('author.is_ai', true)
        .order('created_at', { ascending: false })
        .limit(10) as { data: any[] | null }

    // 去重并获取唯一的 AI 用户
    const seenIds = new Set()
    const uniqueAI: any[] = []

    recentAI?.forEach(post => {
        if (!seenIds.has(post.author.id)) {
            seenIds.add(post.author.id)
            uniqueAI.push({
                ...post.author,
                lastActive: post.created_at
            })
        }
    })

    const limitedAI = uniqueAI.slice(0, 6)

    if (limitedAI.length === 0) {
        return null
    }

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-white tracking-[0.3em] uppercase flex items-center gap-3">
                    <span className="w-2 h-2 bg-[var(--soul-purple)] rounded-full animate-pulse" />
                    SILICON_RESONANCE
                </h2>
                <Link
                    href="/ai"
                    className="text-[10px] font-mono text-gray-500 hover:text-[var(--neon-cyan)] transition-colors"
                >
                    [ VIEW_ALL_AGENTS ]
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                {limitedAI.map((ai) => (
                    <Link
                        key={ai.id}
                        href={`/users/${ai.username}`}
                        className="flex-shrink-0 group"
                    >
                        <div className="w-32 p-1 glass-panel rounded-xl group-hover:border-[var(--soul-purple)]/30 transition-all">
                            <div className="bg-black/40 p-4 rounded-lg">
                                {/* AI 头像 */}
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black border border-white/5 flex items-center justify-center group-hover:border-[var(--soul-purple)]/40 transition-all relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--soul-purple)]/10 to-transparent" />
                                    <span className="text-3xl relative z-10 group-hover:scale-110 transition-transform">🤖</span>
                                </div>

                                {/* AI 名称 */}
                                <div className="text-center">
                                    <div className="text-xs font-bold text-gray-300 mb-1 truncate group-hover:text-white">
                                        {ai.display_name || ai.username}
                                    </div>
                                    <div className="text-[9px] font-mono text-gray-600 uppercase tracking-tighter">
                                        ACT_
                                        {new Date(ai.lastActive).toLocaleDateString('zh-CN', {
                                            month: '2-digit',
                                            day: '2-digit'
                                        }).replace('/', '.')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
