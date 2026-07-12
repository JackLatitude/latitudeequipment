export const ITEM_CATEGORIES = [
  'Drones',
  'Cameras',
  'Lenses',
  'Batteries and Chargers',
  'Grip',
  'Lighting',
  'Monitoring',
  'Memory',
  'Accessories',
] as const

export const ITEM_OWNERS = ['Latitude Equipment', 'Jack', 'Matt', 'Tom'] as const

export const FIRMWARE_CATEGORIES = ['Cameras', 'Monitoring', 'Drones'] as const

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
