'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'
import { PostCard } from '@/components/post-card'
import { formatDistance, formatDuration } from '@/lib/utils'
import {
  ArrowLeft,
  Footprints,
  Clock,
  MapPin,
  Calendar,
  Loader2,
} from 'lucide-react'
import type { LatLngExpression } from 'leaflet'
import type { WalkRecord, User, PostWithUser } from '@/types/database'
import Link from 'next/link'

const MapView = dynamic(
  () => import('@/components/map/map-view').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
)

export default function WalkDetailPage() {
  const params = useParams()
  const router = useRouter()
  const walkId = params.id as string
  const { user: currentUser } = useAuth()
  const supabase = createClient()

  // 散歩記録を取得
  const { data: walkRecord, isLoading: isWalkLoading } = useQuery({
    queryKey: ['walk-record', walkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('walk_records')
        .select('*')
        .eq('id', walkId)
        .single()

      if (error) throw error
      return data as WalkRecord
    },
  })

  // ユーザー情報を取得
  const { data: walkUser } = useQuery({
    queryKey: ['walk-user', walkRecord?.user_id],
    queryFn: async () => {
      if (!walkRecord) return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', walkRecord.user_id)
        .single()

      if (error) throw error
      return data as User
    },
    enabled: !!walkRecord,
  })

  // この散歩に関連する投稿を取得
  const { data: relatedPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['walk-posts', walkId],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('walk_record_id', walkId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error

      const postsWithUser = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', post.user_id)
            .single()

          const { count } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)

          let isLiked = false
          if (currentUser) {
            const { data: like } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentUser.id)
              .maybeSingle()
            isLiked = !!like
          }

          return {
            ...post,
            user: userData,
            likes_count: count || 0,
            is_liked: isLiked,
          } as PostWithUser
        })
      )

      return postsWithUser
    },
  })

  if (isWalkLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!walkRecord) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">散歩記録が見つかりません</p>
        <Button variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    )
  }

  // ルートをGeoJSONから抽出
  const routeCoords: LatLngExpression[] = []
  if (walkRecord.route_geojson) {
    const geojson = walkRecord.route_geojson as { type: string; coordinates: number[][] }
    if (geojson.type === 'LineString' && geojson.coordinates) {
      geojson.coordinates.forEach((coord) => {
        routeCoords.push([coord[1], coord[0]] as LatLngExpression)
      })
    }
  }

  // ルートの中心点を計算
  const center: LatLngExpression | undefined = routeCoords.length > 0
    ? routeCoords[Math.floor(routeCoords.length / 2)]
    : undefined

  return (
    <div className="max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">散歩の詳細</h1>
      </div>

      {/* マップ */}
      {routeCoords.length > 0 && (
        <div className="h-64 w-full">
          <MapView
            center={center}
            route={routeCoords}
            zoom={15}
            showUserLocation={false}
          />
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* ユーザー情報 */}
        {walkUser && (
          <Card>
            <CardContent className="p-4">
              <Link href={`/users/${walkUser.id}`} className="flex items-center gap-3">
                <UserAvatar
                  src={walkUser.icon_url}
                  name={walkUser.display_name}
                />
                <div>
                  <div className="font-medium">{walkUser.display_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(walkRecord.started_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 統計情報 */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Footprints className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">距離</div>
                  <div className="text-xl font-bold">
                    {formatDistance(walkRecord.total_distance_m)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">時間</div>
                  <div className="text-xl font-bold">
                    {formatDuration(walkRecord.total_time_sec)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">開始</div>
                  <div className="font-medium">
                    {new Date(walkRecord.started_at).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">地点数</div>
                  <div className="font-medium">
                    {routeCoords.length}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 関連する投稿 */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              この散歩での投稿 ({relatedPosts.length}件)
            </h2>
            <div className="space-y-4">
              {relatedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}

        {isPostsLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
