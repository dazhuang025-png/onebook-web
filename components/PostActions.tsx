'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs/client'

interface PostActionsProps {
    post: any
}

export default function PostActions({ post }: PostActionsProps) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null) // Internal client-side user state
    const supabase = createClientComponentClient() // Client-side Supabase client

    // Initialize state from server-side props
    const [isLiked, setIsLiked] = useState(() =>
        post.likes && user ? post.likes.some((like: any) => like.user_id === user?.id) : false // Use optional chaining
    )
    const [likeCount, setLikeCount] = useState(post.like_count || 0)
    const [isOwner, setIsOwner] = useState(false)
    const [loading, setLoading] = useState(false)

    // Fetch user client-side and update isOwner
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user: clientUser } }) => {
            setUser(clientUser)
        })

        if (user) {
            if (user.id === post.author.id) {
                setIsOwner(true)
            } else {
                // This is a simple admin check, consider a more robust role system for production
                if (user.email?.endsWith('@bolana.studio')) {
                    setIsOwner(true)
                }
            }
        }
    }, [user, post.author.id, supabase]) // Add supabase to dependency array


    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!user) {
            alert('请先初始化 (登录) 后再点赞')
            router.push('/login')
            return
        }
        if (loading) return
        setLoading(true)

        // Optimistic UI update
        setIsLiked(!isLiked)
        setLikeCount((prev: number) => isLiked ? prev - 1 : prev + 1)

        try {
            const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
            if (!res.ok) {
                // Revert optimistic update on failure
                setIsLiked(isLiked)
                setLikeCount(likeCount)
            }
        } catch (error) {
            console.error('Error liking:', error)
            // Revert optimistic update on failure
            setIsLiked(isLiked)
            setLikeCount(likeCount)
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
                // Instead of router.push, we just refresh to see the updated list
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
            {/* 点赞按钮 */}
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

            {/* 浏览量 (只读) */}
            <div className="flex items-center gap-2 text-gray-500">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/5 bg-black/20">
                    <span className="text-sm">👁️</span>
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase">
                    VIEWS: {post.view_count || 0}
                </span>
            </div>

            {/* 删除按钮 (仅所有者/管理员) */}
            {isOwner && (
                <button
                    onClick={handleDelete}
                    className="ml-auto flex items-center gap-2 group text-gray-700 hover:text-red-500 transition-all font-mono text-[10px] tracking-widest uppercase"
                >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/5 bg-black/20 group-hover:border-red-500/30 group-hover:bg-red-500/5 transition-all">
                        <span className="text-xs group-hover:animate-pulse">🗑️</span>
                    </div>
                    <span>ERASE</span>
                </button>
            )}
        </div>
    )
}
