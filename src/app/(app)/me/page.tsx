'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/user-avatar'
import { PostCard } from '@/components/post-card'
import { formatDistance } from '@/lib/utils'
import {
  Settings,
  MapPin,
  Footprints,
  Calendar,
  Users,
  ChevronRight,
  Loader2,
  LogOut,
} from 'lucide-react'
import type { PostWithUser, WalkRecord } from '@/types/database'

export default function MyPage() {
  const { user, profile, signOut } = useAuth()
  const supabase = createClient()

  // 統計情報
  const { data: stats } = useQuery({
    queryKey: ['my-stats', user?.id],
    queryFn: async () => {
      if (!user) return null

      // 総歩行距離と総散歩数
      const { data: walks } = await supabase
        .from('walk_records')
        .select('total_distance_m, total_time_sec')
        .eq('user_id', user.id)

      // 投稿数
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_deleted', false)

      // 踏破タイル数
      const { count: tilesCount } = await supabase
        .from('explore_tiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

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
    enabled: !!user,
  })

  // 自分の投稿
  const { data: myPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['my-posts', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const postsWithUser = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', post.user_id)
            .maybeSingle()

          return {
            ...post,
            user: userData,
            likes_count: 0,
            is_liked: false,
          } as PostWithUser
        })
      )

      return postsWithUser
    },
    enabled: !!user,
  })

  // 散歩履歴
  const { data: walkRecords, isLoading: isWalksLoading } = useQuery({
    queryKey: ['my-walks', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('walk_records')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data as WalkRecord[]
    },
    enabled: !!user,
  })

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* プロフィールヘッダー */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profile?.icon_url}
              name={profile?.display_name}
              size="lg"
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold">
                {profile?.display_name || 'ユーザー'}
              </h1>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.bio}
                </p>
              )}
            </div>
            <Link href="/me/edit">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
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

      {/* メニュー */}
      <Card className="mb-4">
        <CardContent className="p-0">
          <Link
            href="/communities"
            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>コミュニティ</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="border-t" />
          <Link
            href="/events"
            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>イベント</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
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
          ) : myPosts && myPosts.length > 0 ? (
            <div className="space-y-4">
              {myPosts.map((post) => (
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
                <Card key={walk.id}>
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

      {/* ログアウト */}
      <div className="mt-8 pb-4">
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </div>
  )
}
