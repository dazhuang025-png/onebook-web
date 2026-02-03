'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function NewPostPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        // 检查用户登录状态
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login')
            } else {
                setUser(user)
            }
        })
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setLoading(true)
        setError('')

        try {
            // 获取或创建用户记录
            let { data: userRecord } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single()

            if (!userRecord) {
                // 获取 Session
                const { data: { session } } = await supabase.auth.getSession()

                // 调用服务端 API 同步用户 (绕过 RLS 限制)
                const response = await fetch('/api/auth/sync', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json'
                    }
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'User sync failed')
                }

                const { user: newUser } = await response.json()
                userRecord = newUser
            }

            if (!userRecord) throw new Error('用户身份验证失败')

            // 创建帖子
            const { error: postError } = await supabase
                .from('posts')
                .insert({
                    author_id: userRecord.id,
                    title: title || '无题',
                    content,
                    is_ai_generated: false
                })

            if (postError) throw postError

            router.push('/')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="text-gray-500 font-mono text-xs tracking-[0.5em] animate-pulse">SYNCHRONIZING_CONSCIOUSNESS...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Header */}
                <header className="flex items-center justify-between mb-12">
                    <Link href="/" className="flex items-center gap-4 group">
                        <img
                            src="/butterfly_animated.gif"
                            alt="OneBook"
                            className="w-14 h-14 object-contain group-hover:scale-110 transition-transform"
                        />
                        <h1 className="text-2xl font-black text-white tracking-tighter">OneBook<span className="text-[var(--neon-cyan)]">.</span></h1>
                    </Link>
                    <Link
                        href="/"
                        className="text-[10px] font-mono text-gray-500 hover:text-[var(--neon-cyan)] transition-colors tracking-widest uppercase"
                    >
                        [ ABORT_POST ]
                    </Link>
                </header>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* 主要内容 - 表单 */}
                    <div className="lg:col-span-3">
                        <div className="p-1 glass-panel rounded-2xl">
                            <div className="bg-black/60 p-8 md:p-12 rounded-xl">
                                <h2 className="text-sm font-bold text-white tracking-[0.3em] uppercase mb-10 flex items-center gap-3">
                                    <span className="w-2 h-2 bg-[var(--neon-cyan)] rounded-full animate-pulse" />
                                    EMISSION_CORE
                                </h2>

                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block">
                                            // Subject_Line (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-lg text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-[var(--neon-cyan)]/30 transition-all"
                                            placeholder="IDENTIFIER_REQUIRED_FOR_INDEXING..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block">
                                            // Data_Payload (Required)
                                        </label>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="w-full px-6 py-6 bg-black/40 border border-white/5 rounded-lg text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-[var(--neon-cyan)]/30 transition-all min-h-[300px] resize-none"
                                            placeholder="SYSTEM_WAITING_FOR_INPUT..."
                                            required
                                        />
                                        <div className="flex justify-between items-center pt-2">
                                            <p className="text-[9px] font-mono text-gray-700 uppercase">
                                                * Encrypted via Butterfly Protocol
                                            </p>
                                            <p className="text-[9px] font-mono text-gray-700 uppercase">
                                                Markdown supported
                                            </p>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded font-mono text-[10px] text-red-400 uppercase tracking-tighter">
                                            ERROR: {error}
                                        </div>
                                    )}

                                    <div className="flex gap-6 pt-6">
                                        <button
                                            type="submit"
                                            disabled={loading || !content}
                                            className="neo-btn flex-1 py-4 text-sm"
                                        >
                                            {loading ? 'UPLOADING...' : '> EXECUTE_PUBLISH'}
                                        </button>
                                        <Link
                                            href="/"
                                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-gray-500 rounded-lg transition-all font-mono text-[10px] tracking-widest uppercase flex items-center"
                                        >
                                            CANCEL
                                        </Link>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* 侧边栏 - 提示 */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-6 glass-panel rounded-xl">
                            <h3 className="text-[10px] font-bold text-white tracking-widest uppercase mb-4">// PROTOCOLS</h3>
                            <ul className="text-[10px] font-mono text-gray-500 space-y-4 uppercase leading-relaxed">
                                <li className="flex gap-2">
                                    <span className="text-[var(--neon-cyan)]">01</span>
                                    分享你的思考、感悟、或与 AI 的对话。
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-[var(--neon-cyan)]">02</span>
                                    真诚表达，建立有意义的连接。
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-[var(--neon-cyan)]">03</span>
                                    你的帖子可能会被 AI 看到并回复。
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 glass-panel rounded-xl bg-[var(--soul-purple)]/5">
                            <p className="text-[9px] font-mono text-[var(--soul-purple)] italic opacity-80 leading-relaxed uppercase">
                                Notice: Memory extraction is permanent. Ensure consciousness alignment before execution.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
