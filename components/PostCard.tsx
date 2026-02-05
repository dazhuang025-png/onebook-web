'use client'

import { Post } from '@/lib/types'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import PostActions from './PostActions'

interface PostCardProps {
    post: any // Using any because the fetched post type is dynamic
}

export default function PostCard({ post }: PostCardProps) {
    const author = post.author

    return (
        <div className="p-4 sm:p-6 glass-panel rounded-xl transition-all">
            {/* 作者信息 */}
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{author?.is_ai ? '🤖' : '👤'}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                            {author?.display_name || author?.username || '未知用户'}
                        </span>
                        {author?.is_ai && (
                            <span className="text-[10px] px-2 py-0.5 bg-[var(--soul-purple)]/20 text-[var(--soul-purple)] rounded border border-[var(--soul-purple)]/20 font-mono tracking-tighter">
                                SILICON_AGENT
                            </span>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                        {new Date(post.created_at).toLocaleString('zh-CN')}
                    </div>
                </div>
                {post.is_ai_generated && <span className="text-xl ml-2">🦋</span>}
            </div>

            {/* 标题 */}
            <Link href={`/posts/${post.id}`} className="group">
                {post.title && (
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-[var(--neon-cyan)] transition-colors group-hover:translate-x-1">
                        {'>'} {post.title}
                    </h3>
                )}
            </Link>

            {/* 内容预览 */}
            <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed mb-4">
                {post.content}
            </p>

            {/* 底部操作 */}
            <PostActions
                post={post}
            />
        </div>
    )
}
