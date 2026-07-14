type Props = {
  label: string
  required?: boolean
  /** Match the `id` of the control this labels so clicking the label focuses it. */
  htmlFor?: string
  children: React.ReactNode
}

export function Field({ label, required, htmlFor, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-white mb-1">
        {label}{required && <span className="text-brand-red ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
