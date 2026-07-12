/**
 * A unit is out of date when its installed firmware differs from the model's
 * latest available firmware. Compared trimmed and case-insensitive. If either
 * side is empty/unknown we cannot make a claim, so we report NOT outdated. No
 * attempt is made to order versions — "differs from latest" is the signal.
 */
export function isOutdated(
  current: string | null | undefined,
  latest: string | null | undefined,
): boolean {
  const c = (current ?? '').trim()
  const l = (latest ?? '').trim()
  if (!c || !l) return false
  return c.toLowerCase() !== l.toLowerCase()
}
