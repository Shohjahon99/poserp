import { useState } from 'react'
import { X, Save, Barcode } from 'lucide-react'
import { createProduct } from '../api/client'
import type { Product } from '../types'

interface Props {
  barcode: string
  onCreated: (p: Product) => void
  onClose: () => void
}

const UNITS = ['dona', 'kg', 'litr', 'gramm', 'metr', 'quti', 'juft']

export default function QuickCreateProduct({ barcode, onCreated, onClose }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [unit, setUnit] = useState('dona')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Mahsulot nomi kerak'); return }
    if (!price || Number(price) <= 0) { setError('Narxini kiriting'); return }
    setSaving(true)
    setError('')
    try {
      const p = await createProduct({
        barcode,
        name: name.trim(),
        price: Number(price),
        stock: Number(stock) || 0,
        unit,
      })
      onCreated(p)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Xatolik')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Barcode size={18} className="text-blue-600" /> Yangi mahsulot (tezkor)
          </h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg text-sm">
            📷 Barcode <span className="font-mono font-bold">{barcode}</span> bazada yo'q — tezkor qo'shamiz
          </div>

          {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Mahsulot nomi *</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Masalan: Coca-Cola 1L"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Narxi (so'm) *</label>
              <input
                type="number"
                className="input"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="15000"
                min="0"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zaxira</label>
              <input
                type="number"
                className="input"
                value={stock}
                onChange={e => setStock(e.target.value)}
                placeholder="10"
                min="0"
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">O'lchov birligi</label>
            <select className="input" value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          <p className="text-xs text-gray-400">
            Keyin "Mahsulotlar" bo'limida batafsil ma'lumot (kategoriya, rasm, tannarx) qo'shishingiz mumkin.
          </p>
        </div>

        <div className="px-5 py-3 border-t flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">Bekor</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
            <Save size={16} /> {saving ? 'Saqlanmoqda...' : 'Saqlash va savatga'}
          </button>
        </div>
      </div>
    </div>
  )
}
