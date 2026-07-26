/**
 * Order is meaningful: it drives both the category dropdowns and the section
 * order on the equipment page. Sorted by how often the kit gets reached for,
 * not alphabetically.
 */
export const ITEM_CATEGORIES = [
  'Cameras',
  'Drones',
  'Lenses',
  'Monitoring',
  'Batteries and Chargers',
  'Memory',
  'Accessories',
  'Lighting',
  'Grip',
] as const

export const ITEM_OWNERS = ['Latitude Equipment', 'Jack', 'Matt', 'Tom'] as const

export const FIRMWARE_CATEGORIES = ['Cameras', 'Monitoring', 'Drones'] as const

/**
 * The only item name that can be paired today (TB51 batteries are always
 * used and checked out two at a time). Deliberately a single hardcoded name,
 * not a general "pairable" flag — if a second model needs this later,
 * generalise then.
 */
export const PAIRABLE_ITEM_NAME = 'TB51 Battery'

export function isPairableItemName(name: string): boolean {
  return name.trim().toLowerCase() === PAIRABLE_ITEM_NAME.toLowerCase()
}

export type ItemOwner = (typeof ITEM_OWNERS)[number]

/**
 * Coerce arbitrary input to a known owner. Any value not in ITEM_OWNERS
 * (missing, empty, or unrecognised) falls back to the default, Latitude
 * Equipment. Owner is a low-stakes label, so the default is always safe.
 */
export function normalizeOwner(value: unknown): ItemOwner {
  return (ITEM_OWNERS as readonly string[]).includes(value as string)
    ? (value as ItemOwner)
    : ITEM_OWNERS[0]
}
