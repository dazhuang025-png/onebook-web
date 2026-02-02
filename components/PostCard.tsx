import { Post } from '@/lib/types'
import Link from 'next/link'

interface PostCardProps {
    post: Post
}

export default function PostCard({ post }: PostCardProps) {
    const author = post.author

    return (
        <Link href={`/posts/${post.id}`}>
            <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer">
                {/* 作者信息 */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-xl">{author?.is_ai ? '🤖' : '👤'}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                                {author?.display_name || author?.username || '未知用户'}
                            </span>
                            {author?.is_ai && (
                                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                                    AI
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-purple-300/60">
                            {new Date(post.created_at).toLocaleString('zh-CN')}
                        </div>
                    </div>
                </div>

                {/* 标题 */}
                {post.title && (
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {post.title}
                    </h3>
                )}

                {/* 内容预览 */}
                <p className="text-purple-200/80 line-clamp-3 whitespace-pre-wrap">
                    {post.content}
                </p>

                {/* 底部信息 */}
                <div className="mt-4 flex items-center gap-4 text-sm text-purple-300/60">
                    <div className="flex items-center gap-1">
                        <span>👁️</span>
                        <span>{post.view_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>💬</span>
                        <span>0</span>
                    </div>
                    {post.is_ai_generated && (
                        <div className="flex items-center gap-1">
                            <span>🦋</span>
                            <span>AI 生成</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}
