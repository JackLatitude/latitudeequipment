import { createClient } from '@/lib/supabase/server'
import type { Kit, CreateKitData } from '@/lib/types'

export async function getKits(): Promise<Kit[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kits')
    .select('*, current_holder:profiles(*)')
    .order('name')
  if (error) throw new Error(error.message)
  return data as Kit[]
}

export async function getKit(id: string): Promise<Kit | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kits')
    .select('*, current_holder:profiles(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Kit
}

export async function createKit(data: CreateKitData): Promise<Kit> {
  const supabase = await createClient()
  const { data: kit, error } = await supabase
    .from('kits')
    .insert(data)
    .select('*, current_holder:profiles(*)')
    .single()
  if (error) throw new Error(error.message)
  return kit as Kit
}

export async function updateKit(id: string, data: Partial<CreateKitData>): Promise<Kit> {
  const supabase = await createClient()
  const { data: kit, error } = await supabase
    .from('kits')
    .update(data)
    .eq('id', id)
    .select('*, current_holder:profiles(*)')
    .single()
  if (error) throw new Error(error.message)
  return kit as Kit
}

export async function deleteKit(id: string): Promise<void> {
  const supabase = await createClient()
  // Detach all items from kit first
  await supabase.from('items').update({ kit_id: null }).eq('kit_id', id)
  const { error } = await supabase.from('kits').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function duplicateKit(kitId: string, duplicatedById: string): Promise<Kit> {
  const supabase = await createClient()

  // Fetch original kit
  const { data: original, error: kitError } = await supabase
    .from('kits')
    .select('*')
    .eq('id', kitId)
    .single()
  if (kitError) throw new Error(kitError.message)

  // Fetch items in original kit (non-deleted)
  const { data: originalItems, error: itemsError } = await supabase
    .from('items')
    .select('name, serial_number, category, notes, value, country_of_origin, weight_kg')
    .eq('kit_id', kitId)
    .is('deleted_at', null)
  if (itemsError) throw new Error(itemsError.message)

  // Create new kit assigned to the user who duplicated it
  const { data: newKit, error: newKitError } = await supabase
    .from('kits')
    .insert({
      name: `${original.name} — Copy`,
      description: original.description,
      current_holder_id: duplicatedById,
    })
    .select('*, current_holder:profiles(*)')
    .single()
  if (newKitError) throw new Error(newKitError.message)

  // Create new item records with serial_number cleared
  if (originalItems && originalItems.length > 0) {
    const newItems = originalItems.map((item) => ({
      ...item,
      serial_number: null,
      kit_id: newKit.id,
      current_holder_id: duplicatedById,
    }))
    const { error: newItemsError } = await supabase.from('items').insert(newItems).select('*')
    if (newItemsError) throw new Error(newItemsError.message)
  }

  return newKit as Kit
}
