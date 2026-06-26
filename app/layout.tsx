import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/users'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Latitude Equipment',
  description: 'Equipment tracker for Latitude Equipment',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = user ? await getProfile(user.id) : null
  const isLoginPage = false // Nav is always shown; login page has its own full-screen layout

  return (
    <html lang="en">
      <body className={inter.className}>
        {profile && <Nav displayName={profile.display_name} />}
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
