'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ src, name, size = 'md', className }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  }

  const getInitials = (name?: string | null) => {
    if (!name) return null
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={src || undefined} alt={name || 'ユーザー'} />
      <AvatarFallback className="bg-primary/10 text-primary">
        {getInitials(name) || <User className={iconSizes[size]} />}
      </AvatarFallback>
    </Avatar>
  )
}
