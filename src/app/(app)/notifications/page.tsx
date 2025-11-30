'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'
import { formatRelativeTime } from '@/lib/utils'
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  Users,
  Calendar,
  UserPlus,
  Loader2,
  Check,
} from 'lucide-react'
import type { Notification, User } from '@/types/database'

interface NotificationWithDetails extends Notification {
  actor?: User
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // アクター情報を取得
      const notificationsWithDetails = await Promise.all(
        (data || []).map(async (notification) => {
          let actor: User | undefined
          const payload = notification.payload as any

          if (payload?.liker_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', payload.liker_id)
              .maybeSingle()
            actor = userData || undefined
          }

          return {
            ...notification,
            actor,
          } as NotificationWithDetails
        })
      )

      return notificationsWithDetails
    },
    enabled: !!user,
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] })
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] })
    },
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" />
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />
      case 'community_notice':
        return <Users className="h-5 w-5 text-green-500" />
      case 'event_reminder':
        return <Calendar className="h-5 w-5 text-orange-500" />
      case 'friend_request':
        return <UserPlus className="h-5 w-5 text-purple-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationMessage = (notification: NotificationWithDetails) => {
    const payload = notification.payload as any

    switch (notification.type) {
      case 'like':
        return `${notification.actor?.display_name || 'ユーザー'}があなたの投稿にいいねしました`
      case 'comment':
        return `${notification.actor?.display_name || 'ユーザー'}があなたの投稿にコメントしました`
      case 'community_notice':
        return 'コミュニティからのお知らせがあります'
      case 'event_reminder':
        return 'イベントの開始時間が近づいています'
      case 'friend_request':
        return `${notification.actor?.display_name || 'ユーザー'}からフレンドリクエストが届きました`
      default:
        return '新しい通知があります'
    }
  }

  const handleNotificationClick = async (notification: NotificationWithDetails) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id)
    }

    const payload = notification.payload as any

    switch (notification.type) {
      case 'like':
      case 'comment':
        if (payload?.post_id) {
          router.push(`/posts/${payload.post_id}`)
        }
        break
      case 'event_reminder':
        if (payload?.event_id) {
          router.push(`/events/${payload.event_id}`)
        }
        break
      case 'community_notice':
        if (payload?.community_id) {
          router.push(`/communities/${payload.community_id}`)
        }
        break
    }
  }

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">通知</h1>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Check className="mr-1 h-4 w-4" />
            すべて既読
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 bg-muted rounded-full">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {getNotificationMessage(notification)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Bell className="h-12 w-12 mb-2 opacity-50" />
          <p>通知はありません</p>
        </div>
      )}
    </div>
  )
}
