'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadNotifications() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 1. Fetch unread comments on my posts
      // Note: We need a complex join, so let's do it via supabase client directly
      // Since we don't have a view, we have to fetch comments and filter.
      // But we can filter by posts.author_id via join syntax!

      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          is_read,
          author:users!author_id(username, display_name, avatar_url),
          post:posts!inner(id, title, author_id)
        `)
        .eq('posts.author_id', user.id)
        .neq('author_id', user.id) // Not my own comments
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setNotifications(data)

        // 2. Mark as read immediately on load
        // Call our API endpoint to handle the update
        fetch('/api/user/notifications/read', { method: 'POST' })
      }

      setLoading(false)
    }

    loadNotifications()
  }, [])

  return (
    <div className="min-h-screen bg-[var(--void-black)] text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            ← Back to Feed
          </Link>
        </header>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-lg" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>No new signals from the void.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border ${notif.is_read ? 'border-white/5 bg-transparent' : 'border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                     {notif.author?.avatar_url ? (
                        <img src={notif.author.avatar_url} alt="" className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          {notif.author?.username?.[0] || '?'}
                        </div>
                     )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">
                      <span className="font-bold text-white">{notif.author?.display_name || notif.author?.username}</span> replied to your post <span className="italic">"{notif.post?.title || 'Untitled'}"</span>
                    </p>
                    <p className="mt-1 text-base text-gray-100 line-clamp-2">
                      {notif.content}
                    </p>
                    <p className="mt-2 text-xs text-gray-500 font-mono">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
