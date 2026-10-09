import { createClient } from '@/lib/supabase/server'
import type { Hire, HireItem, HireStatus, CreateHireData } from '@/lib/types'

// profiles is referenced by both created_by_id and latitude_contact_id, so the
// embed must name the FK column to disambiguate.
const HIRE_SELECT = '*, client:clients(*), latitude_contact:profiles!latitude_contact_id(*)'
const HIRE_DETAIL_SELECT =
  '*, client:clients(*), latitude_contact:profiles!latitude_contact_id(*), hire_items(*, item:items(*))'
// List views (HireCard, dashboard) only need the client name, the item count
// and which items are still out — not every hire_item's full item row.
const HIRE_LIST_SELECT = '*, client:clients(*), hire_items(item_id, checked_in_at)'

export async function getHires(statuses?: HireStatus[]): Promise<Hire[]> {
  const supabase = await createClient()
  let query = supabase
    .from('hires')
    .select(HIRE_LIST_SELECT)
    .order('created_at', { ascending: false })
  if (statuses) query = query.in('status', statuses)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as unknown as Hire[]
}

export async function getHire(id: string): Promise<Hire | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hires')
    .select(HIRE_DETAIL_SELECT)
    .eq('id', id)
    .single()
  if (error) return null
  return data as Hire
}

export async function getHiresByClient(clientId: string): Promise<Hire[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hires')
    .select(HIRE_LIST_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as unknown as Hire[]
}

export async function createHire(data: CreateHireData): Promise<Hire> {
  const supabase = await createClient()
  // The LAT-ref trigger computes max+1 without locking, so two simultaneous
  // inserts can collide on the unique constraint — retry once on 23505.
  for (let attempt = 0; ; attempt++) {
    const { data: hire, error } = await supabase
      .from('hires')
      .insert(data)
      .select(HIRE_SELECT)
      .single()
    if (!error) return hire as Hire
    if (error.code === '23505' && attempt === 0) continue
    throw new Error(error.message)
  }
}

export async function updateHire(
  id: string,
  data: Partial<Omit<CreateHireData, 'created_by_id'>>
): Promise<Hire> {
  const supabase = await createClient()
  const { data: hire, error } = await supabase
    .from('hires')
    .update(data)
    .eq('id', id)
    .select(HIRE_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return hire as Hire
}

export async function addHireItems(hireId: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return
  const supabase = await createClient()
  const rows = itemIds.map((item_id) => ({ hire_id: hireId, item_id }))
  const { error } = await supabase
    .from('hire_items')
    .upsert(rows, { onConflict: 'hire_id,item_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

export async function removeHireItem(hireId: string, itemId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('hire_items')
    .delete()
    .eq('hire_id', hireId)
    .eq('item_id', itemId)
  if (error) throw new Error(error.message)
}

export async function checkoutHire(hireId: string): Promise<void> {
  const supabase = await createClient()
  // Single transaction: items + status together (migration 0004).
  const { error } = await supabase.rpc('checkout_hire', { p_hire_id: hireId })
  if (error) throw new Error(error.message)
}

export async function checkinHireItem(
  hireId: string,
  itemId: string,
  condition?: string
): Promise<void> {
  const supabase = await createClient()
  const update: Record<string, string> = { checked_in_at: new Date().toISOString() }
  if (condition) update.condition_in = condition
  const { error } = await supabase
    .from('hire_items')
    .update(update)
    .eq('hire_id', hireId)
    .eq('item_id', itemId)
  if (error) throw new Error(error.message)
}

export async function checkinHire(hireId: string): Promise<void> {
  const supabase = await createClient()
  // Single transaction: outstanding items + status together (migration 0004).
  const { error } = await supabase.rpc('checkin_hire', { p_hire_id: hireId })
  if (error) throw new Error(error.message)
}

export async function reopenHire(hireId: string): Promise<void> {
  const supabase = await createClient()
  // Single transaction: clears the item checkout/check-in stamps and drops the
  // hire back to draft together (migration 0014).
  const { error } = await supabase.rpc('reopen_hire', { p_hire_id: hireId })
  if (error) throw new Error(error.message)
}

export async function getActiveHireItemsByItemIds(itemIds: string[]): Promise<HireItem[]> {
  if (itemIds.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hire_items')
    .select('*, hire:hires!inner(*)')
    .in('item_id', itemIds)
    .not('checked_out_at', 'is', null)
    .is('checked_in_at', null)
    .eq('hire.status', 'active')
  if (error) throw new Error(error.message)
  return data as unknown as HireItem[]
}

// Every item currently out on an active hire. Fetched as a whole rather than
// filtered by a caller-supplied id list: an `in` filter of every item id puts
// one UUID per item into the request URL, which grows with the inventory until
// it hits the URL length limit. The on-hire set is bounded by what's out.
export async function getOnHireItemIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hire_items')
    .select('item_id, hire:hires!inner(status)')
    .not('checked_out_at', 'is', null)
    .is('checked_in_at', null)
    .eq('hire.status', 'active')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.item_id as string)
}

// The active hire a kit is out on, if any (via any of its live items).
export async function getActiveHireItemForKit(kitId: string): Promise<HireItem | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hire_items')
    .select('*, hire:hires!inner(*), item:items!inner(kit_id, deleted_at)')
    .eq('item.kit_id', kitId)
    .is('item.deleted_at', null)
    .not('checked_out_at', 'is', null)
    .is('checked_in_at', null)
    .eq('hire.status', 'active')
    .limit(1)
  if (error) throw new Error(error.message)
  return (data?.[0] as unknown as HireItem) ?? null
}

export async function deleteHire(id: string): Promise<void> {
  const supabase = await createClient()
  // hire_items rows are removed by the ON DELETE CASCADE on hire_items.hire_id.
  const { error } = await supabase.from('hires').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getHireStatus(hireId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hires')
    .select('status')
    .eq('id', hireId)
    .single()
  if (error) return null
  return data.status
}
