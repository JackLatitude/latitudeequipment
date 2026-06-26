'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Props = { kitId: string }

export function KitActions({ kitId }: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/kits/${kitId}`, { method: 'DELETE' })
    router.push('/kits')
  }

  async function handleDuplicate() {
    setLoading(true)
    const res = await fetch(`/api/kits/${kitId}/duplicate`, { method: 'POST' })
    const kit = await res.json()
    router.push(`/kits/${kit.id}`)
  }

  return (
    <>
      <div className="flex gap-3 mt-8 pt-6 border-t border-brand-rule-grey">
        <button
          onClick={handleDuplicate}
          disabled={loading}
          className="text-sm font-medium text-brand-black border border-brand-rule-grey rounded px-4 py-2 hover:bg-brand-light-grey disabled:opacity-50"
        >
          Duplicate kit
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          disabled={loading}
          className="text-sm text-brand-red hover:opacity-80 disabled:opacity-50"
        >
          Delete kit
        </button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete kit?"
        description="The kit will be deleted. Items in it will remain but will no longer belong to a kit."
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
