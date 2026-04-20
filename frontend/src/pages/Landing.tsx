import { useState } from 'react'
import { LogIn, User, Lock, Phone, MapPin, ShieldCheck, ArrowLeft, X, Send } from 'lucide-react'
import { storeLogin, storeRegister } from '../api/client'

interface UserInfo {
  id: number
  name: string
  role: string
  photo_data: string | null
  allowed_pages: string[]
  store_id: number
  store_name: string
}

interface Props {
  onLogin: (token: string, user: UserInfo) => void
}

export default function Landing({ onLogin }: Props) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [showAriza, setShowAriza] = useState(false)
  const [reg, setReg] = useState({ owner_name: '', phone: '', address: '', store_name: '' })
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  const handleLogin = async () => {
    if (!login || !password) { setLoginError('Login va parol kiriting'); return }
    setLoginLoading(true); setLoginError('')
    try {
      const res = await storeLogin(login, password)
      localStorage.setItem('store_token', res.token)
      localStorage.setItem('user_info', JSON.stringify(res.user))
      onLogin(res.token, res.user)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setLoginError(e.response?.data?.error || "Login yoki parol noto'g'ri")
    }
    setLoginLoading(false)
  }

  const handleRegister = async () => {
    if (!reg.owner_name || !reg.phone || !reg.address || !reg.store_name) {
      setRegError("Barcha maydonlarni to'ldiring"); return
    }
    setRegLoading(true); setRegError('')
    try {
      await storeRegister(reg)
      setRegSuccess(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setRegError(e.response?.data?.error || 'Xatolik yuz berdi')
    }
    setRegLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Main — centered login */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center text-white">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg overflow-hidden">
              <img src="/logo.png" alt="POS ERP" className="w-20 h-20 object-contain" />
            </div>
            <p className="text-blue-200 text-sm mt-1">Do'konlar uchun zamonaviy kassa tizimi</p>
          </div>

          {/* Login form */}
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Tizimga kirish</p>
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{loginError}</div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <User size={13} /> Login
              </label>
              <input
                className="input"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="login"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Lock size={13} /> Parol
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="********"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="btn btn-primary w-full btn-lg flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              {loginLoading ? 'Kirilmoqda...' : 'Kirish'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-4 px-6">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Phone size={14} />
            <span>Qo'llab-quvvatlash:</span>
            <a href="tel:+998934292599" className="text-blue-600 font-medium hover:underline">
              +998 93 429 25 99
            </a>
          </div>
          <button
            onClick={() => { setShowAriza(true); setRegSuccess(false); setRegError(''); setReg({ owner_name: '', phone: '', address: '', store_name: '' }) }}
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center gap-1"
          >
            <Send size={14} />
            ERP uchun ariza
          </button>
        </div>
      </footer>

      {/* Ariza Modal */}
      {showAriza && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
            {regSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Ariza qabul qilindi!</h2>
                <p className="text-gray-600 mb-4">
                  Arizangiz ko'rib chiqilmoqda. Tasdiqlangandan so'ng <strong>{reg.phone}</strong> telefon
                  raqamingizga login va parol yuboriladi.
                </p>
                <p className="text-sm text-gray-400 mb-6">Odatda 24 soat ichida ko'rib chiqiladi</p>
                <button onClick={() => setShowAriza(false)} className="btn btn-primary w-full flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> Yopish
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h2 className="font-bold text-lg">ERP tizimiga ariza</h2>
                  <button onClick={() => setShowAriza(false)}><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                  {regError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{regError}</div>}
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1"><User size={13} /> F.I.O *</label>
                    <input className="input" value={reg.owner_name} onChange={e => setReg(r => ({ ...r, owner_name: e.target.value }))} placeholder="Alisher Karimov" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Phone size={13} /> Telefon raqami *</label>
                    <input type="tel" className="input" value={reg.phone} onChange={e => setReg(r => ({ ...r, phone: e.target.value }))} placeholder="+998 90 123 45 67" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1"><MapPin size={13} /> Manzil *</label>
                    <input className="input" value={reg.address} onChange={e => setReg(r => ({ ...r, address: e.target.value }))} placeholder="Toshkent, Chilonzor tumani" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1"><ShieldCheck size={13} /> Do'kon nomi *</label>
                    <input className="input" value={reg.store_name} onChange={e => setReg(r => ({ ...r, store_name: e.target.value }))} placeholder="Baraka Market" />
                  </div>
                  <button onClick={handleRegister} disabled={regLoading} className="btn btn-primary w-full btn-lg">
                    {regLoading ? 'Yuborilmoqda...' : 'Ariza yuborish'}
                  </button>
                  <p className="text-xs text-center text-gray-400">Ariza ko'rib chiqilgach, telefon raqamingizga login va parol yuboriladi</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
