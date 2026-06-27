'use client'

import { useState } from 'react'
import type { Item, Kit } from '@/lib/types'

type Props = { items: Item[]; kits: Kit[] }

export function CarnetSelector({ items, kits }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  // Group items: kit groups then loose items
  const itemsByKit = new Map<string, Item[]>()
  const looseItems: Item[] = []

  for (const item of items) {
    if (item.kit_id) {
      const group = itemsByKit.get(item.kit_id) ?? []
      group.push(item)
      itemsByKit.set(item.kit_id, group)
    } else {
      looseItems.push(item)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroup(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => prev.has(id))
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  async function handleExport() {
    if (selected.size === 0) return
    setExporting(true)
    try {
      const res = await fetch('/api/carnet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selected) }),
      })
      if (!res.ok) {
        const { message } = await res.json()
        alert(`Export failed: ${message}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'carnet-export.xlsx'
      a.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      {/* Sticky export bar */}
      <div className="sticky top-0 z-10 bg-brand-black/80 backdrop-blur border-b border-brand-rule-grey py-3 mb-6 flex items-center justify-between">
        <span className="text-sm text-brand-mid-grey">
          {selected.size === 0 ? 'No items selected' : `${selected.size} item${selected.size === 1 ? '' : 's'} selected`}
        </span>
        <button
          onClick={handleExport}
          disabled={selected.size === 0 || exporting}
          className="text-sm font-medium bg-brand-red text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-40"
        >
          {exporting ? 'Exporting…' : 'Export .xlsx'}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-brand-mid-grey">No equipment added yet.</p>
      )}

      {/* Kit groups */}
      {kits.map((kit) => {
        const kitItems = itemsByKit.get(kit.id) ?? []
        if (kitItems.length === 0) return null
        const kitIds = kitItems.map((i) => i.id)
        const allSelected = kitIds.every((id) => selected.has(id))
        const someSelected = kitIds.some((id) => selected.has(id))

        return (
          <div key={kit.id} className="mb-6">
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-brand-rule-grey">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={() => toggleGroup(kitIds)}
                className="accent-brand-red"
              />
              <span className="text-sm font-medium text-white">{kit.name}</span>
              <span className="text-xs text-brand-mid-grey">— {kit.current_holder?.display_name}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brand-mid-grey text-xs">
                  <th className="pb-1 w-8" />
                  <th className="pb-1 pr-4">Name</th>
                  <th className="pb-1 pr-4">Serial</th>
                  <th className="pb-1 pr-4">Value (£)</th>
                  <th className="pb-1 pr-4">Country</th>
                  <th className="pb-1">Weight (kg)</th>
                </tr>
              </thead>
              <tbody>
                {kitItems.map((item) => (
                  <tr key={item.id} className="border-b border-brand-rule-grey hover:bg-brand-dark-surface">
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="accent-brand-red"
                      />
                    </td>
                    <td className="py-2 pr-4 text-white">{item.name}</td>
                    <td className="py-2 pr-4 text-brand-mid-grey">{item.serial_number ?? '—'}</td>
                    <td className="py-2 pr-4 text-brand-mid-grey">{item.value ?? '—'}</td>
                    <td className="py-2 pr-4 text-brand-mid-grey">{item.country_of_origin ?? '—'}</td>
                    <td className="py-2 text-brand-mid-grey">{item.weight_kg ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {/* Loose items */}
      {looseItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2 pb-2 border-b border-brand-rule-grey">
            <input
              type="checkbox"
              checked={looseItems.every((i) => selected.has(i.id))}
              ref={(el) => {
                if (el) {
                  const some = looseItems.some((i) => selected.has(i.id))
                  const all = looseItems.every((i) => selected.has(i.id))
                  el.indeterminate = some && !all
                }
              }}
              onChange={() => toggleGroup(looseItems.map((i) => i.id))}
              className="accent-brand-red"
            />
            <span className="text-sm font-medium text-white">Loose items</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-mid-grey text-xs">
                <th className="pb-1 w-8" />
                <th className="pb-1 pr-4">Name</th>
                <th className="pb-1 pr-4">Serial</th>
                <th className="pb-1 pr-4">Value (£)</th>
                <th className="pb-1 pr-4">Country</th>
                <th className="pb-1">Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {looseItems.map((item) => (
                <tr key={item.id} className="border-b border-brand-rule-grey hover:bg-brand-dark-surface">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                      className="accent-brand-red"
                    />
                  </td>
                  <td className="py-2 pr-4 text-white">{item.name}</td>
                  <td className="py-2 pr-4 text-brand-mid-grey">{item.serial_number ?? '—'}</td>
                  <td className="py-2 pr-4 text-brand-mid-grey">{item.value ?? '—'}</td>
                  <td className="py-2 pr-4 text-brand-mid-grey">{item.country_of_origin ?? '—'}</td>
                  <td className="py-2 text-brand-mid-grey">{item.weight_kg ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
