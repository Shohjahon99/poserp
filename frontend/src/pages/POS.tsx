import { useState, useCallback, useEffect } from 'react'
import { Search, Trash2, Plus, Minus, ShoppingBag, Tag, AlertCircle, Zap } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { getProducts, createSale } from '../api/client'
import type { Product, Sale } from '../types'
import { isWeightUnit } from '../types'
import BarcodeScanner from '../components/BarcodeScanner'
import PaymentModal from '../components/PaymentModal'
import ReceiptModal from '../components/ReceiptModal'
import WeightModal from '../components/WeightModal'

function fmt(n: number) { return n.toLocaleString('uz-UZ') + " so'm" }

interface UserInfo {
  id: number
  name: string
  role: string
  photo_data: string | null
  allowed_pages: string[]
  store_id: number
  store_name: string
}

export default function POS({ user }: { user?: UserInfo }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [quickProducts, setQuickProducts] = useState<Product[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [weightProduct, setWeightProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { items, discount, setDiscount, addItem, addItemWithQty, removeItem, updateQty, clearCart, subtotal, total } = useCartStore()

  // Load quick-add products
  useEffect(() => {
    getProducts({ quick_add: true, limit: 50 })
      .then(r => setQuickProducts(r.products.filter(p => p.is_quick_add)))
      .catch(() => {})
  }, [])

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return }
    try {
      const { products } = await getProducts({ search: query, limit: 20 })
      setResults(products)
    } catch { setResults([]) }
  }, [])

  const handleProductClick = (p: Product) => {
    if (isWeightUnit(p.unit) || p.is_quick_add) {
      setWeightProduct(p)
    } else {
      addItem(p)
    }
    setSearch(''); setResults([])
  }

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    setError('')
    try {
      const { products } = await getProducts({ barcode })
      if (products.length > 0) {
        handleProductClick(products[0])
      } else {
        setError(`Barcode topilmadi: ${barcode} — "Mahsulotlar" bo'limidan qo'shing`)
      }
    } catch { setError('Xatolik') }
  }, [])

  const handleCheckout = async (method: 'cash' | 'card', tendered: number) => {
    setLoading(true); setShowPayment(false)
    try {
      const sale = await createSale({
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price })),
        discount,
        payment_method: method,
        amount_tendered: tendered,
        cashier_id: user?.id,
        cashier_name: user?.name,
      })
      setLastSale(sale)
      clearCart()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string }
      setError(e.response?.data?.error || e.message || 'Xatolik')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col md:flex-row md:h-full gap-0 md:gap-4 md:p-4">
      {/* LEFT: Scanner, search, quick-add grid */}
      <div className="flex-1 flex flex-col md:overflow-y-auto p-3 md:p-0 gap-3">
        <div className="card p-4 space-y-3">
          <BarcodeScanner onScan={handleBarcodeScanned} />

          {/* Search with dropdown overlay */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="text"
              placeholder="Mahsulot nomi yozing..."
              className="input pl-9 text-sm"
              value={search}
              onChange={e => { setSearch(e.target.value); searchProducts(e.target.value) }}
            />

            {/* Search results — dropdown overlay */}
            {results.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border max-h-64 overflow-auto z-30">
                {results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b last:border-0 text-left"
                  >
                    {p.image_data ? (
                      <img src={p.image_data} className="w-10 h-10 object-cover rounded" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-lg">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.stock} {p.unit}</p>
                    </div>
                    <p className="font-bold text-blue-700 text-sm whitespace-nowrap">{fmt(p.price)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        {/* Quick-add products grid */}
        {quickProducts.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Zap size={15} className="text-orange-500" /> Tez qo'shish
              <span className="text-xs text-gray-400 font-normal">(sabzavot, meva va barcodesiz mahsulotlar)</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {quickProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="group relative bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 rounded-xl overflow-hidden aspect-square border-2 border-transparent hover:border-blue-400 transition-all active:scale-95"
                >
                  {p.image_data ? (
                    <img src={p.image_data} className="w-full h-full object-cover" alt={p.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-green-50 to-yellow-50">
                      {isWeightUnit(p.unit) ? '🥬' : '📦'}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-white">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-xs opacity-80">{fmt(p.price)}/{p.unit}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Cart */}
      <div className="w-full md:w-80 flex flex-col card md:overflow-hidden md:shrink-0 mb-20 md:mb-0">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <ShoppingBag size={18} className="text-blue-600" />
          <h2 className="font-bold">Savat</h2>
          {items.length > 0 && (
            <button onClick={clearCart} className="ml-auto text-xs text-red-500 hover:text-red-700">
              Tozalash
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <ShoppingBag size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Savat bo'sh</p>
            </div>
          ) : (
            items.map(item => {
              const weightBased = isWeightUnit(item.product.unit)
              const subtotal = item.product.price * item.quantity
              return (
                <div key={item.product.id} className="flex items-start gap-2 px-3 py-2.5 border-b hover:bg-gray-50">
                  {item.product.image_data ? (
                    <img src={item.product.image_data} className="w-9 h-9 rounded object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center text-sm shrink-0">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {weightBased
                        ? `${item.quantity.toFixed(3)} ${item.product.unit} × ${item.product.price.toLocaleString('uz-UZ')}`
                        : `${item.quantity} × ${item.product.price.toLocaleString('uz-UZ')}`}
                    </p>
                    <p className="text-sm font-bold text-blue-700">{fmt(subtotal)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!weightBased && (
                      <>
                        <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                          <Plus size={12} />
                        </button>
                      </>
                    )}
                    {weightBased && (
                      <button onClick={() => setWeightProduct(item.product)} className="text-xs text-blue-600 hover:underline px-2">
                        Tahrirlash
                      </button>
                    )}
                    <button onClick={() => removeItem(item.product.id)} className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Jami:</span><span>{fmt(subtotal())}</span>
            </div>

            <div className="flex items-center gap-2">
              <Tag size={14} className="text-gray-400 shrink-0" />
              <input type="number" placeholder="Chegirma" className="input text-sm py-1.5"
                value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} min={0} max={subtotal()} />
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Chegirma:</span><span>-{fmt(discount)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>TO'LOV:</span>
              <span className="text-blue-700">{fmt(total())}</span>
            </div>

            <button onClick={() => setShowPayment(true)} disabled={loading || items.length === 0} className="btn btn-success w-full btn-lg">
              {loading ? 'Saqlanmoqda...' : "💳 To'lovga o'tish"}
            </button>
          </div>
        )}
      </div>

      {weightProduct && (
        <WeightModal
          product={weightProduct}
          onAdd={(p, qty) => addItemWithQty(p, qty)}
          onClose={() => setWeightProduct(null)}
        />
      )}

      {showPayment && (
        <PaymentModal total={total()} onConfirm={handleCheckout} onClose={() => setShowPayment(false)} />
      )}

      {lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}

    </div>
  )
}
