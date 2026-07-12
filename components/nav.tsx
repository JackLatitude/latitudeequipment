'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = { displayName: string }

export function Nav({ displayName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const linkClass = (href: string) =>
    `text-sm font-medium text-white px-3 py-1 transition-colors border-b-2 ${
      pathname.startsWith(href)
        ? 'border-brand-red'
        : 'border-transparent hover:border-white/40'
    }`

  return (
    // 3px brand-red rule sits above the black bar via the border-t
    <nav className="hidden lg:flex bg-brand-black border-t-[3px] border-brand-red px-6 items-center justify-between h-16">
      <div className="flex items-center gap-6">
        {/* badge_white_full.png: 1600×570 — rendered 44px tall → width ≈ 123px */}
        <Link href="/dashboard" aria-label="Latitude Equipment — dashboard">
          <Image
            src="/logos/badge_white_full.png"
            alt="Latitude Equipment"
            width={123}
            height={44}
            priority
          />
        </Link>
        <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
        <Link href="/equipment" className={linkClass('/equipment')}>Equipment</Link>
        <Link href="/firmware" className={linkClass('/firmware')}>Firmware</Link>
        <Link href="/kits" className={linkClass('/kits')}>Kits</Link>
        <Link href="/hires" className={linkClass('/hires')}>Hires</Link>
        <Link href="/carnet" className={linkClass('/carnet')}>Carnet</Link>
        <Link href="/settings" className={linkClass('/settings')}>Settings</Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-light text-white/60">{displayName}</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
