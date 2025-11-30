'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Loader2, Navigation, Layers } from 'lucide-react'
import type { PostWithUser } from '@/types/database'
import type { LatLngExpression } from 'leaflet'

// 動的インポートでSSR無効化
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

export default function MapPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null)
  const [showExplore, setShowExplore] = useState(false)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.error('Geolocation error:', error)
          // デフォルトは東京駅
          setUserLocation([35.6812, 139.7671])
        }
      )
    }
  }, [])

  const { data: posts, isLoading } = useQuery({
    queryKey: ['map-posts', user?.id],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100)

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

  const handleCenterOnUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }

  return (
    <div className="h-[calc(100vh-7rem)] relative">
      {isLoading || !userLocation ? (
        <div className="h-full w-full bg-muted flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <MapView
          posts={posts || []}
          center={userLocation}
          showUserLocation={true}
        />
      )}

      {/* コントロールボタン */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="shadow-md"
          onClick={handleCenterOnUser}
        >
          <Navigation className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant={showExplore ? 'default' : 'secondary'}
          className="shadow-md"
          onClick={() => setShowExplore(!showExplore)}
        >
          <Layers className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
