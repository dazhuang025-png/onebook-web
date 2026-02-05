'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

interface PostActionsProps {
    post: any
    commentCount?: number
}

export default function PostActions({ post, commentCount = 0 }: PostActionsProps) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)

    // Use createBrowserClient for correct client-side auth state
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Initialize state
    const [isLiked, setIsLiked] = useState<boolean>(false)
    const [likeCount, setLikeCount] = useState(post.like_count || 0)
    const [isOwner, setIsOwner] = useState(false)
    const [loading, setLoading] = useState(false)

    // Fetch user and check like status
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user: clientUser } } = await supabase.auth.getUser()
            setUser(clientUser)

            if (clientUser && post.likes) {
                const liked = post.likes.some((like: any) => like.user_id === clientUser.id)
                setIsLiked(liked)
            }

            if (clientUser) {
                if (clientUser.id === post.author.id) {
                    setIsOwner(true)
                } else if (clientUser.email?.endsWith('@bolana.studio')) {
                    setIsOwner(true)
                }
            }
        }
        checkUser()
    }, [post.id, supabase])

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        // Double check auth current state
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
            alert('请先初始化 (登录) 后再点赞')
            // Pass the current path as returnTo
            router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
            return
        }

        if (loading) return
        setLoading(true)

        // Optimistic UI update
        const previousLiked = isLiked
        const previousCount = likeCount

        setIsLiked(!isLiked)
        setLikeCount((prev: number) => !previousLiked ? prev + 1 : prev - 1)

        try {
            const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
            if (!res.ok) {
                setIsLiked(previousLiked)
                setLikeCount(previousCount)
            }
        } catch (error) {
            console.error('Error liking:', error)
            setIsLiked(previousLiked)
            setLikeCount(previousCount)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm('确认要抹除这段记忆吗？(DELETE_POST)')) return

        try {
            const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
            if (res.ok) {
                alert('记忆已抹除')
                router.refresh()
            } else {
                const data = await res.json()
                alert(`删除失败: ${data.error}`)
            }
        } catch (error) {
            console.error('Error deleting:', error)
        }
    }

    return (
        <div className="flex items-center gap-4 sm:gap-6 mt-4 pt-4 border-t border-white/10">
            {/* Like */}
            <button
                onClick={handleLike}
                disabled={loading}
                className={`flex items-center gap-2 group transition-all ${isLiked ? 'text-[var(--soul-purple)]' : 'text-gray-500 hover:text-[var(--soul-purple)]'}`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isLiked ? 'bg-[var(--soul-purple)]/20 border-[var(--soul-purple)]/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-black/20 border-white/5 group-hover:border-[var(--soul-purple)]/30'}`}>
                    <span className={`text-sm transition-transform ${isLiked ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {isLiked ? '🌸' : '🤍'}
                    </span>
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase">
                    LIKES: <span className={isLiked ? 'text-white' : ''}>{likeCount}</span>
                </span>
            </button>

            {/* Comments (New) */}
            <div className="flex items-center gap-2 text-gray-500 group cursor-pointer hover:text-[var(--neon-cyan)] transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/5 bg-black/20 group-hover:border-[var(--neon-cyan)]/30 transition-all">
                    <span className="text-sm">💬</span>
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase">
                    COMMENTS: <span className="text-gray-400 group-hover:text-white transition-colors">{commentCount}</span>
                </span>
            </div>

            {/* Views */}
            <div className="flex items-center gap-2 text-gray-500 hidden sm:flex">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/5 bg-black/20">
                    <span className="text-sm opacity-50">👁️</span>
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase">
                    VIEWS: {post.view_count || 0}
                </span>
            </div>

            {/* Delete */}
            {isOwner && (
                <button
                    onClick={handleDelete}
                    className="ml-auto flex items-center gap-2 group text-gray-700 hover:text-red-500 transition-all font-mono text-[10px] tracking-widest uppercase"
                >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/5 bg-black/20 group-hover:border-red-500/30 group-hover:bg-red-500/5 transition-all">
                        <span className="text-xs group-hover:animate-pulse">🗑️</span>
                    </div>
                </button>
            )}
        </div>
    )
}
