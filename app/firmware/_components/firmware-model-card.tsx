'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FirmwareModel } from '@/lib/types'
import { controlClass } from '@/components/ui/control'

const inputClass = controlClass

export function FirmwareModelCard({ model }: { model: FirmwareModel }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [latest, setLatest] = useState(model.latest_version ?? '')
  const [source, setSource] = useState(model.source_url ?? '')
  const [manufacturer, setManufacturer] = useState(model.manufacturer ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/firmware-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.model,
          manufacturer,
          latest_version: latest,
          source_url: source,
        }),
      })
      if (res.ok) {
        setEditing(false)
        router.refresh()
        return
      }
      const body = await res.json().catch(() => null)
      setError(body?.message ?? 'Could not save. Please try again.')
      setSaving(false)
    } catch {
      setError('Could not save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="border border-brand-rule-grey rounded-lg bg-brand-dark-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-white truncate">{model.model}</p>
          {model.manufacturer && <p className="text-xs text-brand-mid-grey">{model.manufacturer}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-xs text-brand-mid-grey hover:text-white flex-shrink-0 transition-colors"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {!editing && (
        <div className="mt-2 text-sm">
          {model.latest_version ? (
            <p className="text-brand-mid-grey">
              Latest: <span className="text-white">{model.latest_version}</span>
              {model.source_url && (
                <>
                  {' · '}
                  <a href={model.source_url} target="_blank" rel="noreferrer" className="text-white hover:underline">
                    source
                  </a>
                </>
              )}
            </p>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="text-brand-mid-grey hover:text-white underline decoration-dotted underline-offset-2">
              Latest unknown — set it
            </button>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          <input value={latest} onChange={(e) => setLatest(e.target.value)} placeholder="Latest version" className={inputClass} />
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source URL" className={inputClass} />
          <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Manufacturer (optional)" className={inputClass} />
          {error && <p className="text-sm text-brand-red">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-brand-red text-white text-sm font-medium px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      <ul className="mt-3 border-t border-brand-rule-grey divide-y divide-brand-rule-grey">
        {model.units.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-brand-mid-grey truncate">{u.serial_number ?? '—'}</span>
            <span className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white">{u.firmware_version ?? '—'}</span>
              {u.outdated && (
                <span className="text-[10px] text-brand-red bg-brand-red/10 border border-brand-red/30 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                  Update
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
