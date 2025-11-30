'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { formatRelativeTime } from '@/lib/utils'
import {
  ArrowLeft,
  Heart,
  MapPin,
  Share2,
  MoreHorizontal,
  Loader2,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import type { PostWithUser } from '@/types/database'
import type { LatLngExpression } from 'leaflet'

const MapView = dynamic(
  () => import('@/components/map/map-view').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-muted flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  }
)

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)

  const { data: post, isLoading, refetch } = useQuery({
    queryKey: ['post', params.id],
    queryFn: async () => {
      const { data: postData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      // ユーザー情報を取得
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', postData.user_id)
        .maybeSingle()

      // いいね数を取得
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', params.id)

      // 自分がいいねしているか確認
      let liked = false
      if (user) {
        const { data: like } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', params.id as string)
          .eq('user_id', user.id)
          .maybeSingle()
        liked = !!like
      }

      setLikesCount(count || 0)
      setIsLiked(liked)

      return {
        ...postData,
        user: userData,
        likes_count: count || 0,
        is_liked: liked,
      } as PostWithUser
    },
    enabled: !!params.id,
  })

  const handleLike = async () => {
    if (!user || !post) return

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
  }

  const handleDelete = async () => {
    if (!user || !post) return

    if (!confirm('この投稿を削除しますか？')) return

    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', post.id)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '削除に失敗しました',
      })
      return
    }

    toast({
      title: '削除完了',
      description: '投稿を削除しました',
    })
    router.push('/')
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: '散歩の発見',
        text: post?.text,
        url: window.location.href,
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: 'コピー完了',
        description: 'URLをコピーしました',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">投稿が見つかりません</p>
        <Button onClick={() => router.back()}>戻る</Button>
      </div>
    )
  }

  const postLocation: LatLngExpression = [post.lat, post.lng]

  return (
    <div className="max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b sticky top-14 bg-background z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-medium">投稿詳細</span>
        </div>
        {user && user.id === post.user_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除する
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 投稿コンテンツ */}
      <div className="p-4">
        {/* ユーザー情報 */}
        <div className="flex items-center gap-3 mb-4">
          <UserAvatar
            src={post.user?.icon_url}
            name={post.user?.display_name}
          />
          <div>
            <div className="font-medium">
              {post.user?.display_name || 'ユーザー'}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatRelativeTime(post.created_at)}
            </div>
          </div>
        </div>

        {/* テキスト */}
        <p className="text-base whitespace-pre-wrap mb-4">{post.text}</p>

        {/* 画像 */}
        {post.image_url && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-4">
            <Image
              src={post.image_url}
              alt="投稿画像"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* タグ */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* マップ */}
        <Card className="mb-4">
          <CardContent className="p-0">
            <div className="h-48 rounded-lg overflow-hidden">
              <MapView
                center={postLocation}
                zoom={15}
                showUserLocation={false}
                posts={[post]}
              />
            </div>
            <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {post.lat.toFixed(4)}, {post.lng.toFixed(4)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex items-center gap-2 border-t pt-4">
          <Button
            variant="ghost"
            className={`flex-1 gap-2 ${
              isLiked ? 'text-red-500' : 'text-muted-foreground'
            }`}
            onClick={handleLike}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount}</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-1 gap-2 text-muted-foreground"
            onClick={handleShare}
          >
            <Share2 className="h-5 w-5" />
            <span>シェア</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
