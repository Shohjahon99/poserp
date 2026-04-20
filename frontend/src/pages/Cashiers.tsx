import { useState, useEffect } from 'react'
import { UserPlus, Users, Edit2, Trash2, X, Save, Shield, Eye, EyeOff, ToggleLeft, ToggleRight, Camera } from 'lucide-react'
import { getStaff, createStaffMember, updateStaffMember, deleteStaffMember, type StaffMember } from '../api/client'

interface UserInfo {
  id: number; name: string; role: string; photo_data: string | null
  allowed_pages: string[]; store_id: number; store_name: string
}

const ALL_PAGES = [
  { path: '/products',  label: 'Mahsulotlar', desc: "Mahsulot qo'shish, tahrirlash" },
  { path: '/inventory', label: 'Zaxira',      desc: "Ombor boshqaruvi" },
  { path: '/sales',     label: 'Sotuvlar',    desc: "Sotuvlar tarixi" },
  { path: '/reports',   label: 'Hisobotlar',  desc: "Kunlik/oylik hisobotlar" },
  { path: '/cashiers',  label: 'Xodimlar',    desc: "Xodimlarni boshqarish" },
  { path: '/settings',  label: 'Sozlamalar',  desc: "Tizim sozlamalari" },
]

export default function CashiersPage({ user }: { user?: UserInfo }) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState({
    name: '', login: '', password: '', role: 'cashier' as string,
    allowed_pages: [] as string[], photo_data: '' as string
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const load = async () => {
    try { setStaff(await getStaff()) } catch {}
  }
  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', login: '', password: '', role: 'cashier', allowed_pages: [], photo_data: '' })
    setError('')
    setShowPassword(false)
    setShowModal(true)
  }

  const openEdit = (s: StaffMember) => {
    setEditing(s)
    setForm({
      name: s.name, login: s.login, password: '',
      role: s.role, allowed_pages: s.allowed_pages || [],
      photo_data: s.photo_data || ''
    })
    setError('')
    setShowPassword(false)
    setShowModal(true)
  }

  const togglePage = (path: string) => {
    setForm(f => ({
      ...f,
      allowed_pages: f.allowed_pages.includes(path)
        ? f.allowed_pages.filter(p => p !== path)
        : [...f.allowed_pages, path]
    }))
  }

  const handleSave = async () => {
    if (!form.name || !form.login) { setError("Ism va login majburiy"); return }
    if (!editing && !form.password) { setError("Parol majburiy"); return }
    if (form.password && form.password.length < 4) { setError("Parol kamida 4 ta belgi"); return }
    setSaving(true); setError('')

    try {
      if (editing) {
        const data: Record<string, unknown> = {
          name: form.name, login: form.login, role: form.role,
          allowed_pages: form.allowed_pages,
          photo_data: form.photo_data || null,
        }
        if (form.password) data.password = form.password
        await updateStaffMember(editing.id, data)
      } else {
        await createStaffMember({
          name: form.name, login: form.login, password: form.password,
          role: form.role, allowed_pages: form.allowed_pages,
          photo_data: form.photo_data || null,
        })
      }
      setShowModal(false)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Xatolik')
    }
    setSaving(false)
  }

  const handleDelete = async (s: StaffMember) => {
    if (!confirm(`"${s.name}" ni o'chirishni tasdiqlaysizmi?`)) return
    try {
      await deleteStaffMember(s.id)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      alert(e.response?.data?.error || 'Xatolik')
    }
  }

  const toggleActive = async (s: StaffMember) => {
    try {
      await updateStaffMember(s.id, { is_active: s.is_active ? 0 : 1 })
      load()
    } catch {}
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={24} className="text-blue-600" /> Xodimlar boshqaruvi
        </h1>
        {user?.role === 'director' && (
          <button onClick={openNew} className="btn btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Yangi xodim
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
        <p><Shield size={14} className="inline mr-1" /> <strong>Direktor</strong> — barcha bo'limlarga kirish, xodimlarni boshqarish</p>
        <p className="mt-1">👤 <strong>Kassir</strong> — faqat ruxsat berilgan bo'limlar</p>
      </div>

      <div className="card overflow-hidden">
        {staff.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-2 opacity-40" />
            <p>Xodimlar yo'q. Birinchi xodimni qo'shing.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                {s.photo_data ? (
                  <img src={s.photo_data} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow shrink-0" />
                ) : (
                  <div className={`w-12 h-12 rounded-full ${s.role === 'director' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center font-bold shrink-0`}>
                    {s.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{s.name}</p>
                    {s.role === 'director' ? (
                      <span className="badge badge-yellow text-xs flex items-center gap-0.5"><Shield size={10} /> Direktor</span>
                    ) : (
                      <span className="badge badge-blue text-xs">Kassir</span>
                    )}
                    {!s.is_active && <span className="badge badge-red text-xs">Bloklangan</span>}
                  </div>
                  <p className="text-xs text-gray-500 font-mono">Login: {s.login}</p>
                  {s.role === 'cashier' && s.allowed_pages.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Ruxsatlar: Kassa{s.allowed_pages.map(p => {
                        const pg = ALL_PAGES.find(ap => ap.path === p)
                        return pg ? `, ${pg.label}` : ''
                      }).join('')}
                    </p>
                  )}
                </div>
                {user?.role === 'director' && (
                  <>
                    <button onClick={() => toggleActive(s)} className="text-xs text-gray-500 hover:text-gray-700 hidden sm:block">
                      {s.is_active ? 'Bloklash' : 'Faollash'}
                    </button>
                    <button onClick={() => openEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(s)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="font-bold text-lg">{editing ? 'Xodimni tahrirlash' : 'Yangi xodim'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

              {/* Rasm */}
              <div className="flex items-center gap-4">
                {form.photo_data ? (
                  <img src={form.photo_data} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Camera size={24} />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const img = new Image()
                      img.onload = () => {
                        const canvas = document.createElement('canvas')
                        const size = 200
                        canvas.width = size; canvas.height = size
                        const ctx = canvas.getContext('2d')!
                        const min = Math.min(img.width, img.height)
                        const sx = (img.width - min) / 2, sy = (img.height - min) / 2
                        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
                        setForm(f => ({ ...f, photo_data: canvas.toDataURL('image/jpeg', 0.7) }))
                      }
                      img.src = reader.result as string
                    }
                    reader.readAsDataURL(file)
                  }} className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium" />
                  {form.photo_data && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, photo_data: '' }))} className="text-xs text-red-500 hover:underline">Rasmni o'chirish</button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ism *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Aziza Karimova" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Login *</label>
                <input className="input font-mono" value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} placeholder="aziza" />
                <p className="text-xs text-gray-400 mt-1">Faqat kichik harflar, raqamlar, _ belgisi</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Parol {editing ? '(bo\'sh qoldirilsa o\'zgarmaydi)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editing ? 'Yangi parol...' : 'Parol'}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium mb-1">Lavozim</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, role: 'cashier' }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === 'cashier' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-medium text-sm">👤 Kassir</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cheklangan kirish</p>
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, role: 'director' }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === 'director' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-medium text-sm flex items-center gap-1"><Shield size={12} /> Direktor</p>
                    <p className="text-xs text-gray-500 mt-0.5">To'liq boshqaruv</p>
                  </button>
                </div>
              </div>

              {/* Page permissions — faqat kassir uchun */}
              {form.role === 'cashier' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Ruxsat berilgan sahifalar</label>
                  <p className="text-xs text-gray-400 mb-2">Kassa har doim ochiq. Qo'shimcha sahifalarni tanlang:</p>
                  <div className="space-y-2">
                    {ALL_PAGES.map(page => {
                      const active = form.allowed_pages.includes(page.path)
                      return (
                        <button key={page.path} type="button" onClick={() => togglePage(page.path)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${active ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          {active ? <ToggleRight size={20} className="text-green-600 shrink-0" /> : <ToggleLeft size={20} className="text-gray-400 shrink-0" />}
                          <div>
                            <p className="font-medium text-sm">{page.label}</p>
                            <p className="text-xs text-gray-500">{page.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex gap-3 sticky bottom-0 bg-white">
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
