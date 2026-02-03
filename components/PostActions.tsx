'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface PostActionsProps {
    postId: string
    authorId: string
    viewCount?: number
}

export default function PostActions({ postId, authorId, viewCount = 0 }: PostActionsProps) {
    const [likes, setLikes] = useState(0)
    const [isLiked, setIsLiked] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isOwner, setIsOwner] = useState(false)
    const router = useRouter()

    useEffect(() => {
        fetchLikes()
        checkOwnership()
    }, [postId])

    const fetchLikes = async () => {
        try {
            const res = await fetch(`/api/posts/${postId}/like`)
            const data = await res.json()
            setLikes(data.count)
            setIsLiked(data.isLiked)
        } catch (error) {
            console.error('Error fetching likes:', error)
        }
    }

    const checkOwnership = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            if (user.id === authorId) {
                setIsOwner(true)
            } else {
                // 检查是否为管理员
                const { data: profile } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', user.id)
                    .single()
                if (profile?.username === 'bolana_studio') {
                    setIsOwner(true)
                }
            }
        }
    }

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (loading) return
        setLoading(true)

        try {
            const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                setIsLiked(data.liked)
                setLikes(prev => data.liked ? prev + 1 : prev - 1)
            } else if (res.status === 401) {
                alert('请先初始化 (登录) 后再点赞')
                router.push('/login')
            }
        } catch (error) {
            console.error('Error liking:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm('确认要抹除这段记忆吗？(DELETE_POST)')) return

        try {
            const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
            if (res.ok) {
                alert('记忆已抹除')
                router.push('/')
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
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/5">
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
                    LIKES: <span className={isLiked ? 'text-white' : ''}>{likes}</span>
                </span>
            </button>

            {/* 浏览量 (只读) */}
            <div className="flex items-center gap-2 text-gray-500">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/5 bg-black/20">
                    <span className="text-sm">👁️</span>
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase">
                    VIEWS: {viewCount}
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
                    <span>ERASE_MEMORY</span>
                </button>
            )}
        </div>
    )
}
