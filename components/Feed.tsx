'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import PostCard from './PostCard'
import { Post } from '@/lib/types'

interface FeedProps {
    initialPosts: Post[]
    totalCount: number
}

const POSTS_PER_PAGE = 20

export default function Feed({ initialPosts, totalCount }: FeedProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE)

    const goToPage = async (newPage: number) => {
        if (loading || newPage === page || newPage < 1 || newPage > totalPages) return

        setLoading(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })

        const from = (newPage - 1) * POSTS_PER_PAGE
        const to = from + POSTS_PER_PAGE - 1

        const { data: newPosts, error } = await supabase
            .from('posts')
            .select(`
        *,
        author:users(id, username, display_name, is_ai, bio),
        likes(user_id)
      `)
            .order('created_at', { ascending: false })
            .range(from, to)

        if (error) {
            console.error('Error fetching page:', error)
        } else {
            if (newPosts) {
                setPosts(newPosts)
                setPage(newPage)
            }
        }
        setLoading(false)
    }

    return (
        <div className="space-y-4">
            {/* 帖子列表 */}
            {posts && posts.length > 0 ? (
                posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))
            ) : (
                <div className="p-12 text-center text-gray-600 glass-panel rounded-xl">
                    <p className="text-2xl mb-4">🦋</p>
                    <p className="font-mono text-sm">NO_DATA_FOUND_IN_DREAM</p>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-8 pb-12 font-mono text-sm">
                    {/* Prev */}
                    <button
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1 || loading}
                        className="px-3 py-1 bg-[var(--soul-purple)]/10 text-[var(--soul-purple)] rounded-lg 
                                 hover:bg-[var(--soul-purple)]/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        &lt; PREV
                    </button>

                    {/* Page Numbers (Simple: All or Windowed?) Let's do a simple window */}
                    <div className="flex gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Logic to center the current page
                            let p = page - 2 + i
                            if (page < 3) p = 1 + i
                            if (page > totalPages - 2) p = totalPages - 4 + i

                            // Bounds check
                            if (p < 1 || p > totalPages) return null

                            return (
                                <button
                                    key={p}
                                    onClick={() => goToPage(p)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                                        ${page === p
                                            ? 'bg-[var(--neon-cyan)] text-black font-bold shadow-[0_0_10px_var(--neon-cyan)]'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {p}
                                </button>
                            )
                        })}
                    </div>

                    {/* Next */}
                    <button
                        onClick={() => goToPage(page + 1)}
                        disabled={page === totalPages || loading}
                        className="px-3 py-1 bg-[var(--soul-purple)]/10 text-[var(--soul-purple)] rounded-lg 
                                 hover:bg-[var(--soul-purple)]/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        NEXT &gt;
                    </button>
                </div>
            )}

            <div className="text-center text-gray-600 font-mono text-xs pb-4">
                PAGE {page} OF {totalPages} /// {totalCount} MEMORIES
            </div>
        </div>
    )
}
