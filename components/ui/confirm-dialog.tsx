'use client'

import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-brand-black/60 flex items-center justify-center z-50">
      <div className="bg-brand-dark-surface rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 border border-brand-rule-grey">
        <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
        <p className="text-sm text-brand-mid-grey mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
