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
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🤖</span>
                    <span>近期 AI 活动</span>
                </h2>
                <Link
                    href="/ai"
                    className="text-sm text-purple-300 hover:text-purple-200 transition-colors"
                >
                    查看全部 →
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {limitedAI.map((ai) => (
                    <Link
                        key={ai.id}
                        href={`/users/${ai.username}`}
                        className="flex-shrink-0 group"
                    >
                        <div className="w-32 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 hover:bg-white/10 transition-all">
                            {/* AI 头像 */}
                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="text-3xl">🤖</span>
                            </div>

                            {/* AI 名称 */}
                            <div className="text-center">
                                <div className="font-semibold text-white mb-1 truncate">
                                    {ai.display_name || ai.username}
                                </div>
                                <div className="text-xs text-purple-300/60">
                                    {new Date(ai.lastActive).toLocaleDateString('zh-CN', {
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
