'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Camera } from 'lucide-react'

export default function ProfileEditPage() {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [iconUrl, setIconUrl] = useState(profile?.icon_url || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    const { error } = await supabase
      .from('users')
      .update({
        display_name: displayName,
        bio: bio || null,
        icon_url: iconUrl || null,
      })
      .eq('id', user.id)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '更新に失敗しました',
      })
    } else {
      await refreshProfile()
      toast({
        title: '更新完了',
        description: 'プロフィールを更新しました',
      })
      router.push('/me')
    }

    setIsLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">プロフィール編集</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* アイコン */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <UserAvatar src={iconUrl} name={displayName} size="lg" />
                <div className="absolute bottom-0 right-0 p-1 bg-primary rounded-full">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="w-full">
                <Label htmlFor="iconUrl">アイコンURL</Label>
                <Input
                  id="iconUrl"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  画像のURLを入力してください
                </p>
              </div>
            </div>

            {/* ニックネーム */}
            <div>
              <Label htmlFor="displayName">ニックネーム</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="散歩好き太郎"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {/* 自己紹介 */}
            <div>
              <Label htmlFor="bio">自己紹介</Label>
              <Textarea
                id="bio"
                placeholder="自己紹介を入力..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* 送信ボタン */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存する'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
