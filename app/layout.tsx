import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Nav } from '@/components/nav'
import { MobileNav } from '@/components/mobile-nav'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/users'

export const metadata: Metadata = {
  title: 'Latitude Equipment',
  description: 'Equipment tracker for Latitude Equipment',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Equipment',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = user ? await getProfile(user.id) : null

  return (
    <html lang="en">
      <body>
        {profile && (
          <>
            <Nav displayName={profile.display_name} />
            <MobileNav displayName={profile.display_name} />
          </>
        )}
        <main className="max-w-6xl mx-auto px-4 pt-16 pb-24 lg:pt-8 lg:px-6 lg:pb-8">
          {children}
        </main>
      </body>
    </html>
  )
}
