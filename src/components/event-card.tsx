'use client'

import Link from 'next/link'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { formatDistance } from '@/lib/utils'
import type { WalkEventWithHost } from '@/types/database'

interface EventCardProps {
  event: WalkEventWithHost
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.start_at)
  const isUpcoming = eventDate > new Date()

  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
  }

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
              <span className="text-xs text-primary font-medium">
                {eventDate.toLocaleDateString('ja-JP', { month: 'short' })}
              </span>
              <span className="text-lg font-bold text-primary">
                {eventDate.getDate()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{event.title}</h3>
                {!isUpcoming && (
                  <Badge variant="secondary" className="text-xs">
                    終了
                  </Badge>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatEventTime(eventDate)}</span>
              </div>

              {event.expected_distance_m && (
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>約 {formatDistance(event.expected_distance_m)}</span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    src={event.host?.icon_url}
                    name={event.host?.display_name}
                    size="sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    {event.host?.display_name}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    {event.participants_count}
                    {event.capacity ? `/${event.capacity}` : ''}人
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
