'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, MapPin, Image as ImageIcon, X, Plus } from 'lucide-react'

function CreatePostForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const walkId = searchParams.get('walkId')
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude)
          setLng(position.coords.longitude)
          setIsGettingLocation(false)
        },
        (error) => {
          console.error('Geolocation error:', error)
          setLat(35.6812)
          setLng(139.7671)
          setIsGettingLocation(false)
        }
      )
    } else {
      setLat(35.6812)
      setLng(139.7671)
      setIsGettingLocation(false)
    }
  }

  const addTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || lat === null || lng === null) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '位置情報を取得できませんでした',
      })
      return
    }

    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'テキストを入力してください',
      })
      return
    }

    setIsLoading(true)

    const { error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        walk_record_id: walkId || null,
        text: text.trim(),
        image_url: imageUrl || null,
        tags: tags.length > 0 ? tags : null,
        lat,
        lng,
      })

    if (error) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '投稿の作成に失敗しました',
      })
      setIsLoading(false)
      return
    }

    toast({
      title: '投稿完了！',
      description: '投稿が作成されました',
    })

    router.push('/')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">投稿を作成</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="text">コメント</Label>
              <Textarea
                id="text"
                placeholder="散歩で見つけた発見をシェアしよう..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">画像URL（任意）</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                画像のURLを入力してください
              </p>
            </div>

            <div>
              <Label htmlFor="tags">タグ（最大5つ）</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="tags"
                  type="text"
                  placeholder="タグを入力"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      #{tag}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>位置情報</Label>
              <div className="flex items-center gap-2 mt-1 p-3 bg-muted rounded-lg">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {isGettingLocation ? (
                  <span className="text-sm text-muted-foreground">
                    位置情報を取得中...
                  </span>
                ) : lat !== null && lng !== null ? (
                  <span className="text-sm">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
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

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || lat === null || lng === null}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  投稿中...
                </>
              ) : (
                '投稿する'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <CreatePostForm />
    </Suspense>
  )
}
