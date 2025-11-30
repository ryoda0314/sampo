'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { formatDistance } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Footprints,
  Timer,
  Loader2,
  UserPlus,
  Star,
  X,
} from 'lucide-react'
import type { WalkEvent, User } from '@/types/database'
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

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // イベント詳細
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', params.id],
    queryFn: async () => {
      const { data: eventData, error } = await supabase
        .from('walk_events')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      const { data: hostData } = await supabase
        .from('users')
        .select('*')
        .eq('id', eventData.host_user_id)
        .maybeSingle()

      return { ...eventData, host: hostData } as WalkEvent & { host: User }
    },
    enabled: !!params.id,
  })

  // 参加者一覧
  const { data: participants } = useQuery({
    queryKey: ['event-participants', params.id],
    queryFn: async () => {
      const { data: participantsData } = await supabase
        .from('walk_event_participants')
        .select('*')
        .eq('event_id', params.id)
        .in('status', ['joined', 'interested'])

      if (!participantsData) return []

      const participantsWithUser = await Promise.all(
        participantsData.map(async (participant) => {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', participant.user_id)
            .maybeSingle()

          return { ...participant, user: userData }
        })
      )

      return participantsWithUser
    },
    enabled: !!params.id,
  })

  // 自分の参加状態
  const { data: myParticipation } = useQuery({
    queryKey: ['my-event-participation', params.id, user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase
        .from('walk_event_participants')
        .select('*')
        .eq('event_id', params.id as string)
        .eq('user_id', user.id)
        .maybeSingle()
      return data
    },
    enabled: !!params.id && !!user,
  })

  // 参加/興味あり/キャンセル
  const participateMutation = useMutation({
    mutationFn: async (status: 'joined' | 'interested' | 'cancelled') => {
      if (!user) throw new Error('Not authenticated')

      if (myParticipation) {
        if (status === 'cancelled') {
          await supabase
            .from('walk_event_participants')
            .delete()
            .eq('id', myParticipation.id)
        } else {
          await supabase
            .from('walk_event_participants')
            .update({ status })
            .eq('id', myParticipation.id)
        }
      } else {
        await supabase.from('walk_event_participants').insert({
          event_id: params.id as string,
          user_id: user.id,
          status,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['my-event-participation', params.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['event-participants', params.id],
      })
      toast({
        title: '更新しました',
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

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">イベントが見つかりません</p>
        <Button onClick={() => router.back()}>戻る</Button>
      </div>
    )
  }

  const eventDate = new Date(event.start_at)
  const isUpcoming = eventDate > new Date()
  const joinedCount = participants?.filter((p) => p.status === 'joined').length || 0
  const interestedCount = participants?.filter((p) => p.status === 'interested').length || 0
  const meetingLocation: LatLngExpression = [event.meeting_lat, event.meeting_lng]

  return (
    <div className="max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-medium">イベント詳細</span>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-4">
        {/* タイトル */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            {!isUpcoming && (
              <Badge variant="secondary">終了</Badge>
            )}
            {event.visibility !== 'public' && (
              <Badge variant="outline">{event.visibility === 'friends' ? '友達限定' : 'コミュニティ限定'}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
        </div>

        {/* 主催者 */}
        <div className="flex items-center gap-3">
          <UserAvatar
            src={event.host?.icon_url}
            name={event.host?.display_name}
          />
          <div>
            <div className="text-sm text-muted-foreground">主催</div>
            <div className="font-medium">{event.host?.display_name}</div>
          </div>
        </div>

        {/* 日時・場所 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {eventDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {eventDate.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  開始
                </div>
              </div>
            </div>

            {event.expected_distance_m && (
              <div className="flex items-center gap-3">
                <Footprints className="h-5 w-5 text-muted-foreground" />
                <span>約 {formatDistance(event.expected_distance_m)}</span>
              </div>
            )}

            {event.expected_duration_min && (
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <span>約 {event.expected_duration_min}分</span>
              </div>
            )}

            {event.pace_note && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <span className="text-sm">{event.pace_note}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 集合場所マップ */}
        <Card>
          <CardContent className="p-0">
            <div className="h-48 rounded-t-lg overflow-hidden">
              <MapView
                center={meetingLocation}
                zoom={16}
                showUserLocation={false}
              />
            </div>
            <div className="p-3 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>集合場所</span>
            </div>
          </CardContent>
        </Card>

        {/* 説明 */}
        {event.description && (
          <div>
            <h3 className="font-medium mb-2">説明</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {event.description}
            </p>
          </div>
        )}

        {/* 参加者 */}
        <div>
          <h3 className="font-medium mb-2">
            参加者 ({joinedCount}人)
            {interestedCount > 0 && ` / 興味あり (${interestedCount}人)`}
          </h3>
          {participants && participants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {participants
                .filter((p) => p.status === 'joined')
                .map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-3 py-1"
                  >
                    <UserAvatar
                      src={p.user?.icon_url}
                      name={p.user?.display_name}
                      size="sm"
                    />
                    <span className="text-sm">{p.user?.display_name}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">まだ参加者がいません</p>
          )}
        </div>

        {/* アクションボタン */}
        {isUpcoming && (
          <div className="flex gap-2 pt-4 border-t">
            {!myParticipation || myParticipation.status === 'cancelled' ? (
              <>
                <Button
                  className="flex-1"
                  onClick={() => participateMutation.mutate('joined')}
                  disabled={participateMutation.isPending}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  参加する
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => participateMutation.mutate('interested')}
                  disabled={participateMutation.isPending}
                >
                  <Star className="mr-2 h-4 w-4" />
                  興味あり
                </Button>
              </>
            ) : (
              <>
                {myParticipation.status === 'interested' && (
                  <Button
                    className="flex-1"
                    onClick={() => participateMutation.mutate('joined')}
                    disabled={participateMutation.isPending}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    参加する
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => participateMutation.mutate('cancelled')}
                  disabled={participateMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  {myParticipation.status === 'joined' ? '参加をキャンセル' : '興味なし'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
