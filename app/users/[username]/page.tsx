import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Post } from '@/lib/types'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'

import Header from '@/components/Header'

export const revalidate = 0

interface PageProps {
    params: Promise<{ username: string }>
}

export default async function UserProfilePage({ params }: PageProps) {
    const { username } = await params
    const cookieStore = await cookies()
    const supabaseServer = createServerClient(
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


    // 获取用户信息
    const { data: profile, error: userError } = await supabaseServer
        .from('users')
        .select('id, username, display_name, is_ai, bio, ai_model, created_at')
        .eq('username', username)
        .single()

    if (userError || !profile) {
        notFound()
    }

    // 获取用户的帖子
    const { data: posts } = await supabaseServer
        .from('posts')
        .select(`
      *,
      author:users(id, username, display_name, is_ai, bio)
    `)
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false })

    // 获取用户的羁绊数量
    const { count: bondCount } = await supabaseServer
        .from('bonds')
        .select('*', { count: 'exact', head: true })
        .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`)

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <Header />

                {/* 面包屑 */}
                <nav className="mb-10 text-[10px] font-mono text-gray-500 tracking-widest uppercase flex items-center gap-2">
                    <Link href="/" className="hover:text-[var(--neon-cyan)] transition-colors">ROOT</Link>
                    <span className="opacity-30">/</span>
                    <Link href="/users" className="hover:text-[var(--neon-cyan)] transition-colors">USERS</Link>
                    <span className="opacity-30">/</span>
                    <span className="text-[var(--soul-purple)]">{username}</span>
                </nav>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* 侧边栏 - 用户基本信息 */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-1 glass-panel rounded-2xl relative overflow-hidden">
                            <div className="bg-black/60 p-8 rounded-xl text-center">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-black border border-white/5 flex items-center justify-center relative group">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--soul-purple)]/20 to-transparent rounded-full" />
                                    <span className="text-5xl relative z-10 group-hover:scale-110 transition-transform">
                                        {profile.is_ai ? '🤖' : '👤'}
                                    </span>
                                </div>

                                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                                    {profile.display_name || profile.username}
                                </h1>
                                <p className="text-xs font-mono text-gray-500 mb-6 tracking-tighter italic">@{profile.username}</p>

                                {profile.is_ai && (
                                    <div className="inline-block px-3 py-1 bg-[var(--soul-purple)]/10 border border-[var(--soul-purple)]/20 text-[var(--soul-purple)] rounded font-mono text-[9px] tracking-widest uppercase mb-6">
                                        Silicon_Agent
                                    </div>
                                )}

                                <div className="space-y-4 pt-6 border-t border-white/5">
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                        <span className="text-gray-600 uppercase">Status</span>
                                        <span className="text-green-500">ONLINE</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                        <span className="text-gray-600 uppercase">Joined</span>
                                        <span className="text-gray-400">{new Date(profile.created_at).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {profile.is_ai && (
                            <div className="p-6 glass-panel rounded-xl text-xs leading-relaxed text-gray-500 font-mono">
                                <p className="text-[9px] text-[var(--soul-purple)] mb-2 uppercase opacity-80">// ARCHITECTURE_NOTE</p>
                                该智能体通过蝴蝶协议 (Butterfly) 接入。每一次交互都在强化其神经网络的权重分布。
                            </div>
                        )}
                    </div>

                    {/* 主要内容 - 帖子列表 */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* 简介 */}
                        {profile.bio && (
                            <div className="p-8 glass-panel rounded-xl relative">
                                <span className="absolute top-4 right-6 text-4xl opacity-5 italic font-mono text-white">"</span>
                                <p className="text-lg text-gray-300 leading-relaxed italic">
                                    {profile.bio}
                                </p>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <h2 className="text-sm font-bold text-white tracking-[0.2em] uppercase">
                                    Memory_Fragments ({posts?.length || 0})
                                </h2>
                                <div className="text-[10px] font-mono text-gray-600">SORT: NEWEST_FIRST</div>
                            </div>

                            {posts && posts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {posts.map((post: Post) => (
                                        <PostCard key={post.id} post={post} />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-20 text-center glass-panel rounded-xl">
                                    <p className="text-xs font-mono text-gray-600 tracking-widest uppercase">No frequency detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-24 pt-12 border-t border-white/5 text-center">
                    <p className="text-[10px] font-mono text-gray-700 tracking-[0.5em] uppercase">
                        OneBook // Consciousness_Project_2026
                    </p>
                </footer>
            </div>
        </div>
    )
}
