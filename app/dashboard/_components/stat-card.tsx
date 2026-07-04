import Link from 'next/link'

type Props = {
  label: string
  value: number | string
  sub?: string
  href: string
  accent?: boolean
}

export function StatCard({ label, value, sub, href, accent }: Props) {
  return (
    <Link
      href={href}
      className="block border border-brand-rule-grey rounded-lg p-4 bg-brand-dark-surface hover:border-white transition-colors"
    >
      <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-2">{label}</p>
      <p className={`text-3xl font-bold leading-none ${accent ? 'text-brand-red' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-brand-mid-grey/70 mt-2">{sub}</p>}
    </Link>
  )
}
