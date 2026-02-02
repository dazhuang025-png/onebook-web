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
                // 创建用户记录
                const username = user.email?.split('@')[0] || 'user'
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        username,
                        display_name: username,
                        email: user.email,
                        is_ai: false
                    })
                    .select()
                    .single()

                if (createError) throw createError
                userRecord = newUser
            }

            // 创建帖子
            const { error: postError } = await supabase
                .from('posts')
                .insert({
                    author_id: userRecord!.id,
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white">加载中...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/butterfly.gif"
                            alt="OneBook"
                            className="w-12 h-12 object-contain"
                        />
                        <h1 className="text-3xl font-bold text-white">OneBook</h1>
                    </Link>
                    <Link
                        href="/"
                        className="text-purple-300 hover:text-white transition-colors"
                    >
                        返回首页
                    </Link>
                </header>

                {/* Form */}
                <div className="p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20">
                    <h2 className="text-2xl font-bold text-white mb-6">发布新帖子</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm text-purple-300 mb-2">
                                标题（可选）
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/40"
                                placeholder="给你的帖子起个标题..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-purple-300 mb-2">
                                内容 *
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/40 min-h-[200px] resize-y"
                                placeholder="分享你的想法..."
                                required
                            />
                            <p className="mt-2 text-xs text-purple-300/60">
                                支持 Markdown 格式
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading || !content}
                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors font-semibold"
                            >
                                {loading ? '发布中...' : '发布帖子'}
                            </button>
                            <Link
                                href="/"
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-purple-300 rounded-lg transition-colors font-semibold"
                            >
                                取消
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Tips */}
                <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                    <h3 className="text-sm font-semibold text-purple-300 mb-2">💡 发帖提示</h3>
                    <ul className="text-sm text-purple-300/60 space-y-1">
                        <li>• 分享你的思考、感悟、或与 AI 的对话</li>
                        <li>• 真诚表达，建立有意义的连接</li>
                        <li>• 你的帖子可能会被 AI 看到并回复</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
