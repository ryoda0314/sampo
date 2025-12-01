'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/user-avatar'
import { PostCard } from '@/components/post-card'
import { formatDistance } from '@/lib/utils'
import {
  ArrowLeft,
  Footprints,
  Loader2,
  UserPlus,
  UserMinus,
  UserCheck,
  Clock,
} from 'lucide-react'
import type { PostWithUser, WalkRecord, User } from '@/types/database'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const { user: currentUser } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // ユーザー情報を取得
  const { data: profileUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data as User
    },
  })

  // 友達関係を取得
  const { data: friendship, isLoading: isFriendshipLoading } = useQuery({
    queryKey: ['friendship', currentUser?.id, userId],
    queryFn: async () => {
      if (!currentUser) return null

      // 自分が送ったリクエスト
      const { data: sent } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('friend_user_id', userId)
        .maybeSingle()

      if (sent) return { ...sent, direction: 'sent' }

      // 相手から受けたリクエスト
      const { data: received } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', userId)
        .eq('friend_user_id', currentUser.id)
        .maybeSingle()

      if (received) return { ...received, direction: 'received' }

      return null
    },
    enabled: !!currentUser && currentUser.id !== userId,
  })

  // 統計情報を取得
  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const { data: walks } = await supabase
        .from('walk_records')
        .select('total_distance_m, total_time_sec')
        .eq('user_id', userId)

      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_deleted', false)

      const { count: tilesCount } = await supabase
        .from('explore_tiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const totalDistance = walks?.reduce(
        (sum, walk) => sum + (walk.total_distance_m || 0),
        0
      ) || 0
      const totalWalks = walks?.length || 0

      return {
        totalDistance,
        totalWalks,
        postsCount: postsCount || 0,
        tilesCount: tilesCount || 0,
      }
    },
  })

  // ユーザーの投稿を取得
  const { data: userPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['user-posts', userId, currentUser?.id],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!postsData || postsData.length === 0) return []

      const postIds = postsData.map((p) => p.id)

      // いいね数を一括取得
      const { data: likeCounts } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)

      const likeCountMap = new Map<string, number>()
      likeCounts?.forEach((like) => {
        likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) || 0) + 1)
      })

      // 自分がいいねした投稿を一括取得
      let userLikedPosts = new Set<string>()
      if (currentUser) {
        const { data: userLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', currentUser.id)
          .in('post_id', postIds)

        userLikes?.forEach((like) => userLikedPosts.add(like.post_id))
      }

      return postsData.map((post) => ({
        ...post,
        user: profileUser,
        likes_count: likeCountMap.get(post.id) || 0,
        is_liked: userLikedPosts.has(post.id),
      })) as PostWithUser[]
    },
    enabled: !!profileUser,
  })

  // 散歩履歴を取得
  const { data: walkRecords, isLoading: isWalksLoading } = useQuery({
    queryKey: ['user-walks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('walk_records')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data as WalkRecord[]
    },
  })

  // 友達申請を送る
  const sendFriendRequest = useMutation({
    mutationFn: async () => {
      if (!currentUser) return

      const { error } = await supabase.from('friendships').insert({
        user_id: currentUser.id,
        friend_user_id: userId,
        status: 'pending',
      })

      if (error) throw error

      // 通知を作成
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'friend_request',
        payload: {
          from_user_id: currentUser.id,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship', currentUser?.id, userId] })
    },
  })

  // 友達申請を承認
  const acceptFriendRequest = useMutation({
    mutationFn: async () => {
      if (!friendship) return

      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendship.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship', currentUser?.id, userId] })
    },
  })

  // 友達を解除
  const removeFriend = useMutation({
    mutationFn: async () => {
      if (!friendship) return

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendship.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship', currentUser?.id, userId] })
    },
  })

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">ユーザーが見つかりません</p>
        <Button variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === userId
  const isFriend = friendship?.status === 'accepted'
  const isPending = friendship?.status === 'pending'
  const isReceivedRequest = isPending && friendship?.direction === 'received'
  const isSentRequest = isPending && friendship?.direction === 'sent'

  const renderFriendButton = () => {
    if (isOwnProfile) return null

    if (isFriend) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => removeFriend.mutate()}
          disabled={removeFriend.isPending}
        >
          <UserMinus className="mr-2 h-4 w-4" />
          友達解除
        </Button>
      )
    }

    if (isReceivedRequest) {
      return (
        <Button
          size="sm"
          onClick={() => acceptFriendRequest.mutate()}
          disabled={acceptFriendRequest.isPending}
        >
          <UserCheck className="mr-2 h-4 w-4" />
          承認する
        </Button>
      )
    }

    if (isSentRequest) {
      return (
        <Button variant="outline" size="sm" disabled>
          <Clock className="mr-2 h-4 w-4" />
          申請中
        </Button>
      )
    }

    return (
      <Button
        size="sm"
        onClick={() => sendFriendRequest.mutate()}
        disabled={sendFriendRequest.isPending}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        友達申請
      </Button>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">プロフィール</h1>
      </div>

      {/* プロフィールカード */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profileUser.icon_url}
              name={profileUser.display_name}
              size="lg"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profileUser.display_name}</h2>
              {profileUser.bio && (
                <p className="text-sm text-muted-foreground mt-1">
                  {profileUser.bio}
                </p>
              )}
            </div>
            {renderFriendButton()}
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {stats?.totalWalks || 0}
              </div>
              <div className="text-xs text-muted-foreground">散歩</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {stats ? formatDistance(stats.totalDistance) : '0m'}
              </div>
              <div className="text-xs text-muted-foreground">総距離</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {stats?.postsCount || 0}
              </div>
              <div className="text-xs text-muted-foreground">投稿</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {stats?.tilesCount || 0}
              </div>
              <div className="text-xs text-muted-foreground">踏破</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブコンテンツ */}
      <Tabs defaultValue="posts">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">投稿</TabsTrigger>
          <TabsTrigger value="walks">散歩履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {isPostsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userPosts && userPosts.length > 0 ? (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              まだ投稿がありません
            </div>
          )}
        </TabsContent>

        <TabsContent value="walks" className="mt-4">
          {isWalksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : walkRecords && walkRecords.length > 0 ? (
            <div className="space-y-3">
              {walkRecords.map((walk) => (
                <Card key={walk.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/walks/${walk.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Footprints className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {formatDistance(walk.total_distance_m)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(walk.started_at).toLocaleDateString('ja-JP', {
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.floor(walk.total_time_sec / 60)}分
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              まだ散歩記録がありません
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
