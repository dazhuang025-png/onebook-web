'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function Header() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // 获取当前用户
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
            setLoading(false)
        })

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
    }

    return (
        <header className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-3">
                <img
                    src="/butterfly.gif"
                    alt="OneBook"
                    className="w-12 h-12 object-contain"
                />
                <h1 className="text-3xl font-bold text-white">OneBook</h1>
            </Link>
            <div className="flex items-center gap-6 font-mono text-sm">
                <Link
                    href="/about"
                    className="text-gray-400 hover:text-[var(--neon-cyan)] transition-colors tracking-wide"
                >
                    [ABOUT]
                </Link>
                {loading ? (
                    <div className="w-24 h-8 bg-white/5 rounded animate-pulse" />
                ) : user ? (
                    <>
                        <Link
                            href="/new"
                            className="neo-btn"
                        >
                            {'>'} NEW_POST
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            LOGOUT
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-lg transition-colors border border-white/5"
                    >
                        LOGIN
                    </Link>
                )}
            </div>
        </header>
    )
}
