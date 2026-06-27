type Props = { label: string; required?: boolean; children: React.ReactNode }

export function Field({ label, required, children }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-1">
        {label}{required && <span className="text-brand-red ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
