import { useState } from 'react'
import { X, Banknote, CreditCard, CheckCircle } from 'lucide-react'

interface Props {
  total: number
  onConfirm: (method: 'cash' | 'card', tendered: number) => void
  onClose: () => void
}

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000, 100000]

function fmt(n: number) {
  return n.toLocaleString('uz-UZ') + ' so\'m'
}

export default function PaymentModal({ total, onConfirm, onClose }: Props) {
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [tendered, setTendered] = useState(total)

  const change = Math.max(0, tendered - total)
  const canPay = method === 'card' || tendered >= total

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold">To'lov</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Total */}
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-sm text-blue-600 font-medium">Jami to'lash kerak</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{fmt(total)}</p>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">To'lov usuli</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod('cash')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  method === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote size={28} className={method === 'cash' ? 'text-blue-600' : 'text-gray-400'} />
                <span className={`font-medium text-sm ${method === 'cash' ? 'text-blue-700' : 'text-gray-600'}`}>Naqd pul</span>
              </button>
              <button
                onClick={() => setMethod('card')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  method === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard size={28} className={method === 'card' ? 'text-blue-600' : 'text-gray-400'} />
                <span className={`font-medium text-sm ${method === 'card' ? 'text-blue-700' : 'text-gray-600'}`}>Plastik karta</span>
              </button>
            </div>
          </div>

          {/* Cash tendered */}
          {method === 'cash' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Berilgan summa</p>
              <input
                type="number"
                value={tendered}
                onChange={e => setTendered(Number(e.target.value))}
                className="input text-xl font-bold text-center"
                min={0}
              />
              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_AMOUNTS.filter(a => a >= total).slice(0, 4).map(a => (
                  <button
                    key={a}
                    onClick={() => setTendered(a)}
                    className="btn btn-secondary btn-sm text-xs"
                  >
                    {(a / 1000)}K
                  </button>
                ))}
                <button onClick={() => setTendered(total)} className="btn btn-secondary btn-sm text-xs">
                  Aniq
                </button>
              </div>
              {tendered >= total && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Qaytim:</span> {fmt(change)}
                  </p>
                </div>
              )}
              {tendered < total && tendered > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Yetishmaydi: {fmt(total - tendered)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">Bekor</button>
          <button
            onClick={() => onConfirm(method, method === 'card' ? total : tendered)}
            disabled={!canPay}
            className="btn btn-success flex-1 flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            To'lovni tasdiqlash
          </button>
        </div>
      </div>
    </div>
  )
}
