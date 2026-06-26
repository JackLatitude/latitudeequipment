'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Props = { itemId: string; onDelete: (itemId: string) => Promise<void> }

export function DeleteItemButton({ itemId, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleConfirm() {
    await onDelete(itemId)
    router.push('/equipment')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-brand-red hover:opacity-80"
      >
        Delete item
      </button>
      <ConfirmDialog
        open={open}
        title="Delete item?"
        description="This item will be removed from the equipment list. This cannot be undone."
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
