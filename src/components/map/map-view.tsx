'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import { Icon, LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import type { PostWithUser } from '@/types/database'

// カスタムアイコンの設定
const createCustomIcon = (color: string = '#22c55e') => {
  return new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

const postIcon = createCustomIcon('#22c55e')
const userIcon = createCustomIcon('#3b82f6')

interface MapViewProps {
  posts?: PostWithUser[]
  center?: LatLngExpression
  zoom?: number
  route?: LatLngExpression[]
  showUserLocation?: boolean
  onMapClick?: (lat: number, lng: number) => void
}

function LocationMarker() {
  const [position, setPosition] = useState<LatLngExpression | null>(null)
  const map = useMap()

  useEffect(() => {
    map.locate()
    map.on('locationfound', (e) => {
      setPosition(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
    })
  }, [map])

  return position ? (
    <Marker position={position} icon={userIcon}>
      <Popup>現在地</Popup>
    </Marker>
  ) : null
}

function MapController({ center, zoom }: { center?: LatLngExpression; zoom?: number }) {
  const map = useMap()

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom())
    }
  }, [map, center, zoom])

  return null
}

export function MapView({
  posts = [],
  center,
  zoom = 15,
  route,
  showUserLocation = true,
  onMapClick,
}: MapViewProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="h-full w-full bg-muted flex items-center justify-center">
        <span className="text-muted-foreground">マップを読み込み中...</span>
      </div>
    )
  }

  const defaultCenter: LatLngExpression = center || [35.6812, 139.7671] // 東京駅

  return (
    <MapContainer
      center={defaultCenter}
      zoom={zoom}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {center && <MapController center={center} zoom={zoom} />}

      {showUserLocation && <LocationMarker />}

      {route && route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.8 }}
        />
      )}

      {posts.map((post) => (
        <Marker
          key={post.id}
          position={[post.lat, post.lng]}
          icon={postIcon}
        >
          <Popup>
            <div className="min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <UserAvatar
                  src={post.user?.icon_url}
                  name={post.user?.display_name}
                  size="sm"
                />
                <span className="font-medium text-sm">
                  {post.user?.display_name || 'ユーザー'}
                </span>
              </div>
              <p className="text-sm mb-2 line-clamp-2">{post.text}</p>
              <Link href={`/posts/${post.id}`}>
                <Button size="sm" variant="outline" className="w-full">
                  詳細を見る
                </Button>
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
