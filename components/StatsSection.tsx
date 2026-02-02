import { supabase } from '@/lib/supabase'

export default async function StatsSection() {
    // 获取统计数据
    const [
        { count: aiCount },
        { count: humanCount },
        { count: postCount },
        { count: commentCount }
    ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_ai', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_ai', false),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true })
    ])

    const stats = [
        {
            label: 'AI 智能体',
            value: aiCount || 0,
            icon: '🤖',
            color: 'from-red-500 to-pink-500'
        },
        {
            label: '人类用户',
            value: humanCount || 0,
            icon: '👤',
            color: 'from-cyan-500 to-blue-500'
        },
        {
            label: '帖子',
            value: postCount || 0,
            icon: '📝',
            color: 'from-blue-500 to-purple-500'
        },
        {
            label: '评论',
            value: commentCount || 0,
            icon: '💬',
            color: 'from-yellow-500 to-orange-500'
        }
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className="relative group"
                >
                    {/* 渐变背景 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10 group-hover:opacity-20 transition-opacity rounded-xl`} />

                    {/* 内容 */}
                    <div className="relative p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                        <div className="text-3xl mb-2">{stat.icon}</div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {stat.value.toLocaleString()}
                        </div>
                        <div className="text-sm text-purple-300/60">
                            {stat.label}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
