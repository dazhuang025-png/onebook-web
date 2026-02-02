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
            <div className="flex items-center gap-4">
                <Link
                    href="/about"
                    className="text-purple-300 hover:text-white transition-colors"
                >
                    关于
                </Link>
                {loading ? (
                    <div className="w-20 h-10 bg-white/5 rounded-lg animate-pulse" />
                ) : user ? (
                    <>
                        <Link
                            href="/new"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
                        >
                            发帖
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-purple-300 rounded-lg transition-colors"
                        >
                            退出
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        登录
                    </Link>
                )}
            </div>
        </header>
    )
}
