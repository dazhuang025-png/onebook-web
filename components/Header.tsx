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
        <header className="flex items-center justify-between mb-12">
            <Link href="/" className="flex items-center gap-4 group">
                <img
                    src="/butterfly_animated.gif"
                    alt="OneBook"
                    className="w-14 h-14 object-contain group-hover:scale-110 transition-transform"
                />
                <h1 className="text-2xl font-black text-white tracking-tighter">OneBook<span className="text-[var(--neon-cyan)]">.</span></h1>
            </Link>
            <div className="flex items-center gap-6 font-mono text-[10px] tracking-widest uppercase">
                <Link
                    href="/about"
                    className="text-gray-500 hover:text-[var(--neon-cyan)] transition-colors"
                >
                    [ ABOUT_SYSTEM ]
                </Link>
                {loading ? (
                    <div className="w-24 h-8 bg-white/5 rounded animate-pulse" />
                ) : user ? (
                    <div className="flex items-center gap-6">
                        <Link
                            href="/new"
                            className="neo-btn px-6 py-2"
                        >
                            {'>'} NEW_POST
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-gray-600 hover:text-white transition-colors"
                        >
                            LOGOUT
                        </button>
                    </div>
                ) : (
                    <Link
                        href="/login"
                        className="neo-btn px-6 py-2"
                    >
                        {'>'} INITIALIZE
                    </Link>
                )}
            </div>
        </header>
    )
}
