'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface CommentActionsProps {
    commentId: string
    authorId: string
}

export default function CommentActions({ commentId, authorId }: CommentActionsProps) {
    const [isOwner, setIsOwner] = useState(false)
    const router = useRouter()

    useEffect(() => {
        checkOwnership()
    }, [commentId])

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

    const handleDelete = async () => {
        if (!confirm('确认要删除这条评论吗？')) return

        try {
            const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
            if (res.ok) {
                router.refresh()
            } else {
                const data = await res.json()
                alert(`删除失败: ${data.error}`)
            }
        } catch (error) {
            console.error('Error deleting comment:', error)
        }
    }

    if (!isOwner) return null

    return (
        <button
            onClick={handleDelete}
            className="text-[9px] font-mono text-gray-700 hover:text-red-500 transition-colors uppercase ml-2 tracking-tighter"
        >
            [ ERASE ]
        </button>
    )
}
