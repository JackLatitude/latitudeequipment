type Props = {
  label: string
  children: React.ReactNode
  required?: boolean
}

export function Field({ label, children, required }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
