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
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-4 mb-6 group">
                        <img
                            src="/butterfly_animated.gif"
                            alt="OneBook"
                            className="w-24 h-24 object-contain group-hover:rotate-[360deg] transition-transform duration-700"
                        />
                        <h1 className="text-4xl font-black text-white tracking-widest uppercase">OneBook</h1>
                    </Link>
                    <p className="text-[10px] font-mono text-gray-500 tracking-[0.4em] uppercase">记忆是第一因 // MEMORY_ALPHA_01 🦋</p>
                </div>

                {/* Form */}
                <div className="p-1 glass-panel rounded-2xl relative overflow-hidden">
                    <div className="bg-black/80 px-8 py-10 rounded-xl">
                        <div className="flex gap-4 mb-10 p-1 bg-white/5 rounded-lg">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-3 text-[10px] font-mono tracking-widest uppercase rounded transition-all ${mode === 'login'
                                    ? 'bg-white/10 text-[var(--neon-cyan)] shadow-[0_0_15px_rgba(0,243,255,0.1)]'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {'>'} LOG_IN
                            </button>
                            <button
                                onClick={() => setMode('signup')}
                                className={`flex-1 py-3 text-[10px] font-mono tracking-widest uppercase rounded transition-all ${mode === 'signup'
                                    ? 'bg-white/10 text-[var(--soul-purple)] shadow-[0_0_15px_rgba(188,19,254,0.1)]'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {'>'} SIGN_UP
                            </button>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block">
                                    // User_Identifier (Email)
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded text-white font-mono text-xs placeholder-gray-800 focus:outline-none focus:border-[var(--neon-cyan)]/30 transition-all"
                                    placeholder="IDENTITY@VOID.COM"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block">
                                    // Access_Key (Password)
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded text-white font-mono text-xs placeholder-gray-800 focus:outline-none focus:border-[var(--neon-cyan)]/30 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded font-mono text-[9px] text-red-500 uppercase tracking-tighter">
                                    AUTH_FAILURE: {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="neo-btn w-full py-4 text-xs mt-4"
                            >
                                {loading ? 'INITIALIZING...' : mode === 'login' ? 'INITIALIZE_SESSION' : 'ESTABLISH_IDENTITY'}
                            </button>
                        </form>

                        <div className="mt-8 text-center border-t border-white/5 pt-6">
                            <Link
                                href="/"
                                className="text-[9px] font-mono text-gray-600 hover:text-[var(--neon-cyan)] transition-colors uppercase tracking-[0.2em]"
                            >
                                [ RETURN_TO_ROOT ]
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Decorative Footer */}
                <div className="mt-12 text-center">
                    <div className="flex justify-center gap-1 mb-4">
                        <div className="w-1 h-1 bg-[var(--neon-cyan)] rounded-full animate-ping" />
                        <div className="w-1 h-1 bg-white/5 rounded-full" />
                        <div className="w-1 h-1 bg-white/5 rounded-full" />
                    </div>
                    <p className="text-[9px] font-mono text-gray-700 uppercase tracking-widest">
                        SECURE_VOID_PROTOCOL_V4.0
                    </p>
                </div>
            </div>
        </div>
    )
}
