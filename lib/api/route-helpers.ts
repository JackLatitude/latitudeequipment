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
