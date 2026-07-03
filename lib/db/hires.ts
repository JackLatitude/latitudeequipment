import { createClient } from '@/lib/supabase/server'
import type { Hire, HireItem, CreateHireData } from '@/lib/types'

const HIRE_SELECT = '*, client:clients(*)'
const HIRE_DETAIL_SELECT = '*, client:clients(*), hire_items(*, item:items(*))'

export async function getHires(): Promise<Hire[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hires')
    .select(HIRE_DETAIL_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Hire[]
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
    .select(HIRE_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Hire[]
}

export async function createHire(data: CreateHireData): Promise<Hire> {
  const supabase = await createClient()
  const { data: hire, error } = await supabase
    .from('hires')
    .insert(data)
    .select(HIRE_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return hire as Hire
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
  const now = new Date().toISOString()
  const { error: itemsError } = await supabase
    .from('hire_items')
    .update({ checked_out_at: now })
    .eq('hire_id', hireId)
  if (itemsError) throw new Error(itemsError.message)
  const { error } = await supabase
    .from('hires')
    .update({ status: 'active' })
    .eq('id', hireId)
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
  const now = new Date().toISOString()
  const { error: itemsError } = await supabase
    .from('hire_items')
    .update({ checked_in_at: now })
    .eq('hire_id', hireId)
    .is('checked_in_at', null)
  if (itemsError) throw new Error(itemsError.message)
  const { error } = await supabase
    .from('hires')
    .update({ status: 'returned' })
    .eq('id', hireId)
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
