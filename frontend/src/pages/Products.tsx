import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, X, Save, ScanLine, CameraOff } from 'lucide-react'
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from '../api/client'
import type { Product, Category } from '../types'

function fmt(n: number) { return n.toLocaleString('uz-UZ') + " so'm" }

const UNITS = ['dona', 'kg', 'litr', 'gramm', 'metr', 'quti', 'juft']

const emptyForm = {
  barcode: '', name: '', category_id: '', price: '', cost: '', stock: '', low_stock_threshold: '10', unit: 'dona',
  image_data: '', is_quick_add: false,
}

// Barcode normalizatsiya: AIM prefix va GS1 GTIN ni tozalash
// USB scanner ham, kamera ham bir xil natija berishi uchun
function normalizeBarcode(raw: string): string {
  let code = raw.trim()
  if (!code) return code
  // AIM identifier prefix ni o'chirish (masalan: ]d2, ]C1, ]e0, ]Q3 ...)
  code = code.replace(/^\][A-Za-z]\d/, '')
  // GS1 DataMatrix / GS1-128 dan GTIN (01 + 14 raqam) ni ajratib olish
  const gs1 = code.match(/01(\d{14})/)
  if (gs1) code = gs1[1].replace(/^0+/, '')
  return code
}

// Compress image to max 400x400 JPEG base64
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxSize = 400
        let { width, height } = img
        if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize }
        else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const scannerRef = useRef<unknown>(null)
  const scannerContainerId = 'product-barcode-scanner'

  const stopBarcodeScanner = async () => {
    if (scannerRef.current) {
      try { await (scannerRef.current as { stop: () => Promise<void> }).stop() } catch {}
      scannerRef.current = null
    }
    setScannerActive(false)
  }

  const openBarcodeScanner = async () => {
    setScannerOpen(true)
    setScannerError('')
    // Kamera bir oz keyin ishga tushadi (DOM element kerak)
    setTimeout(async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 140 } },
          (decoded) => {
            // AIM prefix va GS1 GTIN ni tozalash
            let code = decoded
            code = code.replace(/^\][A-Za-z]\d/, '')
            const gs1 = code.match(/01(\d{14})/)
            if (gs1) code = gs1[1].replace(/^0+/, '')
            setForm(f => ({ ...f, barcode: code }))
            // Vibro + kamerani yopish
            if (navigator.vibrate) navigator.vibrate(80)
            stopBarcodeScanner()
            setScannerOpen(false)
          },
          () => {}
        )
        setScannerActive(true)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('NotAllowed')) setScannerError("Kamera ruxsati berilmadi")
        else setScannerError("Kamera ishga tushmadi")
        setScannerActive(false)
      }
    }, 300)
  }

  const closeBarcodeScanner = async () => {
    await stopBarcodeScanner()
    setScannerOpen(false)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ products }, cats] = await Promise.all([
        getProducts({ search, category: selectedCat, limit: 100 }),
        getCategories()
      ])
      setProducts(products)
      setCategories(cats)
    } finally { setLoading(false) }
  }, [search, selectedCat])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      barcode: p.barcode || '',
      name: p.name,
      category_id: p.category_id ? String(p.category_id) : '',
      price: String(p.price),
      cost: String(p.cost || ''),
      stock: String(p.stock),
      low_stock_threshold: String(p.low_stock_threshold),
      unit: p.unit,
      image_data: p.image_data || '',
      is_quick_add: !!p.is_quick_add,
    })
    setError('')
    setShowModal(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await compressImage(file)
      setForm(f => ({ ...f, image_data: data }))
    } catch { alert('Rasm yuklanmadi') }
  }

  const handleSave = async () => {
    if (!form.name || !form.price) { setError("Nomi va narxi majburiy"); return }
    setSaving(true)
    setError('')
    try {
      const data = {
        barcode: form.barcode || undefined,
        name: form.name,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        price: Number(form.price),
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 10,
        unit: form.unit,
        image_data: form.image_data || null,
        is_quick_add: form.is_quick_add ? 1 : 0,
      }
      if (editing) await updateProduct(editing.id, data)
      else await createProduct(data)
      setShowModal(false)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Xatolik yuz berdi')
    }
    setSaving(false)
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`"${p.name}" mahsulotini o'chirishni tasdiqlaysizmi?`)) return
    await deleteProduct(p.id)
    load()
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package size={24} className="text-blue-600" /> Mahsulotlar
        </h1>
        <button onClick={openNew} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Yangi mahsulot
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Qidirish (nom, barcode)..."
            className="input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
        >
          <option value="">Barcha kategoriyalar</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Yuklanmoqda...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-2 opacity-40" />
            <p>Mahsulot topilmadi</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Mahsulot</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Barcode</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Kategoriya</th>
                <th className="px-4 py-3 text-right">Narxi</th>
                <th className="px-4 py-3 text-right">Zaxira</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.image_data ? (
                        <img src={p.image_data} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">📦</div>
                      )}
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          {p.name}
                          {p.is_quick_add ? <span className="badge badge-yellow text-xs">⚡ Tez</span> : null}
                        </p>
                        <p className="text-xs text-gray-400 sm:hidden">{p.barcode || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell font-mono">
                    {p.barcode || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {p.category_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-blue-700">
                    {fmt(p.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${
                      p.stock === 0 ? 'text-red-600' :
                      p.stock <= p.low_stock_threshold ? 'text-yellow-600' : 'text-green-700'
                    }`}>
                      {p.stock} {p.unit}
                    </span>
                    {p.stock <= p.low_stock_threshold && p.stock > 0 && (
                      <AlertTriangle size={12} className="inline ml-1 text-yellow-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Barcode kamera modal — faqat mobil */}
      {scannerOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black md:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80">
            <div>
              <p className="text-white font-semibold text-sm">Barcode skanerlash</p>
              <p className="text-gray-400 text-xs">Mahsulot barcodini kameraga tutib turing</p>
            </div>
            <button
              onClick={closeBarcodeScanner}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Kamera */}
          <div className="flex-1 relative flex items-center justify-center bg-black">
            <div id={scannerContainerId} className="w-full" />

            {/* Nishon chizig'i */}
            {scannerActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-72 h-36">
                  {/* Burchak chiziqlari */}
                  <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                  <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                  <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                  <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                  {/* Skanerlash chizig'i */}
                  <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-blue-400/80 animate-pulse" />
                </div>
              </div>
            )}

            {/* Yuklanmoqda */}
            {!scannerActive && !scannerError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-sm">Kamera yoqilmoqda...</p>
              </div>
            )}

            {/* Xato */}
            {scannerError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                <CameraOff size={48} className="text-red-400" />
                <p className="text-white text-center text-sm">{scannerError}</p>
                <button onClick={closeBarcodeScanner} className="btn btn-secondary">Yopish</button>
              </div>
            )}
          </div>

          {/* Qo'lda kiritish tugmasi */}
          <div className="px-4 py-4 bg-black/80">
            <button
              onClick={closeBarcodeScanner}
              className="w-full py-3 text-gray-300 text-sm border border-gray-700 rounded-xl"
            >
              Qo'lda kiritish
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">{editing ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">{error}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Mahsulot nomi *</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Masalan: Lipton choy 100g" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Barcode</label>
                  <div className="flex gap-2">
                    <input
                      className="input font-mono flex-1"
                      value={form.barcode}
                      onChange={e => {
                        const raw = e.target.value
                        // USB scanner barcodeni bir zumda to'liq yozib Enter bosadi —
                        // AIM prefix bor bo'lsa darhol normallashtirish
                        const normalized = raw.startsWith(']') ? normalizeBarcode(raw) : raw
                        setForm(f => ({ ...f, barcode: normalized }))
                      }}
                      onBlur={e => setForm(f => ({ ...f, barcode: normalizeBarcode(e.target.value) }))}
                      placeholder="4607034400020"
                    />
                    {/* Faqat mobil — kamera orqali barcode skanerlash */}
                    <button
                      type="button"
                      onClick={openBarcodeScanner}
                      className="md:hidden flex items-center justify-center w-11 h-11 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shrink-0 transition-colors"
                      title="Kamera orqali skanerlash"
                    >
                      <ScanLine size={20} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kategoriya</label>
                  <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">Tanlang...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Narxi (so'm) *</label>
                  <input type="number" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="15000" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tannarx (so'm)</label>
                  <input type="number" className="input" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="12000" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Zaxira miqdori</label>
                  <input type="number" className="input" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="100" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">O'lchov birligi</label>
                  <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kam zaxira chegarasi</label>
                  <input type="number" className="input" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} min="0" />
                </div>

                <div className="sm:col-span-2 border-t pt-3">
                  <label className="block text-sm font-medium mb-2">Mahsulot rasmi</label>
                  <div className="flex items-center gap-3">
                    {form.image_data ? (
                      <img src={form.image_data} className="w-20 h-20 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-400">📷</div>
                    )}
                    <div className="flex-1 space-y-2">
                      <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload}
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100" />
                      {form.image_data && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, image_data: '' }))}
                          className="text-xs text-red-600 hover:underline">Rasmni o'chirish</button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Telefon kamerasi orqali rasmga olish mumkin</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_quick_add}
                      onChange={e => setForm(f => ({ ...f, is_quick_add: e.target.checked }))}
                      className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium">⚡ Tez qo'shish ro'yxatiga qo'shish</span>
                  </label>
                  <p className="text-xs text-gray-400 ml-6 mt-0.5">Kassa ekranida tezkor tugma sifatida chiqadi (sabzavot, meva va barcodesiz mahsulotlar uchun)</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Bekor</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={16} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
