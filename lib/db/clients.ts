import { createClient as createSupabase } from '@/lib/supabase/server'
import type { Client, CreateClientData } from '@/lib/types'

export async function getClients(): Promise<Client[]> {
  const supabase = await createSupabase()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data as Client[]
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createSupabase()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Client
}

export async function createClient_(data: CreateClientData): Promise<Client> {
  const supabase = await createSupabase()
  const { data: client, error } = await supabase
    .from('clients')
    .insert(data)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return client as Client
}

export async function updateClient(id: string, data: Partial<CreateClientData>): Promise<Client> {
  const supabase = await createSupabase()
  const { data: client, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return client as Client
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = await createSupabase()
  const { count, error: countError } = await supabase
    .from('hires')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
  if (countError) throw new Error(countError.message)
  if ((count ?? 0) > 0) throw new Error('CLIENT_HAS_HIRES')
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
