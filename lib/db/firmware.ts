import { createClient } from '@/lib/supabase/server'
import { FIRMWARE_CATEGORIES } from '@/lib/constants'
import { buildFirmwareModels, countOutdated } from '@/lib/firmware/models'
import type {
  FirmwareItemRow,
  FirmwareModel,
  FirmwareTarget,
  UpsertFirmwareTargetData,
} from '@/lib/types'

export async function getFirmwareTargets(): Promise<FirmwareTarget[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('firmware_targets').select('*').order('model')
  if (error) throw new Error(error.message)
  return data as FirmwareTarget[]
}

/**
 * Insert or update a target keyed on model. Only fields present in `data` are
 * written, so a partial save cannot wipe other columns. Setting a non-empty
 * latest_version stamps last_checked_at (the moment the latest was confirmed).
 */
export async function upsertFirmwareTarget(
  data: UpsertFirmwareTargetData,
): Promise<FirmwareTarget> {
  const supabase = await createClient()
  const row: Record<string, unknown> = { model: data.model.trim() }
  if (data.manufacturer !== undefined) row.manufacturer = data.manufacturer.trim() || null
  if (data.source_url !== undefined) row.source_url = data.source_url.trim() || null
  if (data.latest_version !== undefined) {
    const v = data.latest_version.trim()
    row.latest_version = v || null
    if (v) row.last_checked_at = new Date().toISOString()
  }
  const { data: saved, error } = await supabase
    .from('firmware_targets')
    .upsert(row, { onConflict: 'model' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return saved as FirmwareTarget
}

export async function getFirmwareModels(): Promise<FirmwareModel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('id, name, serial_number, firmware_version')
    .in('category', [...FIRMWARE_CATEGORIES])
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  const targets = await getFirmwareTargets()
  return buildFirmwareModels((data ?? []) as FirmwareItemRow[], targets)
}

export async function getOutdatedFirmwareCount(): Promise<number> {
  return countOutdated(await getFirmwareModels())
}
