import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Keyboard } from 'lucide-react'

interface Props {
  onScan: (barcode: string) => void
  active?: boolean
}

export default function BarcodeScanner({ onScan, active = true }: Props) {
  const [mode, setMode] = useState<'camera' | 'keyboard'>('keyboard')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<unknown>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 })
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Barcode skaner ovozi — klassik "beep" (kvadrat to'lqin, 1000 Hz, 120ms)
  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioCtxRef.current = new Ctx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 1000
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch {
      // Sessiz ravishda o'tkazib yuborish
    }
  }

  // Debounced scan handler — ignore same barcode within 2.5 seconds
  const handleScan = (code: string) => {
    const now = Date.now()
    const { code: lastCode, time: lastTime } = lastScanRef.current
    if (code === lastCode && now - lastTime < 2500) return
    lastScanRef.current = { code, time: now }
    playBeep()
    if (navigator.vibrate) navigator.vibrate(80)
    onScan(code)
  }

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        const s = scannerRef.current as { stop: () => Promise<void> }
        await s.stop()
      } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  const startCamera = async () => {
    setError('')
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('barcode-reader', {
        // Faqat kerakli formatlar — dekoder tezroq ishlaydi
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.DATA_MATRIX,  // markirovka kodlari uchun
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
        ],
        // Native BarcodeDetector API (Chrome Android/desktop) — GPU tezlashuvi
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      })
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 8,
          qrbox: { width: 260, height: 160 },
        },
        (decoded) => {
          handleScan(decoded)
        },
        () => {}
      )
      setScanning(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('NotAllowed')) {
        setError("Kamera ruxsati berilmadi. Brauzer sozlamalarini tekshiring.")
      } else {
        setError("Kamera ishga tushmadi: " + msg)
      }
      setScanning(false)
    }
  }

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  useEffect(() => {
    if (!active) stopCamera()
  }, [active])

  // USB barcode scanner (keyboard input) handler
  const handleKeyInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = inputRef.current?.value.trim()
      if (val) {
        handleScan(val)
        if (inputRef.current) inputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('keyboard'); stopCamera() }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'keyboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Keyboard size={14} /> Qo'lda / USB
        </button>
        <button
          onClick={() => setMode('camera')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'camera' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Camera size={14} /> Kamera
        </button>
      </div>

      {/* Keyboard / USB scanner mode */}
      {mode === 'keyboard' && (
        <div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Barcode skanerlang yoki yozing..."
            className="input text-sm"
            onKeyDown={handleKeyInput}
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">USB barcode skaner avtomatik ishlaydi</p>
        </div>
      )}

      {/* Camera mode */}
      {mode === 'camera' && (
        <div>
          <div
            id="barcode-reader"
            ref={containerRef}
            className="rounded-lg overflow-hidden bg-black"
            style={{ minHeight: scanning ? 200 : 0 }}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <div className="flex gap-2 mt-2">
            {!scanning ? (
              <button onClick={startCamera} className="btn btn-primary btn-sm flex items-center gap-1.5">
                <Camera size={14} /> Kamerani yoqish
              </button>
            ) : (
              <button onClick={stopCamera} className="btn btn-danger btn-sm flex items-center gap-1.5">
                <CameraOff size={14} /> To'xtatish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
