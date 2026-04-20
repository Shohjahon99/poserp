import { useState, useEffect } from 'react'
import { X, Scale, ShoppingCart } from 'lucide-react'
import type { Product } from '../types'
import { isWeightUnit } from '../types'

interface Props {
  product: Product
  onAdd: (product: Product, quantity: number) => void
  onClose: () => void
}

function fmt(n: number) { return n.toLocaleString('uz-UZ') + " so'm" }

export default function WeightModal({ product, onAdd, onClose }: Props) {
  const weightBased = isWeightUnit(product.unit)
  const [quantity, setQuantity] = useState(weightBased ? '' : '1')
  const [totalPrice, setTotalPrice] = useState('')
  const [activeInput, setActiveInput] = useState<'qty' | 'price'>('qty')

  const qty  = parseFloat(quantity)  || 0
  const price = parseFloat(totalPrice) || 0

  // Sync: quantity ↔ total price
  useEffect(() => {
    if (!weightBased || !product.price) return
    if (activeInput === 'qty' && qty > 0) {
      setTotalPrice((qty * product.price).toFixed(0))
    }
  }, [quantity, activeInput])

  useEffect(() => {
    if (!weightBased || !product.price) return
    if (activeInput === 'price' && price > 0) {
      setQuantity((price / product.price).toFixed(3).replace(/\.?0+$/, ''))
    }
  }, [totalPrice, activeInput])

  const finalQty   = qty
  const finalTotal = weightBased ? finalQty * product.price : finalQty * product.price
  const isValid    = finalQty > 0

  const handleAdd = () => {
    if (!isValid) return
    onAdd(product, finalQty)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {product.image_data ? (
                <img src={product.image_data} alt="" className="w-12 h-12 object-cover rounded-xl bg-white/20" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                  {weightBased ? '⚖️' : '📦'}
                </div>
              )}
              <div>
                <p className="font-bold text-base leading-tight">{product.name}</p>
                <p className="text-blue-200 text-sm">{fmt(product.price)} / {product.unit}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {weightBased ? (
            <>
              {/* Weight input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Scale size={15} /> Og'irlik / Hajm ({product.unit})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => { setActiveInput('qty'); setQuantity(e.target.value) }}
                    onFocus={() => setActiveInput('qty')}
                    className={`input text-xl font-bold text-center flex-1 ${activeInput === 'qty' ? 'ring-2 ring-blue-500' : ''}`}
                    placeholder={`0.000 ${product.unit}`}
                    step="0.001"
                    min="0"
                    autoFocus
                  />
                  <div className="flex flex-col gap-1">
                    {[0.5, 1, 1.5, 2, 5].map(v => (
                      <button key={v} onClick={() => { setActiveInput('qty'); setQuantity(String(v)) }}
                        className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium"
                      >{v}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Narx bo'yicha hisoblash (so'm)
                </label>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={e => { setActiveInput('price'); setTotalPrice(e.target.value) }}
                  onFocus={() => setActiveInput('price')}
                  className={`input text-xl font-bold text-center ${activeInput === 'price' ? 'ring-2 ring-blue-500' : ''}`}
                  placeholder="25 000"
                  min="0"
                />
                {activeInput === 'price' && price > 0 && product.price > 0 && (
                  <p className="text-xs text-blue-600 mt-1 text-center">
                    = {(price / product.price).toFixed(3)} {product.unit}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Count-based */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Miqdor ({product.unit})
              </label>
              <div className="flex gap-2 items-center">
                <button onClick={() => setQuantity(q => String(Math.max(1, parseInt(q || '1') - 1)))}
                  className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold transition-colors">−</button>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="input text-2xl font-bold text-center flex-1"
                  min="1"
                  max={product.stock}
                  autoFocus
                />
                <button onClick={() => setQuantity(q => String(Math.min(product.stock, parseInt(q || '0') + 1)))}
                  className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold transition-colors">+</button>
              </div>
            </div>
          )}

          {/* Summary */}
          {isValid && (
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-sm text-blue-600">
                {weightBased
                  ? `${finalQty.toFixed(3)} ${product.unit} × ${fmt(product.price)}`
                  : `${finalQty} × ${fmt(product.price)}`
                }
              </p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{fmt(finalTotal)}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">Bekor</button>
          <button onClick={handleAdd} disabled={!isValid} className="btn btn-success flex-1 flex items-center justify-center gap-2">
            <ShoppingCart size={16} /> Savatga qo'shish
          </button>
        </div>
      </div>
    </div>
  )
}
