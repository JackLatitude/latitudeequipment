import { createClient } from '@/lib/supabase/server'
import type { AssignmentHistory } from '@/lib/types'

export async function assignItem(
  itemId: string,
  assignedToId: string | null,
  assignedById: string,
  note?: string
): Promise<void> {
  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from('items')
    .update({ current_holder_id: assignedToId })
    .eq('id', itemId)
  if (updateError) throw new Error(updateError.message)

  const { error: historyError } = await supabase
    .from('assignment_history')
    .insert({
      item_id: itemId,
      assigned_to_id: assignedToId,
      assigned_by_id: assignedById,
      note: note ?? null,
    })
  if (historyError) throw new Error(historyError.message)
}

export async function assignKit(
  kitId: string,
  assignedToId: string,
  assignedById: string
): Promise<void> {
  const supabase = await createClient()

  // Fetch all non-deleted items in this kit
  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id')
    .eq('kit_id', kitId)
    .is('deleted_at', null)
  if (fetchError) throw new Error(fetchError.message)

  // Update kit holder
  const { error: kitError } = await supabase
    .from('kits')
    .update({ current_holder_id: assignedToId })
    .eq('id', kitId)
  if (kitError) throw new Error(kitError.message)

  if (!items || items.length === 0) return

  // Update all items and write history records
  const { error: itemsError } = await supabase
    .from('items')
    .update({ current_holder_id: assignedToId })
    .eq('kit_id', kitId)
    .is('deleted_at', null)
  if (itemsError) throw new Error(itemsError.message)

  const historyRecords = items.map((item) => ({
    item_id: item.id,
    assigned_to_id: assignedToId,
    assigned_by_id: assignedById,
    note: `Kit assignment`,
  }))

  const { error: historyError } = await supabase
    .from('assignment_history')
    .insert(historyRecords)
  if (historyError) throw new Error(historyError.message)
}

export async function getItemHistory(itemId: string): Promise<AssignmentHistory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assignment_history')
    .select('*, assigned_to:profiles!assigned_to_id(*), assigned_by:profiles!assigned_by_id(*)')
    .eq('item_id', itemId)
    .order('assigned_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as AssignmentHistory[]
}
