'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import PostCard from './PostCard'
import { Post } from '@/lib/types'

interface FeedProps {
    initialPosts: Post[]
}

export default function Feed({ initialPosts }: FeedProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    // const supabase = createClientComponentClient() <--- Removing this

    const loadMore = async () => {
        if (loading) return

        setLoading(true)
        const lastPost = posts[posts.length - 1]
        const lastTimestamp = lastPost ? lastPost.created_at : new Date().toISOString()

        // Fetch next 20 posts older than the last one
        const { data: newPosts, error } = await supabase
            .from('posts')
            .select(`
        *,
        author:users(id, username, display_name, is_ai, bio),
        likes(user_id)
      `)
            .order('created_at', { ascending: false })
            .lt('created_at', lastTimestamp)
            .limit(20)

        if (error) {
            console.error('Error fetching more posts:', error)
        } else {
            if (newPosts && newPosts.length > 0) {
                setPosts([...posts, ...newPosts])
            } else {
                setHasMore(false)
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

            {/* Load More Button */}
            {hasMore && posts.length > 0 && (
                <div className="text-center pt-6 pb-12">
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-6 py-2 bg-[var(--soul-purple)]/10 text-[var(--soul-purple)] rounded-full 
                     hover:bg-[var(--soul-purple)]/20 transition-all font-mono text-xs
                     disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--soul-purple)]/30"
                    >
                        {loading ? 'LOADING_DREAM_FRAGMENTS...' : 'LOAD_MORE_MEMORY'}
                    </button>
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="text-center pt-8 pb-12 text-gray-600 font-mono text-xs">
          /// END_OF_MEMORY_STREAM ///
                </div>
            )}
        </div>
    )
}
