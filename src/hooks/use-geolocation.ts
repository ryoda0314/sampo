'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Position {
  lat: number
  lng: number
  timestamp: number
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  interval?: number // ポーリング間隔 (ms)
}

interface UseGeolocationReturn {
  position: Position | null
  positions: Position[]
  error: string | null
  isTracking: boolean
  startTracking: () => void
  stopTracking: () => void
  clearPositions: () => void
  totalDistance: number
  elapsedTime: number
}

// 2点間の距離をハーバサイン公式で計算 (meters)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // 地球の半径 (meters)
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const { enableHighAccuracy = true, interval = 3000 } = options

  const [position, setPosition] = useState<Position | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const updatePosition = useCallback((newPosition: Position) => {
    setPosition(newPosition)
    setPositions((prev) => [...prev, newPosition])
  }, [])

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('位置情報がサポートされていません')
      return
    }

    setError(null)
    setIsTracking(true)
    setStartTime(Date.now())
    setPositions([])

    // watchPosition を使用
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPosition: Position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        }
        updatePosition(newPosition)
      },
      (err) => {
        setError(err.message)
      },
      {
        enableHighAccuracy,
        timeout: 10000,
        maximumAge: 0,
      }
    )

    // 経過時間更新タイマー
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)
  }, [enableHighAccuracy, updatePosition])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsTracking(false)
  }, [])

  const clearPositions = useCallback(() => {
    setPositions([])
    setPosition(null)
    setStartTime(null)
    setElapsedTime(0)
  }, [])

  // 総距離を計算
  const totalDistance = positions.reduce((total, pos, index) => {
    if (index === 0) return 0
    const prevPos = positions[index - 1]
    return total + calculateDistance(prevPos.lat, prevPos.lng, pos.lat, pos.lng)
  }, 0)

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  return {
    position,
    positions,
    error,
    isTracking,
    startTracking,
    stopTracking,
    clearPositions,
    totalDistance,
    elapsedTime,
  }
}

// タイル座標を計算するユーティリティ
export function latLngToTileKey(lat: number, lng: number, zoom: number = 17): string {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  )
  return `${zoom}/${x}/${y}`
}
