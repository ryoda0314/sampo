'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Footprints, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast({
        variant: 'destructive',
        title: 'ログインエラー',
        description: error.message,
      })
      setIsLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const handleResetPassword = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'メールアドレスを入力してください',
      })
      return
    }

    setIsResetting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: error.message,
      })
    } else {
      toast({
        title: 'メール送信完了',
        description: 'パスワードリセット用のメールを送信しました',
      })
    }
    setIsResetting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Footprints className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">散歩管理アプリ</CardTitle>
          <CardDescription>
            歩くを、もっと面白く。散歩好きのためのSNS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </Button>
          </form>
          <div className="mt-4 space-y-2">
            <Button
              variant="link"
              className="w-full text-sm"
              onClick={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? 'メール送信中...' : 'パスワードを忘れた方'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              アカウントをお持ちでない方は{' '}
              <Link href="/signup" className="text-primary hover:underline">
                新規登録
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
