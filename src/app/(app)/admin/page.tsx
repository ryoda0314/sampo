'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { formatRelativeTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Shield,
  Trash2,
  Ban,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { Post, User } from '@/types/database'

export default function AdminPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // 管理者チェック
  const isAdmin = profile?.is_admin

  // 投稿一覧
  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, user:users!posts_user_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as (Post & { user: User })[]
    },
    enabled: isAdmin,
  })

  // ユーザー一覧
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as User[]
    },
    enabled: isAdmin,
  })

  // 投稿削除
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', postId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] })
      toast({ title: '投稿を非表示にしました' })
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '操作に失敗しました',
      })
    },
  })

  // 投稿復元
  const restorePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase
        .from('posts')
        .update({ is_deleted: false })
        .eq('id', postId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] })
      toast({ title: '投稿を復元しました' })
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '操作に失敗しました',
      })
    },
  })

  // ユーザー停止
  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
      await supabase
        .from('users')
        .update({ is_suspended: suspend })
        .eq('id', userId)
    },
    onSuccess: (_, { suspend }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast({ title: suspend ? 'ユーザーを停止しました' : 'ユーザーの停止を解除しました' })
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '操作に失敗しました',
      })
    },
  })

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">管理者権限がありません</p>
        <Button onClick={() => router.push('/')}>ホームに戻る</Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">管理画面</h1>
      </div>

      <Tabs defaultValue="posts">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">投稿管理</TabsTrigger>
          <TabsTrigger value="users">ユーザー管理</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {isPostsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => (
                <Card key={post.id} className={post.is_deleted ? 'opacity-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        src={post.user?.icon_url}
                        name={post.user?.display_name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {post.user?.display_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(post.created_at)}
                          </span>
                          {post.is_deleted && (
                            <Badge variant="destructive" className="text-xs">
                              非表示
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1 line-clamp-2">{post.text}</p>
                      </div>
                      <div>
                        {post.is_deleted ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => restorePostMutation.mutate(post.id)}
                            disabled={restorePostMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePostMutation.mutate(post.id)}
                            disabled={deletePostMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              投稿がありません
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          {isUsersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map((userData) => (
                <Card
                  key={userData.id}
                  className={userData.is_suspended ? 'border-destructive' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={userData.icon_url}
                        name={userData.display_name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {userData.display_name}
                          </span>
                          {userData.is_admin && (
                            <Badge variant="default" className="text-xs">
                              管理者
                            </Badge>
                          )}
                          {userData.is_suspended && (
                            <Badge variant="destructive" className="text-xs">
                              停止中
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          登録: {formatRelativeTime(userData.created_at)}
                        </p>
                      </div>
                      {!userData.is_admin && userData.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            suspendUserMutation.mutate({
                              userId: userData.id,
                              suspend: !userData.is_suspended,
                            })
                          }
                          disabled={suspendUserMutation.isPending}
                        >
                          {userData.is_suspended ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Ban className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              ユーザーがいません
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
