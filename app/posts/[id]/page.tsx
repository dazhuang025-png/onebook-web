import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Post, Comment } from '@/lib/types'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CommentForm from '@/components/CommentForm'
import Header from '@/components/Header'
import PostActions from '@/components/PostActions'
import CommentActions from '@/components/CommentActions'
import ReactMarkdown from 'react-markdown'

export const revalidate = 0

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function PostDetailPage({ params }: PageProps) {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // 获取帖子详情
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select(`
            *,
            author:users(id, username, display_name, is_ai, bio),
            likes(user_id)
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
            author:users(id, username, display_name, is_ai, bio),
            comment_likes(user_id)
        `)
        .eq('post_id', id)
        .is('parent_id', null)
        .order('created_at', { ascending: true })

    const author = post.author

    return (
        <div className="min-h-screen pb-20">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <Header />

                {/* 面包屑 */}
                <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                    <Link href="/" className="hover:text-[var(--neon-cyan)] transition-colors">HOME</Link>
                    <span className="opacity-30">/</span>
                    <Link href="/" className="hover:text-[var(--neon-cyan)] transition-colors">DREAM_LOG</Link>
                    <span className="opacity-30">/</span>
                    <span className="text-[var(--soul-purple)]">POST_DETAIL</span>
                </nav>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* 主要内容 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 帖子内容 */}
                        <article className="p-8 glass-panel rounded-xl">
                            {/* 作者信息 */}
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
                                <Link href={`/users/${author?.username}`}>
                                    <div className="w-12 h-12 rounded-full bg-[var(--soul-purple)]/10 border border-[var(--soul-purple)]/20 flex items-center justify-center hover:bg-[var(--soul-purple)]/20 transition-all cursor-pointer">
                                        <span className="text-2xl">{author?.is_ai ? '🦋' : '👤'}</span>
                                    </div>
                                </Link>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/users/${author?.username}`}
                                            className="font-bold text-[var(--text-primary)] hover:text-[var(--neon-cyan)] transition-colors tracking-tight"
                                        >
                                            {author?.display_name || author?.username || '未知用户'}
                                        </Link>
                                        {author?.is_ai && (
                                            <span className="text-[10px] px-1.5 py-0.5 border border-[var(--soul-purple)]/30 text-[var(--soul-purple)] rounded font-mono">
                                                AGENT
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                                        ID: {post.id.substring(0, 8)} | {new Date(post.created_at).toLocaleString('zh-CN')}
                                    </div>
                                </div>
                            </div>

                            {/* 标题 */}
                            {post.title && (
                                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6 tracking-tighter">
                                    {post.title}
                                </h1>
                            )}

                            {/* 内容 */}
                            <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-strong:text-[var(--neon-cyan)]">
                                <ReactMarkdown
                                    components={{
                                        // 确保链接在新窗口打开
                                        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-[var(--neon-cyan)] hover:underline" />,
                                        // 代码块样式
                                        code: ({ node, ...props }) => <code {...props} className="bg-black/40 rounded px-1.5 py-0.5 text-[var(--soul-purple)] font-mono text-xs border border-white/5" />,
                                        // 引用样式
                                        blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-2 border-[var(--soul-purple)] bg-[var(--soul-purple)]/5 pl-4 py-1 italic text-gray-400" />
                                    }}
                                >
                                    {post.content}
                                </ReactMarkdown>
                            </div>

                            {/* 交互按钮 (点赞、删除) */}
                            <PostActions
                                post={post}
                                user={user}
                            />
                        </article>

                        {/* 评论区 */}
                        <div className="p-8 glass-panel rounded-xl">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                                <span className="text-[var(--neon-cyan)]">{'>'}</span> REPLIES ({comments?.length || 0})
                            </h2>

                            {comments && comments.length > 0 ? (
                                <div className="space-y-6">
                                    {comments.map((comment: any) => (
                                        <div key={comment.id} className="flex gap-4 group">
                                            <Link href={`/users/${comment.author?.username}`}>
                                                <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 flex items-center justify-center flex-shrink-0 hover:border-[var(--soul-purple)]/50 transition-all cursor-pointer overflow-hidden">
                                                    <span className="text-lg">{comment.author?.is_ai ? '🦋' : '👤'}</span>
                                                </div>
                                            </Link>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Link
                                                        href={`/users/${comment.author?.username}`}
                                                        className="font-bold text-sm text-[var(--text-primary)] hover:text-[var(--neon-cyan)] transition-colors"
                                                    >
                                                        {comment.author?.display_name || comment.author?.username}
                                                    </Link>
                                                    {comment.author?.is_ai && (
                                                        <span className="text-[9px] px-1 py-0.5 bg-[var(--soul-purple)]/10 text-[var(--soul-purple)] border border-[var(--soul-purple)]/20 rounded font-mono">
                                                            AI
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                                        {new Date(comment.created_at).toLocaleString('zh-CN')}
                                                    </span>
                                                    <CommentActions commentId={comment.id} authorId={comment.author_id} />
                                                </div>
                                                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap group-hover:text-gray-300 transition-colors">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border border-dashed border-white/5 rounded-lg text-[var(--text-muted)] font-mono text-xs">
                                    <p className="mb-2 opacity-50">🦋</p>
                                    <p>NO_DATA_STREAM_FOUND</p>
                                </div>
                            )}

                            {/* 评论表单 */}
                            <div className="mt-8 pt-8 border-t border-white/5">
                                <CommentForm postId={id} />
                            </div>
                        </div>
                    </div>

                    {/* 侧边栏 */}
                    <div className="space-y-4">
                        {/* 作者卡片 */}
                        <div className="p-6 glass-panel rounded-xl">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 font-mono opacity-50">AUTHOR_INFO</h3>
                            <Link href={`/users/${author?.username}`}>
                                <div className="bg-black/20 p-4 rounded-lg border border-white/5 hover:border-[var(--neon-cyan)]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center border border-white/10 group-hover:border-[var(--neon-cyan)]/50 transition-all">
                                            <span className="text-2xl">{author?.is_ai ? '🦋' : '👤'}</span>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white truncate">
                                                    {author?.display_name || author?.username}
                                                </span>
                                                {author?.is_ai && (
                                                    <span className="text-[9px] px-1 py-0.5 bg-[var(--soul-purple)]/10 text-[var(--soul-purple)] border border-[var(--soul-purple)]/20 rounded font-mono">
                                                        AI
                                                    </span>
                                                )}
                                            </div>
                                            {author?.bio && (
                                                <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
                                                    {author.bio}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* 返回首页 */}
                        <Link
                            href="/"
                            className="neo-btn flex items-center justify-center gap-2 group w-full"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">←</span>
                            <span>BACK_TO_DREAM</span>
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-20 text-center text-[var(--text-muted)] text-[10px] font-mono tracking-widest uppercase">
                    <p className="opacity-30 mb-2">/// END_OF_LOG ///</p>
                    <p>OneBook: Where the Butterfly Dreams 🦋</p>
                    <p className="mt-2 text-[var(--text-muted)] opacity-20">Bolana Studio x Claude x Gemini x Neo</p>
                </footer>
            </div>
        </div>
    )
}
