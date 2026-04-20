import { useState, useEffect } from 'react'
import { Warehouse, AlertTriangle, Plus, Minus, RefreshCw } from 'lucide-react'
import { getLowStockProducts, getProducts, adjustInventory, getInventoryLog } from '../api/client'
import type { Product } from '../types'

function fmt(n: number) { return n.toLocaleString('uz-UZ') + " so'm" }

interface LogItem {
  id: number
  product_id: number
  product_name: string
  change: number
  reason: string
  note: string
  created_at: string
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [log, setLog] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'all' | 'low' | 'log'>('all')
  const [adjusting, setAdjusting] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustNote, setAdjustNote] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [{ products: all }, low, logs] = await Promise.all([
        getProducts({ limit: 200 }),
        getLowStockProducts(),
        getInventoryLog()
      ])
      setProducts(all)
      setLowStock(low)
      setLog(logs)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAdjust = async () => {
    if (!adjusting || adjustQty === 0) return
    try {
      await adjustInventory(adjusting.id, adjustQty, adjustNote)
      setAdjusting(null)
      setAdjustQty(0)
      setAdjustNote('')
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      alert(e.response?.data?.error || 'Xatolik')
    }
  }

  const tabs = [
    { key: 'all', label: `Barcha (${products.length})` },
    { key: 'low', label: `Kam zaxira (${lowStock.length})` },
    { key: 'log', label: 'Jurnal' },
  ]

  const reasonLabel: Record<string, string> = {
    sale: '🛒 Sotuv',
    manual_adjust: '✏️ Qo\'lda',
    initial: '🏁 Boshlang\'ich',
    return: '↩️ Qaytarish',
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Warehouse size={24} className="text-blue-600" /> Zaxira boshqaruvi
        </h1>
        <button onClick={load} className="btn btn-secondary btn-sm flex items-center gap-1.5">
          <RefreshCw size={14} /> Yangilash
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">{lowStock.length} ta mahsulot kamayib ketdi</p>
            <p className="text-sm text-yellow-700 mt-0.5">{lowStock.slice(0, 3).map(p => p.name).join(', ')}{lowStock.length > 3 ? ' va boshqalar' : ''}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'all' | 'low' | 'log')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Yuklanmoqda...</div>
      ) : tab === 'log' ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Mahsulot</th>
                <th className="px-4 py-3 text-left">Sabab</th>
                <th className="px-4 py-3 text-right">O'zgarish</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Izoh</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {log.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{l.product_name}</td>
                  <td className="px-4 py-3 text-sm">{reasonLabel[l.reason] || l.reason}</td>
                  <td className={`px-4 py-3 text-right font-bold text-sm ${l.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {l.change > 0 ? '+' : ''}{l.change}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{l.note || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{new Date(l.created_at).toLocaleString('uz-UZ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Mahsulot</th>
                <th className="px-4 py-3 text-right">Zaxira</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Narxi</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Tannarx</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(tab === 'low' ? lowStock : products).map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{p.name}</p>
                    {p.stock <= p.low_stock_threshold && (
                      <span className="badge badge-yellow text-xs mt-0.5">Kam zaxira</span>
                    )}
                    {p.stock === 0 && (
                      <span className="badge badge-red text-xs mt-0.5">Tugagan</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-sm ${
                      p.stock === 0 ? 'text-red-600' :
                      p.stock <= p.low_stock_threshold ? 'text-yellow-600' : 'text-green-700'
                    }`}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-blue-700 hidden sm:table-cell">{fmt(p.price)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500 hidden md:table-cell">{p.cost ? fmt(p.cost) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setAdjusting(p); setAdjustQty(10) }}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Kirim"
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        onClick={() => { setAdjusting(p); setAdjustQty(-1) }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Chiqim"
                      >
                        <Minus size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust modal */}
      {adjusting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4">Zaxirani sozlash</h3>
            <p className="text-sm text-gray-600 mb-4">{adjusting.name} · Joriy: {adjusting.stock} {adjusting.unit}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">O'zgarish miqdori</label>
                <div className="flex gap-2">
                  <button onClick={() => setAdjustQty(q => q - 1)} className="btn btn-danger btn-sm"><Minus size={14} /></button>
                  <input type="number" className="input text-center font-bold" value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))} />
                  <button onClick={() => setAdjustQty(q => q + 1)} className="btn btn-success btn-sm"><Plus size={14} /></button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Musbat = kirim, manfiy = chiqim</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Izoh (ixtiyoriy)</label>
                <input className="input" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Sabab..." />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setAdjusting(null)} className="btn btn-secondary flex-1">Bekor</button>
              <button onClick={handleAdjust} className="btn btn-primary flex-1">Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
