'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { PostCard } from '@/components/post-card'
import { Button } from '@/components/ui/button'
import { Loader2, Footprints, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { PostWithUser } from '@/types/database'

const POSTS_PER_PAGE = 10

export default function HomePage() {
  const { user } = useAuth()
  const supabase = createClient()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['timeline', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      // 投稿を取得
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(pageParam * POSTS_PER_PAGE, (pageParam + 1) * POSTS_PER_PAGE - 1)

      if (error) throw error

      // ユーザー情報といいね数を取得
      const postsWithDetails = await Promise.all(
        (posts || []).map(async (post) => {
          // ユーザー情報を取得
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', post.user_id)
            .single()

          // いいね数を取得
          const { count } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)

          // 自分がいいねしているか確認
          let isLiked = false
          if (user) {
            const { data: like } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
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

      return postsWithDetails
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < POSTS_PER_PAGE) return undefined
      return pages.length
    },
    initialPageParam: 0,
    enabled: !!user,
  })

  const allPosts = data?.pages.flat() || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 px-4">
        <p className="text-muted-foreground">データの取得に失敗しました</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          再読み込み
        </Button>
      </div>
    )
  }

  if (allPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 px-4">
        <div className="p-4 bg-primary/10 rounded-full">
          <Footprints className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-lg font-medium">まだ投稿がありません</h2>
        <p className="text-sm text-muted-foreground text-center">
          散歩に出かけて、素敵な発見をシェアしましょう！
        </p>
        <Link href="/walks/record">
          <Button>散歩を始める</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="space-y-4">
        {allPosts.map((post) => (
          <PostCard key={post.id} post={post} onLikeChange={() => refetch()} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                読み込み中...
              </>
            ) : (
              'もっと見る'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
