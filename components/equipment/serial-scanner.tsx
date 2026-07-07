'use client'

import { useEffect, useRef, useState } from 'react'
import { BarcodeDetector } from 'barcode-detector/ponyfill'

type Props = {
  onDetected: (text: string) => void
  onClose: () => void
}

const FORMATS = [
  'qr_code',
  'data_matrix',
  'code_128',
  'code_39',
  'ean_13',
  'ean_8',
  'upc_a',
  'itf',
] as const

export default function SerialScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const doneRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined

    async function start() {
      if (!window.isSecureContext) {
        setError('Camera scanning needs a secure (HTTPS) connection. Type the serial instead.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser has no camera access. Type the serial instead.')
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch {
        setError('Camera access was blocked. Allow it in your browser settings, or type the serial instead.')
        return
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => undefined)

      const [track] = stream.getVideoTracks()
      // Torch support is a track capability, not universal
      const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }
      if (caps?.torch) setTorchAvailable(true)

      const detector = new BarcodeDetector({ formats: [...FORMATS] })

      let detecting = false
      interval = setInterval(async () => {
        if (detecting || doneRef.current || !videoRef.current) return
        if (videoRef.current.readyState < 2) return
        detecting = true
        try {
          const codes = await detector.detect(videoRef.current)
          const value = codes.find((c) => c.rawValue.trim())?.rawValue.trim()
          if (value && !doneRef.current) {
            doneRef.current = true
            navigator.vibrate?.(50)
            onDetected(value)
          }
        } catch {
          // Transient decode errors (e.g. frame not ready) — keep scanning
        } finally {
          detecting = false
        }
      }, 100)
    }

    start()

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [onDetected])

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      setTorchAvailable(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-black flex flex-col" role="dialog" aria-label="Scan serial number">
      {/* Camera feed */}
      <div className="relative flex-1 overflow-hidden">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center px-8 bg-brand-black">
            <div className="text-center max-w-xs">
              <p className="text-sm text-white mb-6">{error}</p>
              <button
                onClick={onClose}
                className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90"
              >
                Type it instead
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Dimmed surround + reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-60 h-60">
                <div className="absolute inset-0 rounded-lg shadow-[0_0_0_100vmax_rgba(0,0,0,0.55)]" />
                <span className="absolute -top-px -left-px w-8 h-8 border-t-2 border-l-2 border-brand-red rounded-tl-lg" />
                <span className="absolute -top-px -right-px w-8 h-8 border-t-2 border-r-2 border-brand-red rounded-tr-lg" />
                <span className="absolute -bottom-px -left-px w-8 h-8 border-b-2 border-l-2 border-brand-red rounded-bl-lg" />
                <span className="absolute -bottom-px -right-px w-8 h-8 border-b-2 border-r-2 border-brand-red rounded-br-lg" />
              </div>
            </div>
            <p className="absolute left-0 right-0 bottom-28 text-center text-xs font-extralight uppercase tracking-wider text-white/90 pointer-events-none">
              Point at the serial code
            </p>
          </>
        )}
      </div>

      {/* Controls */}
      <div
        className="flex items-center justify-between px-8 py-5 bg-brand-black border-t border-brand-rule-grey"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <button onClick={onClose} className="text-sm text-brand-mid-grey hover:text-white transition-colors">
          Cancel
        </button>
        {torchAvailable && !error && (
          <button
            onClick={toggleTorch}
            aria-pressed={torchOn}
            className={`text-sm border rounded px-3 py-1.5 transition-colors ${
              torchOn
                ? 'text-brand-red border-brand-red/50'
                : 'text-white border-brand-rule-grey hover:border-white'
            }`}
          >
            {torchOn ? 'Torch on' : 'Torch'}
          </button>
        )}
      </div>
    </div>
  )
}
