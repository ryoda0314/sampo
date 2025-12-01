'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { User as UserProfile } from '@/types/database'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    let isMounted = true

    // タイムアウト: 5秒後に強制的にローディング終了
    const timeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('Auth timeout - forcing loading to complete')
        setIsLoading(false)
      }
    }, 5000)

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (isMounted) {
          setUser(user)
          if (user) {
            await fetchProfile(user.id)
          }
        }
      } catch (error) {
        console.error('Auth error:', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (isMounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchProfile(session.user.id)
          } else {
            setProfile(null)
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setUser(null)
      setProfile(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, isLoading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
