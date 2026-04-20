import { useState, useEffect } from 'react'
import { History, Eye, RefreshCw, RotateCcw } from 'lucide-react'
import { getSales, getSale, refundSale } from '../api/client'
import type { Sale } from '../types'

function fmt(n: number) { return n.toLocaleString('uz-UZ') + " so'm" }

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const res = await getSales({ from: fromDate || undefined, to: toDate || undefined, page: p, limit: 20 })
      setSales(res.sales)
      setTotal(res.total)
      setPage(p)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [fromDate, toDate])

  const viewSale = async (s: Sale) => {
    const detail = await getSale(s.id)
    setSelectedSale(detail)
  }

  const handleRefund = async (s: Sale) => {
    if (!confirm(`${s.receipt_number} chekini qaytarishni tasdiqlaysizmi?\n\nTovarlar zaxiraga qaytariladi.`)) return
    try {
      await refundSale(s.id)
      alert('✅ Qaytarish muvaffaqiyatli bajarildi')
      setSelectedSale(null)
      load(page)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      alert("❌ Xatolik: " + (e.response?.data?.error || 'qaytarishda muammo'))
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History size={24} className="text-blue-600" /> Sotuvlar tarixi
        </h1>
        <button onClick={() => load(1)} className="btn btn-secondary btn-sm flex items-center gap-1.5">
          <RefreshCw size={14} /> Yangilash
        </button>
      </div>

      {/* Date filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm text-gray-600 whitespace-nowrap">Dan:</label>
          <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm text-gray-600 whitespace-nowrap">Gacha:</label>
          <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <button onClick={() => { setFromDate(today); setToDate(today) }} className="btn btn-secondary btn-sm">Bugun</button>
        <button onClick={() => { setFromDate(''); setToDate('') }} className="btn btn-secondary btn-sm">Hammasi</button>
      </div>

      <p className="text-sm text-gray-500">Jami: {total} ta sotuv</p>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Yuklanmoqda...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <History size={40} className="mx-auto mb-2 opacity-40" />
            <p>Sotuv topilmadi</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Chek</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Sana</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Mahsulot</th>
                <th className="px-4 py-3 text-right">Jami</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">To'lov</th>
                <th className="px-4 py-3 text-right">Ko'rish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-medium flex items-center gap-1.5">
                      {s.receipt_number}
                      {s.is_refunded ? <span className="badge badge-red text-xs">↩ Qaytarilgan</span> : null}
                    </p>
                    <p className="text-xs text-gray-400 sm:hidden">{new Date(s.created_at).toLocaleString('uz-UZ')}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                    {new Date(s.created_at).toLocaleString('uz-UZ')}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500 hidden md:table-cell">
                    {s.item_count} ta
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 text-sm">
                    {fmt(s.total)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`badge ${s.payment_method === 'cash' ? 'badge-green' : 'badge-blue'}`}>
                      {s.payment_method === 'cash' ? 'Naqd' : 'Karta'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => viewSale(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => load(page - 1)} disabled={page === 1} className="btn btn-secondary btn-sm">◀</button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page === totalPages} className="btn btn-secondary btn-sm">▶</button>
        </div>
      )}

      {/* Sale detail modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="font-bold font-mono">{selectedSale.receipt_number}</p>
                <p className="text-xs text-gray-500">{new Date(selectedSale.created_at).toLocaleString('uz-UZ')}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6">
              <table className="w-full text-sm mb-4">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="text-left pb-2">Mahsulot</th>
                    <th className="text-right pb-2">Soni</th>
                    <th className="text-right pb-2">Narxi</th>
                    <th className="text-right pb-2">Jami</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedSale.items?.map(item => (
                    <tr key={item.id}>
                      <td className="py-2 font-medium">{item.product_name}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{item.unit_price.toLocaleString('uz-UZ')}</td>
                      <td className="py-2 text-right font-medium">{item.subtotal.toLocaleString('uz-UZ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-3 space-y-1.5 text-sm">
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Chegirma:</span><span>-{fmt(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>JAMI:</span><span className="text-blue-700">{fmt(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>To'lov:</span>
                  <span className={`badge ${selectedSale.payment_method === 'cash' ? 'badge-green' : 'badge-blue'}`}>
                    {selectedSale.payment_method === 'cash' ? 'Naqd' : 'Karta'}
                  </span>
                </div>
                {selectedSale.payment_method === 'cash' && (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Berildi:</span><span>{fmt(selectedSale.amount_tendered)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Qaytim:</span><span>{fmt(selectedSale.change_given)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t flex gap-3">
              {selectedSale.is_refunded ? (
                <div className="btn btn-secondary flex items-center gap-2 btn-sm opacity-70 cursor-not-allowed">
                  ↩ Allaqachon qaytarilgan
                </div>
              ) : (
                <button onClick={() => handleRefund(selectedSale)} className="btn btn-danger flex items-center gap-2 btn-sm">
                  <RotateCcw size={14} /> Qaytarish
                </button>
              )}
              <button onClick={() => setSelectedSale(null)} className="btn btn-primary flex-1">Yopish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
