import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary'

const base =
  'inline-flex items-center justify-center gap-2 rounded text-sm font-medium transition-[opacity,transform,background-color,border-color] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-brand-black disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-red text-white px-4 py-2 hover:opacity-90',
  secondary: 'border border-brand-rule-grey text-white px-4 py-2 hover:bg-brand-dark-surface',
}

/** Class string for the shared button, for use on `<Link>`/`<a>` styled as buttons. */
export function buttonClasses(variant: Variant = 'primary', className?: string): string {
  return cn(base, variants[variant], className)
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  /** Shows a spinner and disables the button while an async action is in flight. */
  loading?: boolean
  /** Optional label to show in place of children while loading (e.g. "Saving…"). */
  loadingLabel?: string
}

export function Button({
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, className)}
    >
      {loading && <Spinner />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
}
