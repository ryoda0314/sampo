'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Camera, Calendar, X, Footprints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function FAB() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleWalkStart = () => {
    setIsOpen(false)
    router.push('/walks/record')
  }

  const handlePostCreate = () => {
    setIsOpen(false)
    router.push('/posts/create')
  }

  const handleEventCreate = () => {
    setIsOpen(false)
    router.push('/events/create')
  }

  return (
    <>
      <Button
        size="icon"
        className={cn(
          'fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg transition-transform',
          isOpen && 'rotate-45'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>何をしますか？</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-14 text-left"
              onClick={handleWalkStart}
            >
              <div className="p-2 bg-green-100 rounded-full">
                <Footprints className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">散歩を開始</div>
                <div className="text-xs text-muted-foreground">
                  GPSで散歩を記録
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-14 text-left"
              onClick={handlePostCreate}
            >
              <div className="p-2 bg-primary/10 rounded-full">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">投稿を作成</div>
                <div className="text-xs text-muted-foreground">
                  散歩の発見をシェア
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-14 text-left"
              onClick={handleEventCreate}
            >
              <div className="p-2 bg-orange-100 rounded-full">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="font-medium">イベントを作成</div>
                <div className="text-xs text-muted-foreground">
                  散歩仲間を募集
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
