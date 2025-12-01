'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'
import { TabBar } from './tab-bar'
import { FAB } from './fab'

interface AppShellProps {
  children: React.ReactNode
  showHeader?: boolean
  showTabBar?: boolean
  showFAB?: boolean
}

// FABを非表示にするパス
const hideFABPaths = ['/walks/record']

export function AppShell({
  children,
  showHeader = true,
  showTabBar = true,
  showFAB = true,
}: AppShellProps) {
  const pathname = usePathname()
  const shouldShowFAB = showFAB && !hideFABPaths.includes(pathname)

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
      {shouldShowFAB && <FAB />}
      {showTabBar && <TabBar />}
    </div>
  )
}
