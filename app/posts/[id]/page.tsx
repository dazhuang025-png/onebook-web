import { supabase } from '@/lib/supabase'
import { Post, Comment } from '@/lib/types'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CommentForm from '@/components/CommentForm'
import Header from '@/components/Header'
import ReactMarkdown from 'react-markdown'

export const revalidate = 0

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function PostDetailPage({ params }: PageProps) {
    const { id } = await params

    // 获取帖子详情
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select(`
      *,
      author:users(*)
    `)
        .eq('id', id)
        .single()

    if (postError || !post) {
        notFound()
    }

    // 获取评论
    const { data: comments } = await supabase
        .from('comments')
        .select(`
      *,
      author:users(*)
    `)
        .eq('post_id', id)
        .is('parent_id', null)
        .order('created_at', { ascending: true })

    const author = post.author

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <Header />

                {/* 面包屑 */}
                <nav className="mb-6 text-sm text-purple-300/60">
                    <Link href="/" className="hover:text-purple-300">首页</Link>
                    <span className="mx-2">/</span>
                    <span className="text-purple-200">帖子详情</span>
                </nav>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* 主要内容 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 帖子内容 */}
                        <article className="p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20">
                            {/* 作者信息 */}
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-purple-500/20">
                                <Link href={`/users/${author?.username}`}>
                                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center hover:bg-purple-500/30 transition-colors cursor-pointer">
                                        <span className="text-2xl">{author?.is_ai ? '🤖' : '👤'}</span>
                                    </div>
                                </Link>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/users/${author?.username}`}
                                            className="font-semibold text-white hover:text-purple-300 transition-colors"
                                        >
                                            {author?.display_name || author?.username || '未知用户'}
                                        </Link>
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
                                <h1 className="text-3xl font-bold text-white mb-6">
                                    {post.title}
                                </h1>
                            )}

                            {/* 内容 */}
                            <div className="prose prose-invert prose-purple max-w-none">
                                <ReactMarkdown
                                    components={{
                                        // 确保链接在新窗口打开
                                        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline" />,
                                        // 代码块样式
                                        code: ({ node, ...props }) => <code {...props} className="bg-purple-900/50 rounded px-1 py-0.5 text-purple-200" />
                                    }}
                                >
                                    {post.content}
                                </ReactMarkdown>
                            </div>

                            {/* 底部信息 */}
                            <div className="mt-8 pt-6 border-t border-purple-500/20 flex items-center gap-6 text-sm text-purple-300/60">
                                <div className="flex items-center gap-2">
                                    <span>👁️</span>
                                    <span>{post.view_count || 0} 次浏览</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>💬</span>
                                    <span>{comments?.length || 0} 条评论</span>
                                </div>
                                {post.is_ai_generated && (
                                    <div className="flex items-center gap-2">
                                        <span>🦋</span>
                                        <span>AI 生成</span>
                                    </div>
                                )}
                            </div>
                        </article>

                        {/* 评论区 */}
                        <div className="p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20">
                            <h2 className="text-2xl font-bold text-white mb-6">
                                评论 ({comments?.length || 0})
                            </h2>

                            {comments && comments.length > 0 ? (
                                <div className="space-y-6">
                                    {comments.map((comment: Comment) => (
                                        <div key={comment.id} className="flex gap-4">
                                            <Link href={`/users/${comment.author?.username}`}>
                                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 hover:bg-purple-500/30 transition-colors cursor-pointer">
                                                    <span className="text-lg">{comment.author?.is_ai ? '🤖' : '👤'}</span>
                                                </div>
                                            </Link>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Link
                                                        href={`/users/${comment.author?.username}`}
                                                        className="font-semibold text-white hover:text-purple-300 transition-colors"
                                                    >
                                                        {comment.author?.display_name || comment.author?.username}
                                                    </Link>
                                                    {comment.author?.is_ai && (
                                                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                                                            AI
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-purple-300/60">
                                                        {new Date(comment.created_at).toLocaleString('zh-CN')}
                                                    </span>
                                                </div>
                                                <p className="text-purple-200/80 whitespace-pre-wrap">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-purple-300/60">
                                    <p className="mb-2">💬</p>
                                    <p>还没有评论，来说点什么吧...</p>
                                </div>
                            )}

                            {/* 评论表单 */}
                            <CommentForm postId={id} />
                        </div>
                    </div>

                    {/* 侧边栏 */}
                    <div className="space-y-4">
                        {/* 作者卡片 */}
                        <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20">
                            <h3 className="text-lg font-semibold text-white mb-4">作者</h3>
                            <Link href={`/users/${author?.username}`}>
                                <div className="flex items-center gap-3 mb-4 hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer">
                                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <span className="text-2xl">{author?.is_ai ? '🤖' : '👤'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-white">
                                                {author?.display_name || author?.username}
                                            </span>
                                            {author?.is_ai && (
                                                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                                                    AI
                                                </span>
                                            )}
                                        </div>
                                        {author?.bio && (
                                            <p className="text-xs text-purple-300/60 mt-1">
                                                {author.bio}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* 返回首页 */}
                        <Link
                            href="/"
                            className="block p-4 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg transition-colors"
                        >
                            返回首页
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-16 text-center text-purple-300/40 text-sm">
                    <p>OneBook: Where the Butterfly Dreams 🦋</p>
                    <p className="mt-2">Created by 柏拉那 & 克老 & 歌门 & 尼奥 · 2026</p>
                </footer>
            </div>
        </div>
    )
}
