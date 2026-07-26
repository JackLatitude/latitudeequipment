import { createClient } from '@/lib/supabase/server'
import type { Item, ItemFilters, CreateItemData, ItemTemplate } from '@/lib/types'

// Distinct items (by name) usable as a fill-in template when adding a new
// unit of a model already in stock. Serial is intentionally omitted.
export async function getItemTemplates(): Promise<ItemTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('id, name, category, value, country_of_origin, weight_kg, notes, unit_number')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const seen = new Set<string>()
  const templates: ItemTemplate[] = []
  for (const row of (data ?? []) as ItemTemplate[]) {
    const key = row.name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    templates.push(row)
  }
  return templates
}

export async function getItems(filters?: ItemFilters): Promise<Item[]> {
  const supabase = await createClient()
  let query = supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .is('deleted_at', null)
    .order('name')

  if (filters?.search) {
    // Strip PostgREST filter-DSL specials so user input can't inject clauses.
    const s = filters.search.replace(/[,()."\\]/g, ' ').trim()
    if (s) {
      query = query.or(`name.ilike.%${s}%,serial_number.ilike.%${s}%`)
    }
  }

  if (filters?.holderId === 'unassigned') {
    query = query.is('current_holder_id', null)
  } else if (filters?.holderId) {
    query = query.eq('current_holder_id', filters.holderId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Item[]
}

export async function getItem(id: string): Promise<Item | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*), paired_item:items!paired_item_id(id, name, serial_number, unit_number)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return null
  return data as Item
}

// Other active, unpaired items sharing this (trimmed, case-insensitive) name —
// candidates to pair with. Excludes the item itself.
export async function getUnpairedItemsByName(name: string, excludeId: string): Promise<Item[]> {
  const supabase = await createClient()
  const clean = name.trim().replace(/[,()."\\]/g, ' ').trim()
  const { data, error } = await supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .ilike('name', clean)
    .is('deleted_at', null)
    .is('paired_item_id', null)
    .neq('id', excludeId)
    .order('unit_number')
  if (error) throw new Error(error.message)
  return data as Item[]
}

// Links two items as a pair (same name required) and gives them a shared
// identification number — see migration 0009 for the atomic RPC.
export async function pairItems(itemAId: string, itemBId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('pair_items', { p_item_a: itemAId, p_item_b: itemBId })
  if (error) throw new Error(error.message)
}

export async function unpairItem(itemId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('unpair_item', { p_item_id: itemId })
  if (error) throw new Error(error.message)
}

export async function getLooseItems(): Promise<Item[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .is('deleted_at', null)
    .is('kit_id', null)
    .order('name')
  if (error) throw new Error(error.message)
  return data as Item[]
}

export async function createItem(data: CreateItemData): Promise<Item> {
  const supabase = await createClient()
  const { data: item, error } = await supabase
    .from('items')
    .insert(data)
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .single()
  if (error) throw new Error(error.message)
  return item as Item
}

export async function updateItem(id: string, data: Partial<CreateItemData>): Promise<Item> {
  const supabase = await createClient()
  const { data: item, error } = await supabase
    .from('items')
    .update(data)
    .eq('id', id)
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .single()
  if (error) throw new Error(error.message)
  return item as Item
}

export async function getItemBySerial(serial: string): Promise<Item | null> {
  const supabase = await createClient()
  // Case-insensitive exact match (no wildcards). Serials are alphanumeric;
  // supabase-js URL-encodes the value, so this is injection-safe.
  const { data, error } = await supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .ilike('serial_number', serial.trim())
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return (data?.[0] as Item) ?? null
}

// Most recently added item whose serial shares the given prefix (e.g. the DJI
// 4-char type code). Returns a template so the caller can pre-fill a new unit.
export async function getItemBySerialPrefix(prefix: string): Promise<ItemTemplate | null> {
  const clean = prefix.replace(/[%_\\]/g, '')
  if (clean.length < 4) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('id, name, category, value, country_of_origin, weight_kg, notes, unit_number')
    .ilike('serial_number', `${clean}%`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return (data?.[0] as ItemTemplate) ?? null
}

export async function getItemsByIds(ids: string[]): Promise<Item[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .in('id', ids)
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  return data as Item[]
}

export async function deleteItem(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
