'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ItemTable } from '@/components/equipment/item-table'
import type { Item, Profile } from '@/lib/types'

type Props = {
  items: Item[]
  profiles: Profile[]
  onHireItemIds: string[]
  initialSearch: string
  initialHolder: string
}

// Each URL change re-renders the page on the server (items + profiles + on-hire
// set). Wait for a pause in typing instead of firing one per keystroke.
const SEARCH_DEBOUNCE_MS = 250

export function ItemTableWrapper({ items, profiles, onHireItemIds, initialSearch, initialHolder }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // The input owns its own value so typing stays instant while the server
  // render catches up — bound straight to the server prop, keystrokes typed
  // during a round trip were overwritten when it landed.
  const [search, setSearch] = useState(initialSearch)
  // Follow URL changes made elsewhere (back/forward, a nav link), but not the
  // echo of our own debounced update — the user may have typed on since.
  const [syncedSearch, setSyncedSearch] = useState(initialSearch)
  const [requestedSearch, setRequestedSearch] = useState(initialSearch)
  if (initialSearch !== syncedSearch) {
    setSyncedSearch(initialSearch)
    if (initialSearch !== requestedSearch) setSearch(initialSearch)
  }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const update = useCallback((key: string, value: string, replace = false) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    const url = `/equipment?${params.toString()}`
    if (replace) router.replace(url)
    else router.push(url)
  }, [router, searchParams])

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
    clearTimeout(timer.current)
    // replace, not push: one history entry per search, not one per letter.
    timer.current = setTimeout(() => {
      setRequestedSearch(v)
      update('search', v, true)
    }, SEARCH_DEBOUNCE_MS)
  }, [update])

  const handleHolderChange = useCallback((v: string) => update('holder', v), [update])

  return (
    <ItemTable
      items={items}
      profiles={profiles}
      onHireItemIds={onHireItemIds}
      search={search}
      holderId={initialHolder}
      onSearchChange={handleSearchChange}
      onHolderChange={handleHolderChange}
    />
  )
}
