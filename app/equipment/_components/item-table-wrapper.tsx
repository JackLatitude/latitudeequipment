'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { ItemTable } from '@/components/equipment/item-table'
import type { Item, Profile } from '@/lib/types'

type Props = {
  items: Item[]
  profiles: Profile[]
  initialSearch: string
  initialHolder: string
}

export function ItemTableWrapper({ items, profiles, initialSearch, initialHolder }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/equipment?${params.toString()}`)
  }, [router, searchParams])

  return (
    <ItemTable
      items={items}
      profiles={profiles}
      search={initialSearch}
      holderId={initialHolder}
      onSearchChange={(v) => update('search', v)}
      onHolderChange={(v) => update('holder', v)}
    />
  )
}
