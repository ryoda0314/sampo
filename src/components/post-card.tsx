'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin, MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { formatRelativeTime, formatDistance } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import type { PostWithUser } from '@/types/database'

interface PostCardProps {
  post: PostWithUser
  onLikeChange?: () => void
}

export function PostCard({ post, onLikeChange }: PostCardProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async () => {
    if (!user || isLiking) return
    setIsLiking(true)

    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id)
      setIsLiked(false)
      setLikesCount((prev) => Math.max(0, prev - 1))
    } else {
      await supabase.from('post_likes').insert({
        post_id: post.id,
        user_id: user.id,
      })
      setIsLiked(true)
      setLikesCount((prev) => prev + 1)

      // 通知を作成（自分自身への通知は除く）
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'like',
          payload: {
            post_id: post.id,
            liker_id: user.id,
          },
        })
      }
    }

    setIsLiking(false)
    onLikeChange?.()
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Link href={`/users/${post.user_id}`}>
            <UserAvatar
              src={post.user?.icon_url}
              name={post.user?.display_name}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/users/${post.user_id}`}
                className="font-medium truncate hover:underline"
              >
                {post.user?.display_name || 'ユーザー'}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(post.created_at)}
              </span>
            </div>

            <Link href={`/posts/${post.id}`}>
              <p className="mt-2 text-sm whitespace-pre-wrap">{post.text}</p>

              {post.image_url && (
                <div className="mt-3 relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={post.image_url}
                    alt="投稿画像"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </Link>

            {post.tags && post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1 px-2 ${
                  isLiked ? 'text-red-500' : 'text-muted-foreground'
                }`}
                onClick={handleLike}
                disabled={isLiking}
              >
                <Heart
                  className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`}
                />
                <span className="text-xs">{likesCount}</span>
              </Button>

              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-xs">
                  {post.lat.toFixed(4)}, {post.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
