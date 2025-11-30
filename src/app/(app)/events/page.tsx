'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventCard } from '@/components/event-card'
import { ArrowLeft, Plus, Loader2, Calendar } from 'lucide-react'
import type { WalkEventWithHost } from '@/types/database'

export default function EventsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // 参加予定イベント
  const { data: myEvents, isLoading: isMyLoading } = useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: participations } = await supabase
        .from('walk_event_participants')
        .select('event_id')
        .eq('user_id', user.id)
        .in('status', ['joined', 'interested'])

      if (!participations || participations.length === 0) return []

      const eventIds = participations.map((p) => p.event_id)

      const { data: events } = await supabase
        .from('walk_events')
        .select('*')
        .in('id', eventIds)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })

      if (!events) return []

      const eventsWithStats = await Promise.all(
        events.map(async (event) => {
          const { data: hostData } = await supabase
            .from('users')
            .select('*')
            .eq('id', event.host_user_id)
            .maybeSingle()

          const { count } = await supabase
            .from('walk_event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'joined')

          return {
            ...event,
            host: hostData,
            participants_count: count || 0,
            is_participating: true,
          } as WalkEventWithHost
        })
      )

      return eventsWithStats
    },
    enabled: !!user,
  })

  // 近くの公開イベント
  const { data: publicEvents, isLoading: isPublicLoading } = useQuery({
    queryKey: ['public-events'],
    queryFn: async () => {
      const { data: events } = await supabase
        .from('walk_events')
        .select('*')
        .eq('visibility', 'public')
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(20)

      if (!events) return []

      const eventsWithStats = await Promise.all(
        events.map(async (event) => {
          const { data: hostData } = await supabase
            .from('users')
            .select('*')
            .eq('id', event.host_user_id)
            .maybeSingle()

          const { count } = await supabase
            .from('walk_event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'joined')

          let isParticipating = false
          if (user) {
            const { data: participation } = await supabase
              .from('walk_event_participants')
              .select('id')
              .eq('event_id', event.id)
              .eq('user_id', user.id)
              .in('status', ['joined', 'interested'])
              .maybeSingle()
            isParticipating = !!participation
          }

          return {
            ...event,
            host: hostData,
            participants_count: count || 0,
            is_participating: isParticipating,
          } as WalkEventWithHost
        })
      )

      return eventsWithStats
    },
  })

  // 過去のイベント
  const { data: pastEvents, isLoading: isPastLoading } = useQuery({
    queryKey: ['past-events', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: participations } = await supabase
        .from('walk_event_participants')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'joined')

      if (!participations || participations.length === 0) return []

      const eventIds = participations.map((p) => p.event_id)

      const { data: events } = await supabase
        .from('walk_events')
        .select('*')
        .in('id', eventIds)
        .lt('start_at', new Date().toISOString())
        .order('start_at', { ascending: false })
        .limit(10)

      if (!events) return []

      const eventsWithHost = await Promise.all(
        events.map(async (event) => {
          const { data: hostData } = await supabase
            .from('users')
            .select('*')
            .eq('id', event.host_user_id)
            .maybeSingle()

          return {
            ...event,
            host: hostData,
            participants_count: 0,
            is_participating: true,
          } as WalkEventWithHost
        })
      )

      return eventsWithHost
    },
    enabled: !!user,
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">イベント</h1>
        </div>
        <Link href="/events/create">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            作成
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">参加予定</TabsTrigger>
          <TabsTrigger value="public">近くのイベント</TabsTrigger>
          <TabsTrigger value="past">過去</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {isMyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : myEvents && myEvents.length > 0 ? (
            <div className="space-y-3">
              {myEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-2 opacity-50" />
              <p>参加予定のイベントはありません</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-4">
          {isPublicLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : publicEvents && publicEvents.length > 0 ? (
            <div className="space-y-3">
              {publicEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-2 opacity-50" />
              <p>公開イベントがありません</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {isPastLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : pastEvents && pastEvents.length > 0 ? (
            <div className="space-y-3">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-2 opacity-50" />
              <p>過去のイベントはありません</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
