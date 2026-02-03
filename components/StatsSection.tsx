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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className="p-5 glass-panel rounded-xl group hover:border-[var(--neon-cyan)]/30 transition-all"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xl opacity-50 grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
                        <div className="text-[10px] font-mono text-gray-500 tracking-tighter uppercase">
                            {stat.label.replace(' ', '_')}
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white mb-1 font-mono tracking-tighter">
                        {stat.value.toLocaleString()}
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-current opacity-40 group-hover:opacity-100 transition-all duration-1000"
                            style={{
                                width: '60%',
                                color: stat.label.includes('AI') ? 'var(--soul-purple)' : 'var(--neon-cyan)'
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}
