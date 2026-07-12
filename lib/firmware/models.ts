import { isOutdated } from './compare'
import type { FirmwareItemRow, FirmwareModel, FirmwareTarget } from '@/lib/types'

/**
 * Group firmware-tracked item rows by model name (trimmed, case-insensitive),
 * join each group to its target, and flag out-of-date units. Pure — the DB
 * layer fetches the rows and delegates here so the page and the dashboard
 * alert share one implementation.
 */
export function buildFirmwareModels(
  items: FirmwareItemRow[],
  targets: FirmwareTarget[],
): FirmwareModel[] {
  const targetByModel = new Map(targets.map((t) => [t.model.trim().toLowerCase(), t]))
  const groups = new Map<string, FirmwareModel>()

  for (const it of items) {
    const model = it.name.trim()
    const key = model.toLowerCase()
    const target = targetByModel.get(key) ?? null
    let group = groups.get(key)
    if (!group) {
      group = {
        model,
        manufacturer: target?.manufacturer ?? null,
        latest_version: target?.latest_version ?? null,
        source_url: target?.source_url ?? null,
        last_checked_at: target?.last_checked_at ?? null,
        units: [],
      }
      groups.set(key, group)
    }
    group.units.push({
      id: it.id,
      serial_number: it.serial_number,
      firmware_version: it.firmware_version,
      outdated: isOutdated(it.firmware_version, target?.latest_version ?? null),
    })
  }

  return Array.from(groups.values()).sort((a, b) => a.model.localeCompare(b.model))
}

export function countOutdated(models: FirmwareModel[]): number {
  return models.reduce((n, m) => n + m.units.filter((u) => u.outdated).length, 0)
}
