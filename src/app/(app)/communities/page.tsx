'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Plus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CommunityWithStats } from '@/types/database'

export default function CommunitiesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // 参加中のコミュニティ
  const { data: myCommunities, isLoading: isMyLoading } = useQuery({
    queryKey: ['my-communities', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)

      if (!memberships || memberships.length === 0) return []

      const communityIds = memberships.map((m) => m.community_id)

      const { data: communities } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds)

      if (!communities) return []

      // メンバー数を取得
      const communitiesWithStats = await Promise.all(
        communities.map(async (community) => {
          const { count } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', community.id)

          return {
            ...community,
            members_count: count || 0,
            is_member: true,
          } as CommunityWithStats
        })
      )

      return communitiesWithStats
    },
    enabled: !!user,
  })

  // すべてのコミュニティ
  const { data: allCommunities, isLoading: isAllLoading } = useQuery({
    queryKey: ['all-communities', user?.id],
    queryFn: async () => {
      const { data: communities } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false })

      if (!communities) return []

      // メンバー数と参加状況を取得
      const communitiesWithStats = await Promise.all(
        communities.map(async (community) => {
          const { count } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', community.id)

          let isMember = false
          if (user) {
            const { data: membership } = await supabase
              .from('community_members')
              .select('id')
              .eq('community_id', community.id)
              .eq('user_id', user.id)
              .maybeSingle()
            isMember = !!membership
          }

          return {
            ...community,
            members_count: count || 0,
            is_member: isMember,
          } as CommunityWithStats
        })
      )

      return communitiesWithStats
    },
    enabled: !!user,
  })

  const CommunityCard = ({ community }: { community: CommunityWithStats }) => (
    <Link href={`/communities/${community.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{community.name}</h3>
                {community.is_member && (
                  <Badge variant="secondary" className="text-xs">
                    参加中
                  </Badge>
                )}
              </div>
              {community.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {community.description}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Users className="h-3 w-3" />
                <span>{community.members_count}人</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">コミュニティ</h1>
        </div>
        <Link href="/communities/create">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            作成
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="my">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my">参加中</TabsTrigger>
          <TabsTrigger value="all">すべて</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {isMyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : myCommunities && myCommunities.length > 0 ? (
            <div className="space-y-3">
              {myCommunities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              参加中のコミュニティはありません
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {isAllLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allCommunities && allCommunities.length > 0 ? (
            <div className="space-y-3">
              {allCommunities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              コミュニティがありません
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
