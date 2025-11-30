'use client'

import { Header } from './header'
import { TabBar } from './tab-bar'
import { FAB } from './fab'

interface AppShellProps {
  children: React.ReactNode
  showHeader?: boolean
  showTabBar?: boolean
  showFAB?: boolean
}

export function AppShell({
  children,
  showHeader = true,
  showTabBar = true,
  showFAB = true,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <Header />}
      <main
        className={`
          ${showHeader ? 'pt-14' : ''}
          ${showTabBar ? 'pb-16' : ''}
        `}
      >
        {children}
      </main>
      {showFAB && <FAB />}
      {showTabBar && <TabBar />}
    </div>
  )
}
