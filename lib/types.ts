export type Profile = {
  id: string
  display_name: string
  is_admin: boolean
  created_at: string
}

export type Kit = {
  id: string
  name: string
  description: string | null
  current_holder_id: string
  current_holder?: Profile
  created_at: string
}

export type Item = {
  id: string
  name: string
  serial_number: string | null
  category: string | null
  notes: string | null
  kit_id: string | null
  kit?: Kit
  current_holder_id: string | null
  current_holder?: Profile
  value: number | null
  country_of_origin: string | null
  weight_kg: number | null
  deleted_at: string | null
  created_at: string
}

export type AssignmentHistory = {
  id: string
  item_id: string
  assigned_to_id: string | null
  assigned_to?: Profile | null
  assigned_by_id: string
  assigned_by?: Profile
  assigned_at: string
  note: string | null
}

export type ItemFilters = {
  holderId?: string | 'unassigned'
  search?: string
}

export type CreateItemData = {
  name: string
  serial_number?: string
  category?: string
  notes?: string
  kit_id?: string | null
  current_holder_id?: string
  value?: number
  country_of_origin?: string
  weight_kg?: number
}

export type CreateKitData = {
  name: string
  description?: string
  current_holder_id: string
}

export type Client = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type CreateClientData = {
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export type HireStatus = 'draft' | 'active' | 'returned'

export type Hire = {
  id: string
  ref: string
  title: string
  client_id: string
  client?: Client
  start_date: string | null
  end_date: string | null
  status: HireStatus
  notes: string | null
  created_by_id: string | null
  created_at: string
  hire_items?: HireItem[]
}

export type HireItem = {
  id: string
  hire_id: string
  item_id: string
  item?: Item
  hire?: Hire
  checked_out_at: string | null
  checked_in_at: string | null
  condition_out: string | null
  condition_in: string | null
}

export type CreateHireData = {
  title: string
  client_id: string
  start_date?: string
  end_date?: string
  notes?: string
  created_by_id: string
}
