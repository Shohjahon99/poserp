import { useState, useRef } from 'react'
import { Lock, User, Camera, Eye, EyeOff } from 'lucide-react'
import { verifyPin } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { getStoreConfig } from '../types'

export default function CashierLogin({ reason = '' }: { reason?: string }) {
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const store = getStoreConfig()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleLogin = async () => {
    if (pin.length < 4) { setError('PIN kamida 4 ta raqam'); return }
    setLoading(true)
    setError('')
    try {
      const cashier = await verifyPin(pin)
      login(cashier)
    } catch {
      setError("PIN noto'g'ri yoki kassir faol emas")
      setPin('')
      inputRef.current?.focus()
    }
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  const addDigit = (d: string) => {
    if (pin.length < 6) setPin(p => p + d)
  }

  const removeDigit = () => setPin(p => p.slice(0, -1))

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-8 text-center text-white">
          {store.logo_data ? (
            <img src={store.logo_data} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-3 rounded-xl bg-white p-1" />
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Lock size={32} />
            </div>
          )}
          <h1 className="text-xl font-bold">{store.name || "Do'kon Kassasi"}</h1>
          {reason && (
            <p className="text-blue-200 text-sm mt-1 bg-blue-700/50 rounded-lg px-3 py-1.5 mt-2">
              🔒 {reason}
            </p>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <User size={18} className="inline mr-1.5 text-gray-400" />
            <span className="text-sm text-gray-500">Kassir PIN bilan kiring</span>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* PIN display */}
          <div className="flex justify-center gap-3">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                  i < pin.length ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}
              >
                {i < pin.length && !showPin && <div className="w-3 h-3 rounded-full bg-white" />}
                {i < pin.length && showPin && <span className="text-white font-bold text-sm">{pin[i]}</span>}
              </div>
            ))}
          </div>

          {/* Hidden input for keyboard input */}
          <input
            ref={inputRef}
            type={showPin ? 'text' : 'password'}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={handleKey}
            className="opacity-0 absolute w-0 h-0"
            autoFocus
          />

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                onClick={() => addDigit(d)}
                className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-lg transition-colors active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setShowPin(s => !s)}
              className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              {showPin ? <EyeOff size={18} className="text-gray-500" /> : <Eye size={18} className="text-gray-500" />}
            </button>
            <button
              onClick={() => addDigit('0')}
              className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-lg transition-colors active:scale-95"
            >
              0
            </button>
            <button
              onClick={removeDigit}
              className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-600 font-bold"
            >
              ⌫
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={pin.length < 4 || loading}
            className="btn btn-primary w-full btn-lg"
          >
            {loading ? 'Tekshirilmoqda...' : '🔓 Kirish'}
          </button>
        </div>
      </div>
    </div>
  )
}
