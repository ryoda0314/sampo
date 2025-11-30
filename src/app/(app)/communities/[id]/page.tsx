'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PostCard } from '@/components/post-card'
import { UserAvatar } from '@/components/user-avatar'
import { formatDistance } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Users,
  Trophy,
  Loader2,
  UserPlus,
  UserMinus,
} from 'lucide-react'
import type { Community, User, PostWithUser } from '@/types/database'

interface RankingEntry {
  user: User
  total_distance_m: number
}

export default function CommunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // コミュニティ詳細
  const { data: community, isLoading } = useQuery({
    queryKey: ['community', params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      return data as Community
    },
    enabled: !!params.id,
  })

  // メンバー数
  const { data: membersCount } = useQuery({
    queryKey: ['community-members-count', params.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', params.id)
      return count || 0
    },
    enabled: !!params.id,
  })

  // 参加状態
  const { data: isMember } = useQuery({
    queryKey: ['community-membership', params.id, user?.id],
    queryFn: async () => {
      if (!user) return false
      const { data } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', params.id as string)
        .eq('user_id', user.id)
        .maybeSingle()
      return !!data
    },
    enabled: !!params.id && !!user,
  })

  // コミュニティ内の投稿
  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['community-posts', params.id],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('community_id', params.id)
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
    enabled: !!params.id,
  })

  // 週間ランキング
  const { data: weeklyRanking } = useQuery({
    queryKey: ['community-ranking-week', params.id],
    queryFn: async () => {
      // コミュニティメンバーのIDを取得
      const { data: members } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('community_id', params.id)

      if (!members || members.length === 0) return []

      const memberIds = members.map((m) => m.user_id)

      // 今週の開始日を計算
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)

      // 各メンバーの今週の歩行距離を集計
      const rankings: RankingEntry[] = []

      for (const memberId of memberIds) {
        const { data: walks } = await supabase
          .from('walk_records')
          .select('total_distance_m')
          .eq('user_id', memberId)
          .gte('started_at', weekStart.toISOString())

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', memberId)
          .maybeSingle()

        if (userData) {
          const totalDistance =
            walks?.reduce((sum, w) => sum + (w.total_distance_m || 0), 0) || 0
          rankings.push({
            user: userData,
            total_distance_m: totalDistance,
          })
        }
      }

      return rankings
        .sort((a, b) => b.total_distance_m - a.total_distance_m)
        .slice(0, 10)
    },
    enabled: !!params.id,
  })

  // 参加/退出ミューテーション
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')

      if (isMember) {
        await supabase
          .from('community_members')
          .delete()
          .eq('community_id', params.id as string)
          .eq('user_id', user.id)
      } else {
        await supabase.from('community_members').insert({
          community_id: params.id as string,
          user_id: user.id,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['community-membership', params.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['community-members-count', params.id],
      })
      toast({
        title: isMember ? '退出しました' : '参加しました',
      })
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '操作に失敗しました',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!community) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">コミュニティが見つかりません</p>
        <Button onClick={() => router.back()}>戻る</Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold truncate">{community.name}</h1>
      </div>

      {/* コミュニティ情報 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{community.name}</h2>
              {community.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {community.description}
                </p>
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <Users className="h-4 w-4" />
                <span>{membersCount}人が参加中</span>
              </div>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            variant={isMember ? 'outline' : 'default'}
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isMember ? (
              <UserMinus className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isMember ? 'コミュニティを退出' : 'コミュニティに参加'}
          </Button>
        </CardContent>
      </Card>

      {/* タブ */}
      <Tabs defaultValue="posts">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">投稿</TabsTrigger>
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {isPostsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              投稿がありません
            </div>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-yellow-500" />
                週間ランキング
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyRanking && weeklyRanking.length > 0 ? (
                <div className="space-y-3">
                  {weeklyRanking.map((entry, index) => (
                    <div
                      key={entry.user.id}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                            ? 'bg-gray-100 text-gray-600'
                            : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <UserAvatar
                        src={entry.user.icon_url}
                        name={entry.user.display_name}
                        size="sm"
                      />
                      <div className="flex-1 truncate">
                        {entry.user.display_name}
                      </div>
                      <div className="font-medium text-primary">
                        {formatDistance(entry.total_distance_m)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  今週のデータはありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
