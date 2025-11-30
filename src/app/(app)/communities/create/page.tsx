'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function CreateCommunityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'コミュニティ名を入力してください',
      })
      return
    }

    setIsLoading(true)

    // コミュニティを作成
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (communityError) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'コミュニティの作成に失敗しました',
      })
      setIsLoading(false)
      return
    }

    // 作成者をメンバーとして追加
    await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
    })

    toast({
      title: '作成完了',
      description: 'コミュニティを作成しました',
    })

    router.push(`/communities/${community.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">コミュニティを作成</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">コミュニティ名</Label>
              <Input
                id="name"
                type="text"
                placeholder="例：夜散歩部"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                placeholder="コミュニティの説明を入力..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
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
