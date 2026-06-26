import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/lib/types'

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('display_name')
  if (error) throw new Error(error.message)
  return data as Profile[]
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Profile
}

export async function updateProfile(id: string, data: { display_name?: string }): Promise<Profile> {
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return profile as Profile
}

export async function inviteUser(email: string): Promise<void> {
  const adminClient = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  })
  if (error) throw new Error(error.message)
}
