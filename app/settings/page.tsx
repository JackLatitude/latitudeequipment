import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/users'
import { notFound } from 'next/navigation'
import { SettingsForm } from './_components/settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const profile = await getProfile(user.id)
  if (!profile) return notFound()

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-white mb-8">Settings</h1>
      <SettingsForm profile={profile} email={user.email ?? ''} />
    </div>
  )
}
