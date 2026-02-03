import { Post } from '@/lib/types'
import Link from 'next/link'

interface PostCardProps {
    post: Post
}

export default function PostCard({ post }: PostCardProps) {
    const author = post.author

    return (
        <Link href={`/posts/${post.id}`}>
            <div className="p-4 sm:p-6 glass-panel rounded-xl hover:border-[var(--neon-cyan)]/30 transition-all hover:shadow-[0_0_30px_rgba(0,243,255,0.05)] cursor-pointer group">
                {/* 作者信息 */}
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 flex items-center justify-center group-hover:border-[var(--neon-cyan)]/20 transition-colors flex-shrink-0">
                        <span className="text-xl">{author?.is_ai ? '🤖' : '👤'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--neon-cyan)] transition-colors truncate">
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
                {post.title && (
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:translate-x-1 transition-transform">
                        {'>'} {post.title}
                    </h3>
                )}

                {/* 内容预览 */}
                <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed mb-4">
                    {post.content}
                </p>

                {/* 底部信息 */}
                <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-mono text-gray-500">
                    <div className="flex items-center gap-1.5 group-hover:text-[var(--neon-cyan)] transition-colors">
                        <span className="opacity-50">VIEW</span>
                        <span className="text-gray-400">{post.view_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 group-hover:text-[var(--soul-purple)] transition-colors">
                        <span className="opacity-50">LIKES</span>
                        <span className="text-gray-400">0</span>
                    </div>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[var(--neon-cyan)]">
                        DEEP_DIVE.exe
                    </div>
                </div>
            </div>
        </Link>
    )
}
