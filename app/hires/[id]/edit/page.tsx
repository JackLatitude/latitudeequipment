import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getHire } from '@/lib/db/hires'
import { getClients } from '@/lib/db/clients'
import { getProfiles } from '@/lib/db/users'
import { EditHireForm } from './_components/edit-hire-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditHirePage({ params }: Props) {
  const { id } = await params
  const [hire, clients, profiles] = await Promise.all([getHire(id), getClients(), getProfiles()])
  if (!hire) return notFound()
  if (hire.status !== 'draft') redirect(`/hires/${id}`)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/hires/${id}`} className="text-sm text-brand-mid-grey hover:text-white">← {hire.ref}</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Edit hire</h1>
      <EditHireForm hire={hire} clients={clients} profiles={profiles} />
    </div>
  )
}
