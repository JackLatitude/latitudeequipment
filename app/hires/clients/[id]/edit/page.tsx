import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getClient } from '@/lib/db/clients'
import { ClientForm } from '../../_components/client-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) return notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/hires/clients/${id}`} className="text-sm text-brand-mid-grey hover:text-white">← {client.name}</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Edit client</h1>
      <ClientForm client={client} />
    </div>
  )
}
