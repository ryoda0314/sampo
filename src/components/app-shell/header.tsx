'use client'

import Link from 'next/link'
import { Bell, Footprints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'

export function Header() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      if (!user) return 0
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      return count || 0
    },
    enabled: !!user,
    refetchInterval: 30000, // 30秒ごとに更新
  })

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Footprints className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">散歩</span>
        </Link>
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount && unreadCount > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            ) : null}
          </Button>
        </Link>
      </div>
    </header>
  )
}
