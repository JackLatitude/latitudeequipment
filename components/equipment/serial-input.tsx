'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// The scanner chunk (incl. the WASM decoder) loads only when Scan is tapped.
const SerialScanner = dynamic(() => import('./serial-scanner'), { ssr: false })

type Props = {
  name: string
  value: string
  onChange: (value: string) => void
  inputClass: string
}

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  )
}

export function SerialInput({ name, value, onChange, inputClass }: Props) {
  const [scanning, setScanning] = useState(false)

  return (
    <div className="flex gap-2">
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setScanning(true)}
        aria-label="Scan serial number with camera"
        className="flex-shrink-0 text-white border border-brand-rule-grey hover:border-white rounded px-3 transition-colors"
      >
        <ScanIcon />
      </button>
      {scanning && (
        <SerialScanner
          onDetected={(text) => {
            onChange(text)
            setScanning(false)
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  )
}
