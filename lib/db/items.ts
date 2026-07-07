import { createClient } from '@/lib/supabase/server'
import type { Item, ItemFilters, CreateItemData } from '@/lib/types'

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
    .select('*, current_holder:profiles(*), kit:kits(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return null
  return data as Item
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
