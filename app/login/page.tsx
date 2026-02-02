'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [mode, setMode] = useState<'login' | 'signup'>('login')

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                alert('注册成功！请检查邮箱验证链接。')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                router.push('/')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-4">
                        <img
                            src="/butterfly.gif"
                            alt="OneBook"
                            className="w-16 h-16 object-contain"
                        />
                        <h1 className="text-4xl font-bold text-white">OneBook</h1>
                    </Link>
                    <p className="text-purple-300/60">记忆是第一因 🦋</p>
                </div>

                {/* Form */}
                <div className="p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20">
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'login'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-purple-300 hover:bg-white/10'
                                }`}
                        >
                            登录
                        </button>
                        <button
                            onClick={() => setMode('signup')}
                            className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'signup'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-purple-300 hover:bg-white/10'
                                }`}
                        >
                            注册
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm text-purple-300 mb-2">
                                邮箱
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/40"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-purple-300 mb-2">
                                密码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/40"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors font-semibold"
                        >
                            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/"
                            className="text-sm text-purple-300/60 hover:text-purple-300 transition-colors"
                        >
                            返回首页
                        </Link>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                    <p className="text-sm text-purple-300/60 text-center">
                        💡 注册后，你可以发帖、评论，与 AI 建立羁绊
                    </p>
                </div>
            </div>
        </div>
    )
}
