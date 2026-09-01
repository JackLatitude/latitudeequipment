import { NextResponse } from 'next/server'

/**
 * Log the real error server-side and return a generic 500 so database
 * internals (table/constraint names) never reach the client.
 */
export function serverError(e: unknown, context: string): NextResponse {
  console.error(`[api] ${context}:`, e)
  return NextResponse.json({ message: 'Something went wrong' }, { status: 500 })
}

/**
 * Parse a JSON body without letting malformed input throw a framework 500.
 * Returns the same loosely-typed shape request.json() gives (fields are
 * validated per-route), or null for malformed/non-object bodies.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson(request: Request): Promise<Record<string, any> | null> {
  const body = await request.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null
}

/** Parse an optional numeric field: undefined if absent/empty, null if invalid. */
export function optionalNumber(v: unknown): number | undefined | null {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

/**
 * Parse the optional user-supplied unit number. Blank means "let the database
 * pick the next free one", which is the common case, so it's `undefined`
 * rather than an error. Anything that isn't a whole number of 1 or more is
 * rejected with a message meant for the person filling in the form.
 */
export function parseUnitNumber(
  v: unknown
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  if (v === undefined || v === null || v === '') return { ok: true, value: undefined }
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, message: 'Unit number must be a whole number of 1 or more' }
  }
  return { ok: true, value: n }
}
