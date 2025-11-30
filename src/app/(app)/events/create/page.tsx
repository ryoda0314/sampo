'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'

export default function CreateEventPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [meetingLat, setMeetingLat] = useState<number | null>(null)
  const [meetingLng, setMeetingLng] = useState<number | null>(null)
  const [expectedDistance, setExpectedDistance] = useState('')
  const [expectedDuration, setExpectedDuration] = useState('')
  const [paceNote, setPaceNote] = useState('')
  const [capacity, setCapacity] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMeetingLat(position.coords.latitude)
          setMeetingLng(position.coords.longitude)
          setIsGettingLocation(false)
        },
        (error) => {
          console.error('Geolocation error:', error)
          setMeetingLat(35.6812)
          setMeetingLng(139.7671)
          setIsGettingLocation(false)
        }
      )
    } else {
      setMeetingLat(35.6812)
      setMeetingLng(139.7671)
      setIsGettingLocation(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || meetingLat === null || meetingLng === null) return

    if (!title.trim() || !startDate || !startTime) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '必須項目を入力してください',
      })
      return
    }

    setIsLoading(true)

    const startAt = new Date(`${startDate}T${startTime}`)

    const { data, error } = await supabase
      .from('walk_events')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        host_user_id: user.id,
        start_at: startAt.toISOString(),
        meeting_lat: meetingLat,
        meeting_lng: meetingLng,
        expected_distance_m: expectedDistance ? parseFloat(expectedDistance) * 1000 : null,
        expected_duration_min: expectedDuration ? parseInt(expectedDuration) : null,
        pace_note: paceNote.trim() || null,
        capacity: capacity ? parseInt(capacity) : null,
        visibility: 'public',
      })
      .select()
      .single()

    if (error) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'イベントの作成に失敗しました',
      })
      setIsLoading(false)
      return
    }

    // 主催者を参加者として追加
    await supabase.from('walk_event_participants').insert({
      event_id: data.id,
      user_id: user.id,
      status: 'joined',
    })

    toast({
      title: '作成完了',
      description: 'イベントを作成しました',
    })

    router.push(`/events/${data.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">イベントを作成</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">イベント名 *</Label>
              <Input
                id="title"
                type="text"
                placeholder="例：渋谷ナイトウォーク"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                placeholder="イベントの説明を入力..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">開催日 *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="startTime">開始時間 *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>集合場所</Label>
              <div className="flex items-center gap-2 mt-1 p-3 bg-muted rounded-lg">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {isGettingLocation ? (
                  <span className="text-sm text-muted-foreground">
                    位置情報を取得中...
                  </span>
                ) : meetingLat !== null && meetingLng !== null ? (
                  <span className="text-sm">
                    {meetingLat.toFixed(4)}, {meetingLng.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    位置情報を取得できませんでした
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  更新
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expectedDistance">予定距離 (km)</Label>
                <Input
                  id="expectedDistance"
                  type="number"
                  step="0.1"
                  placeholder="3.5"
                  value={expectedDistance}
                  onChange={(e) => setExpectedDistance(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="expectedDuration">予定時間 (分)</Label>
                <Input
                  id="expectedDuration"
                  type="number"
                  placeholder="60"
                  value={expectedDuration}
                  onChange={(e) => setExpectedDuration(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paceNote">ペースについて</Label>
              <Input
                id="paceNote"
                type="text"
                placeholder="例：ゆっくり歩きます"
                value={paceNote}
                onChange={(e) => setPaceNote(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="capacity">定員（任意）</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="10"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || meetingLat === null || meetingLng === null}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                '作成する'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
