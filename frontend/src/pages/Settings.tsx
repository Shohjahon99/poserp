import { useState, useEffect } from 'react'
import { Settings, Save, Store, Phone, MapPin, Image as ImageIcon, Trash } from 'lucide-react'
import { getStoreSettings, saveStoreSettings } from '../api/client'
import { setStoreConfig } from '../types'

async function compressLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxSize = 200
        let { width, height } = img
        if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize }
        else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function SettingsPage() {
  const [config, setConfig] = useState({ name: '', address: '', phone: '', logo_data: '' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Serverdan yuklash
  useEffect(() => {
    getStoreSettings()
      .then(data => {
        setConfig({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          logo_data: data.logo_data || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await compressLogo(file)
      setConfig(c => ({ ...c, logo_data: data }))
    } catch { alert('Logo yuklanmadi') }
  }

  const handleSave = async () => {
    try {
      await saveStoreSettings(config)
      // Lokal keshni ham yangilash (chek va sidebar uchun)
      setStoreConfig({
        name: config.name,
        address: config.address,
        phone: config.phone,
        logo_data: config.logo_data || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      alert('Saqlashda xatolik')
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings size={24} className="text-blue-600" /> Sozlamalar
      </h1>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Store size={18} /> Do'kon ma'lumotlari
        </h2>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
            <ImageIcon size={14} /> Do'kon logosi
          </label>
          <div className="flex items-center gap-4">
            {config.logo_data ? (
              <img src={config.logo_data} className="w-24 h-24 object-contain rounded-xl border-2 border-gray-200 bg-white p-2" />
            ) : (
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-3xl text-gray-400">🏪</div>
            )}
            <div className="flex-1 space-y-2">
              <input type="file" accept="image/*" onChange={handleLogoUpload}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100" />
              {config.logo_data && (
                <button onClick={() => setConfig(c => ({ ...c, logo_data: '' }))}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1">
                  <Trash size={12} /> Logoni o'chirish
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Logo chekda va sidebar'da ko'rinadi. Faqat shu do'konga tegishli.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Do'kon nomi</label>
          <input className="input" value={config.name}
            onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
            placeholder="Masalan: Baraka Do'koni" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
            <MapPin size={14} /> Manzil
          </label>
          <input className="input" value={config.address}
            onChange={e => setConfig(c => ({ ...c, address: e.target.value }))}
            placeholder="Shahar, ko'cha..." />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
            <Phone size={14} /> Telefon
          </label>
          <input className="input" value={config.phone}
            onChange={e => setConfig(c => ({ ...c, phone: e.target.value }))}
            placeholder="+998 90 000 00 00" />
        </div>

        <button onClick={handleSave} className="btn btn-primary flex items-center gap-2 w-full">
          <Save size={16} />
          {saved ? 'Saqlandi!' : 'Saqlash'}
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-lg mb-3">Tizim haqida</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between"><span>Versiya:</span><span className="font-medium">2.2.0</span></div>
          <div className="flex justify-between"><span>Database:</span><span className="font-medium">SQLite (har do'konga alohida)</span></div>
          <div className="flex justify-between"><span>Backend:</span><span className="font-medium">Node.js + node:sqlite</span></div>
          <div className="flex justify-between"><span>Frontend:</span><span className="font-medium">React + Vite + Tailwind</span></div>
        </div>
      </div>
    </div>
  )
}
