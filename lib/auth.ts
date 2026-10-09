import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/users'

// getUser() is a network round trip to Supabase Auth. The root layout and the
// page both need the user on every render, so memoise it per request — React's
// cache() is scoped to a single server render, never shared between requests.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser()
  return user ? getProfile(user.id) : null
})
