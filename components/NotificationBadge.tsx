'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0)

  // Function to fetch count
  const fetchCount = async () => {
    try {
      const res = await fetch('/api/user/notifications/count')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error)
    }
  }

  // Poll every 30 seconds
  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  if (unreadCount === 0) return null

  return (
    <Link
      href="/notifications"
      className="relative group flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
      title={`${unreadCount} unread interactions`}
    >
      <span className="text-lg">🔔</span>
      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </Link>
  )
}
