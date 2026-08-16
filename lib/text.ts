// Known equipment/industry abbreviations that should always render fully
// uppercase, even though they're pure letters and too long for the 2-letter
// rule below to catch (e.g. "dji" -> "DJI", not "Dji").
const ABBREVIATIONS = new Set([
  'dji', 'led', 'usb', 'hdmi', 'gps', 'sd', 'cf', 'nd', 'pl', 'ef', 'rf',
  'red', 'arri', 'fpv',
])

// Common English 2-letter words. A lowercase 2-letter word not in this list
// is assumed to be an abbreviation (e.g. "dx" -> "DX") rather than a real
// word (e.g. "to" -> "To", not "TO").
const SMALL_WORDS = new Set([
  'to', 'in', 'on', 'of', 'by', 'at', 'or', 'is', 'be', 'as', 'if', 'so',
  'up', 'no', 'we', 'he', 'my', 'us', 'am', 'an', 'do', 'go', 'hi', 'me',
  'ok', 'oh',
])

/**
 * Capitalises each word of a name for consistent display, e.g. when a new
 * equipment item, kit, or client is added.
 *
 * - Words that already contain an uppercase letter are left untouched, so
 *   deliberately-cased input (e.g. copied from an existing item) isn't
 *   mangled.
 * - Words mixing letters and digits (e.g. "fx9", "4d") have their letters
 *   uppercased and digits left as-is — real words never contain digits, so
 *   this is unambiguous.
 * - Pure-letter words in the known ABBREVIATIONS list are fully uppercased.
 * - Pure-letter, exactly-2-character words are fully uppercased unless
 *   they're a common English word (see SMALL_WORDS), in which case they get
 *   normal title casing instead.
 * - Everything else just has its first letter capitalised.
 */
export function capitalizeWords(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (/[A-Z]/.test(word)) return word

      const hasDigit = /\d/.test(word)
      const hasLetter = /[a-z]/i.test(word)

      if (hasDigit && hasLetter) {
        return word.replace(/[a-z]/gi, (c) => c.toUpperCase())
      }

      const lower = word.toLowerCase()
      const isPureLetters = /^[a-z]+$/i.test(word)

      if (isPureLetters && ABBREVIATIONS.has(lower)) {
        return word.toUpperCase()
      }

      if (isPureLetters && word.length === 2 && !SMALL_WORDS.has(lower)) {
        return word.toUpperCase()
      }

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
