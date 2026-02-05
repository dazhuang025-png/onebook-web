'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
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
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE)

    // Manual client creation to ensure browser compatibility
    // Using the package's createBrowserClient directly
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const goToPage = async (newPage: number) => {
        if (loading || newPage === page) return

        // Bounds check
        if (newPage < 1 || newPage > totalPages) {
            console.warn('Page out of bounds:', newPage)
            return
        }

        setLoading(true)
        setErrorMsg(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })

        try {
            const from = (newPage - 1) * POSTS_PER_PAGE
            const to = from + POSTS_PER_PAGE - 1

            console.log(`[Pagination] Fetching page ${newPage} (Range: ${from}-${to})...`)

            const { data: newPosts, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    author:users(id, username, display_name, is_ai, bio),
                    likes(user_id),
                    comments(count)
                `)
                .order('created_at', { ascending: false })
                .range(from, to)

            if (error) {
                console.error('[Pagination] Error:', error)
                setErrorMsg(`Failed to load page ${newPage}: ${error.message}`)
            } else {
                if (newPosts) {
                    console.log(`[Pagination] Loaded ${newPosts.length} posts.`)
                    setPosts(newPosts)
                    setPage(newPage)
                } else {
                    console.warn('[Pagination] No posts returned.')
                    setPosts([])
                }
            }
        } catch (e: any) {
            console.error('[Pagination] Exception:', e)
            setErrorMsg(`System Error: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Error Message */}
            {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm font-mono text-center">
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* 帖子列表 */}
            {posts && posts.length > 0 ? (
                posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))
            ) : (
                <div className="p-12 text-center text-gray-600 glass-panel rounded-xl">
                    <p className="text-2xl mb-4">🦋</p>
                    <p className="font-mono text-sm">
                        {loading ? 'LOADING_DREAM_FRAGMENT...' : 'NO_DATA_FOUND_IN_THIS_PAGE'}
                    </p>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 pt-8 pb-12 font-mono text-sm">
                    <div className="flex items-center gap-2">
                        {/* Prev */}
                        <button
                            onClick={() => goToPage(page - 1)}
                            disabled={page === 1 || loading}
                            className="px-3 py-1 bg-[var(--soul-purple)]/10 text-[var(--soul-purple)] rounded-lg 
                                     hover:bg-[var(--soul-purple)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            &lt; PREV
                        </button>

                        {/* Page Numbers Window */}
                        <div className="flex gap-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple windowing logic
                                let p = page - 2 + i
                                if (totalPages <= 5) p = 1 + i
                                else if (page < 3) p = 1 + i
                                else if (page > totalPages - 2) p = totalPages - 4 + i

                                if (p < 1 || p > totalPages) return null

                                return (
                                    <button
                                        key={p}
                                        onClick={() => goToPage(p)}
                                        disabled={loading}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border
                                            ${page === p
                                                ? 'bg-[var(--neon-cyan)] text-black border-[var(--neon-cyan)] font-bold shadow-[0_0_10px_var(--neon-cyan)]'
                                                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
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
                                     hover:bg-[var(--soul-purple)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            NEXT &gt;
                        </button>
                    </div>

                    <div className="text-gray-600 text-xs">
                        PAGE {page} OF {totalPages} /// TOTAL {totalCount} /// {loading ? 'SYNCING...' : 'READY'}
                    </div>
                </div>
            )}
        </div>
    )
}
