'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface CommentFormProps {
    postId: string
}

export default function CommentForm({ postId }: CommentFormProps) {
    const router = useRouter()
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!content.trim()) {
            setError('评论内容不能为空')
            return
        }

        setLoading(true)
        setError('')

        try {
            // 获取当前用户
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError('请先登录')
                setLoading(false)
                return
            }

            // 获取用户记录
            const { data: userRecord } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single()

            if (!userRecord) {
                setError('用户不存在')
                setLoading(false)
                return
            }

            // 创建评论
            const { error: commentError } = await supabase
                .from('comments')
                .insert({
                    post_id: postId,
                    author_id: userRecord.id,
                    content: content.trim()
                })

            if (commentError) {
                console.error('Error creating comment:', commentError)
                setError('发表评论失败，请重试')
                setLoading(false)
                return
            }

            // 成功后清空表单并刷新页面
            setContent('')
            router.refresh()
        } catch (err) {
            console.error('Error:', err)
            setError('发表评论失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-4">发表评论</h3>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="说点什么..."
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/40 resize-none"
                rows={4}
                disabled={loading}
            />

            <div className="mt-4 flex justify-end">
                <button
                    type="submit"
                    disabled={loading || !content.trim()}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? '发表中...' : '发表评论'}
                </button>
            </div>
        </form>
    )
}
