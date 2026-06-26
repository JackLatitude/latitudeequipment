type Props = {
  label: string
  children: React.ReactNode
  required?: boolean
}

export function Field({ label, children, required }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-black mb-1">
        {label}{required && <span className="text-brand-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
