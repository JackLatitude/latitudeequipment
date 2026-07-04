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
  // Single transaction: kit holder + item holders + history (migration 0004).
  const { error } = await supabase.rpc('assign_kit', {
    p_kit_id: kitId,
    p_assigned_to: assignedToId,
    p_assigned_by: assignedById,
  })
  if (error) throw new Error(error.message)
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
