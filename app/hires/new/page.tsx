import Link from 'next/link'
import { getClients } from '@/lib/db/clients'
import { NewHireForm } from './_components/new-hire-form'

export default async function NewHirePage() {
  const clients = await getClients()
  return (
    <div>
      <div className="mb-6">
        <Link href="/hires" className="text-sm text-brand-mid-grey hover:text-white">← Hires</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">New hire</h1>
      <NewHireForm clients={clients} />
    </div>
  )
}
