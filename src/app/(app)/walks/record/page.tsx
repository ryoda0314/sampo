'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { useGeolocation, latLngToTileKey } from '@/hooks/use-geolocation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { formatDistance, formatDuration } from '@/lib/utils'
import {
  Play,
  Square,
  MapPin,
  Clock,
  Footprints,
  Loader2,
  ArrowLeft,
  Camera,
} from 'lucide-react'
import type { LatLngExpression } from 'leaflet'

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

export default function WalkRecordPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)
  const [walkId, setWalkId] = useState<string | null>(null)

  const {
    position,
    positions,
    isTracking,
    startTracking,
    stopTracking,
    totalDistance,
    elapsedTime,
    error,
  } = useGeolocation()

  const handleStart = async () => {
    if (!user) return

    // 散歩レコードを作成
    const { data, error } = await supabase
      .from('walk_records')
      .insert({
        user_id: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '散歩の開始に失敗しました',
      })
      return
    }

    setWalkId(data.id)
    startTracking()
  }

  const handleStop = async () => {
    stopTracking()

    if (!walkId || !user) return

    setIsSaving(true)

    // GeoJSONフォーマットでルートを保存
    const routeGeoJson = {
      type: 'LineString',
      coordinates: positions.map((p) => [p.lng, p.lat]),
    }

    // 散歩レコードを更新
    const { error: walkError } = await supabase
      .from('walk_records')
      .update({
        ended_at: new Date().toISOString(),
        total_distance_m: totalDistance,
        total_time_sec: elapsedTime,
        route_geojson: routeGeoJson,
      })
      .eq('id', walkId)

    if (walkError) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '散歩の保存に失敗しました',
      })
      setIsSaving(false)
      return
    }

    // 踏破タイルを保存
    const tileKeys = new Set<string>()
    positions.forEach((p) => {
      const tileKey = latLngToTileKey(p.lat, p.lng)
      tileKeys.add(tileKey)
    })

    const tileInserts = Array.from(tileKeys).map((tile_key) => ({
      user_id: user.id,
      tile_key,
    }))

    if (tileInserts.length > 0) {
      await supabase.from('explore_tiles').upsert(tileInserts, {
        onConflict: 'user_id,tile_key',
      })
    }

    toast({
      title: '散歩完了！',
      description: `${formatDistance(totalDistance)} / ${formatDuration(elapsedTime)}`,
    })

    setIsSaving(false)

    // 投稿作成画面に遷移
    router.push(`/posts/create?walkId=${walkId}`)
  }

  const routeCoords: LatLngExpression[] = positions.map((p) => [p.lat, p.lng])
  const currentCenter: LatLngExpression | undefined = position
    ? [position.lat, position.lng]
    : undefined

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {isTracking ? '散歩中' : '散歩を記録'}
        </h1>
      </div>

      {/* 地図 */}
      <div className="flex-1 relative">
        <MapView
          center={currentCenter}
          route={routeCoords}
          showUserLocation={true}
          zoom={17}
        />

        {/* エラー表示 */}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-destructive/90 text-white p-3 rounded-lg text-sm">
            位置情報エラー: {error}
          </div>
        )}
      </div>

      {/* ステータスカード */}
      <Card className="rounded-none border-x-0 border-b-0">
        <CardContent className="p-4">
          {/* 統計情報 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Footprints className="h-4 w-4" />
                <span className="text-xs">距離</span>
              </div>
              <div className="text-xl font-bold text-primary">
                {formatDistance(totalDistance)}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">時間</span>
              </div>
              <div className="text-xl font-bold">
                {formatDuration(elapsedTime)}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-xs">地点</span>
              </div>
              <div className="text-xl font-bold">{positions.length}</div>
            </div>
          </div>

          {/* コントロールボタン */}
          <div className="flex gap-2">
            {!isTracking ? (
              <Button
                className="flex-1 h-12"
                onClick={handleStart}
                disabled={isSaving}
              >
                <Play className="mr-2 h-5 w-5" />
                散歩を始める
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => router.push(`/posts/create?walkId=${walkId}`)}
                >
                  <Camera className="mr-2 h-5 w-5" />
                  投稿する
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-12"
                  onClick={handleStop}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Square className="mr-2 h-5 w-5" />
                  )}
                  終了する
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
