import Link from 'next/link'
import { ClientForm } from '../_components/client-form'

export default function NewClientPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/hires/clients" className="text-sm text-brand-mid-grey hover:text-white">← Clients</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Add client</h1>
      <ClientForm />
    </div>
  )
}
