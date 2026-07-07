# Serial Number Scanner — Design Spec

**Date:** 2026-07-05
**Status:** Approved (Approach A)

## Goal

Let users fill the serial number field on the equipment forms by scanning the
code printed on the kit with the phone camera — DJI QR/DataMatrix stickers and
generic 1D barcodes — while keeping manual entry exactly as it is.

## Approach

Live camera scanning with the `barcode-detector` ponyfill (zxing-wasm under
the hood). It uses the browser's native `BarcodeDetector` where available
(Android/Chrome) and falls back to WASM decoding everywhere else, including
Safari/iOS standalone PWAs. One API, QR + 1D formats, no server involvement.

Rejected: `html5-qrcode` (heavier, unbrandable built-in UI, patchier
maintenance); single-photo capture + decode (no live feedback, slow loop).

## UX

- The serial field on **Add item** and **Edit item** gains a Scan button
  (viewfinder icon) at the end of the input row. Typing is unchanged.
- Tapping Scan opens a full-screen overlay: rear-camera live feed, dimmed
  surround with a central reticle, hint text ("Point at the serial code"),
  a torch toggle (only when the camera track supports it), and Cancel.
- Decode loop runs ~10 fps against these formats:
  `qr_code`, `data_matrix`, `code_128`, `code_39`, `ean_13`, `ean_8`,
  `upc_a`, `itf`.
- On first successful decode: `navigator.vibrate(50)` where supported,
  overlay closes, decoded text fills the serial input. The field stays
  editable — the user can correct or clear it before saving.
- Failure states render inside the overlay with a dismiss action:
  permission denied ("Allow camera access in Settings, or type the serial
  instead"), no camera, or insecure context. Manual entry is never blocked.

## Components

- `components/equipment/serial-scanner.tsx` — the overlay. Props:
  `onDetected(text: string)`, `onClose()`. Owns getUserMedia lifecycle
  (rear camera preference, track cleanup on unmount), the detector loop,
  and torch state. Imports `barcode-detector/ponyfill` so the WASM decoder
  is only in this chunk.
- `components/equipment/serial-input.tsx` — input + Scan button row.
  Props: `name`, `defaultValue?`, `inputClass`. Holds controlled value
  state, lazy-loads the scanner with `next/dynamic` (`ssr: false`) only
  when the button is first tapped.
- `app/equipment/new/page.tsx` and
  `app/equipment/[id]/edit/_components/edit-item-form.tsx` swap their
  serial `<input>` for `<SerialInput>`; form submission still reads the
  same `serial_number` field via FormData / existing state.

## Constraints

- One new dependency: `barcode-detector`.
- No API or schema changes.
- Requires HTTPS (production is; localhost is a secure context for dev).
- Brand styling per existing tokens; scan reticle uses `brand-red`.
