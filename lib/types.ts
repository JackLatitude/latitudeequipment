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
  kit_id?: string
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
