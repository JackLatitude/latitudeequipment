/**
 * Display label for an item — appends its immutable per-name unit number
 * (e.g. "Sony FX6 #3") so items sharing a name can be told apart at a
 * glance without touching the underlying `name` field.
 */
export function itemDisplayName(item: { name: string; unit_number?: number | null }): string {
  return item.unit_number != null ? `${item.name} #${item.unit_number}` : item.name
}
