import { useState, useEffect } from 'react'
import { Shield, LogIn, LogOut, Store, Clock, CheckCircle, XCircle, Users, BarChart3, Ban, Unlock, Eye, X, Copy, Phone, Plus, Edit2, Key } from 'lucide-react'
import { adminLogin, getAdminStats, getApplications, getAdminStores, getAdminStore, approveStore, rejectStore, blockStore, unblockStore } from '../api/client'
import axios from 'axios'

const adminApi = axios.create({ baseURL: '/api/admin' })
adminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

interface AdminUser { id: number; name: string; username: string }
interface StoreApp { id: number; owner_name: string; phone: string; address: string; store_name: string; status: string; created_at: string; approved_at?: string }
interface StaffUser { id: number; name: string; login: string; role: string; is_active: number; created_at: string }
interface Stats { total: number; pending: number; approved: number; rejected: number }
interface StoreDetail extends StoreApp { stats: { products: number; sales: number; revenue: number; users: number }; users: StaffUser[] }

export default function SuperAdmin() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [tab, setTab] = useState<'dashboard' | 'applications' | 'stores'>('dashboard')
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [applications, setApplications] = useState<StoreApp[]>([])
  const [stores, setStores] = useState<StoreApp[]>([])
  const [selectedStore, setSelectedStore] = useState<StoreDetail | null>(null)
  const [approvedInfo, setApprovedInfo] = useState<{ login: string; password: string; store_name: string } | null>(null)

  // Add store modal
  const [showAddStore, setShowAddStore] = useState(false)
  const [addForm, setAddForm] = useState({ owner_name: '', phone: '', address: '', store_name: '', director_name: '', director_login: '', director_password: '' })
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Edit user modal
  const [editUser, setEditUser] = useState<StaffUser | null>(null)
  const [editForm, setEditForm] = useState({ name: '', login: '', password: '', role: 'cashier' })
  const [editError, setEditError] = useState('')

  // Add user to store modal
  const [addUserStoreId, setAddUserStoreId] = useState<number | null>(null)
  const [addUserForm, setAddUserForm] = useState({ name: '', login: '', password: '', role: 'cashier' })
  const [addUserError, setAddUserError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const saved = localStorage.getItem('admin_info')
    if (token && saved) setAdmin(JSON.parse(saved))
  }, [])

  const handleLogin = async () => {
    if (!username || !password) { setLoginError('Login va parol kiriting'); return }
    setLoginLoading(true); setLoginError('')
    try {
      const res = await adminLogin(username, password)
      localStorage.setItem('admin_token', res.token)
      localStorage.setItem('admin_info', JSON.stringify(res.admin))
      setAdmin(res.admin)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setLoginError(e.response?.data?.error || 'Xatolik')
    }
    setLoginLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token'); localStorage.removeItem('admin_info')
    setAdmin(null)
  }

  const loadData = async () => {
    try {
      const [s, a, st] = await Promise.all([getAdminStats(), getApplications(), getAdminStores()])
      setStats(s); setApplications(a); setStores(st)
    } catch {}
  }

  useEffect(() => { if (admin) loadData() }, [admin])

  const handleApprove = async (id: number) => {
    if (!confirm("Do'konni tasdiqlaysizmi?")) return
    try {
      const res = await approveStore(id)
      setApprovedInfo({ login: res.login, password: res.password, store_name: res.store_name })
      loadData()
    } catch {}
  }

  const handleReject = async (id: number) => {
    const reason = prompt('Rad etish sababi:')
    if (reason === null) return
    await rejectStore(id, reason); loadData()
  }

  const handleBlock = async (id: number) => {
    if (!confirm('Bloklaysizmi?')) return
    await blockStore(id); loadData(); setSelectedStore(null)
  }

  const handleUnblock = async (id: number) => {
    await unblockStore(id); loadData(); setSelectedStore(null)
  }

  const viewStore = async (id: number) => {
    const s = await getAdminStore(id)
    setSelectedStore(s)
  }

  const copyText = (text: string) => { navigator.clipboard.writeText(text); alert('Nusxalandi!') }

  // Qo'lda do'kon qo'shish
  const handleAddStore = async () => {
    if (!addForm.store_name || !addForm.owner_name || !addForm.director_login || !addForm.director_password) {
      setAddError("Do'kon nomi, egasi, direktor login va parol majburiy"); return
    }
    setAddLoading(true); setAddError('')
    try {
      await adminApi.post('/stores', addForm)
      setShowAddStore(false)
      setAddForm({ owner_name: '', phone: '', address: '', store_name: '', director_name: '', director_login: '', director_password: '' })
      loadData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setAddError(e.response?.data?.error || 'Xatolik')
    }
    setAddLoading(false)
  }

  // Xodimni tahrirlash
  const handleEditUser = async () => {
    if (!editUser) return
    setEditError('')
    try {
      await adminApi.put(`/users/${editUser.id}`, {
        name: editForm.name, login: editForm.login, role: editForm.role,
        ...(editForm.password ? { password: editForm.password } : {})
      })
      setEditUser(null)
      if (selectedStore) viewStore(selectedStore.id)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setEditError(e.response?.data?.error || 'Xatolik')
    }
  }

  // Do'konga xodim qo'shish
  const handleAddUser = async () => {
    if (!addUserStoreId || !addUserForm.name || !addUserForm.login || !addUserForm.password) {
      setAddUserError("Barcha maydonlarni to'ldiring"); return
    }
    setAddUserError('')
    try {
      await adminApi.post(`/stores/${addUserStoreId}/users`, addUserForm)
      setAddUserStoreId(null)
      setAddUserForm({ name: '', login: '', password: '', role: 'cashier' })
      if (selectedStore) viewStore(selectedStore.id)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setAddUserError(e.response?.data?.error || 'Xatolik')
    }
  }

  // ===== LOGIN =====
  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-8 text-center text-white">
            <div className="w-14 h-14 bg-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-3"><Shield size={28} /></div>
            <h1 className="text-xl font-bold">Super Admin</h1>
            <p className="text-gray-400 text-sm mt-1">POS ERP Platform boshqaruvi</p>
          </div>
          <div className="p-6 space-y-4">
            {loginError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{loginError}</div>}
            <input className="input" placeholder="Login" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
            <input type="password" className="input" placeholder="Parol" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button onClick={handleLogin} disabled={loginLoading} className="btn btn-primary w-full flex items-center justify-center gap-2">
              <LogIn size={16} /> {loginLoading ? 'Kirilmoqda...' : 'Kirish'}
            </button>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t text-center">
            <a href="/" className="text-xs text-gray-400 hover:text-blue-600">Do'kon sahifasiga qaytish</a>
          </div>
        </div>
      </div>
    )
  }

  // ===== ADMIN PANEL =====
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3">
        <Shield size={20} className="text-yellow-500" />
        <h1 className="font-bold flex-1">POS ERP Admin</h1>
        <span className="text-sm text-gray-400">{admin.name}</span>
        <button onClick={handleLogout} className="p-1.5 hover:bg-gray-800 rounded"><LogOut size={16} /></button>
      </header>

      <div className="bg-white border-b flex px-4 gap-1">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { key: 'applications', label: `Arizalar (${stats.pending})`, icon: Clock },
          { key: 'stores', label: `Do'konlar (${stats.approved})`, icon: Store },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Jami do'konlar", value: stats.total, color: 'bg-blue-500', icon: Store },
                { label: 'Yangi arizalar', value: stats.pending, color: 'bg-orange-500', icon: Clock },
                { label: 'Faol', value: stats.approved, color: 'bg-green-500', icon: CheckCircle },
                { label: 'Rad etilgan', value: stats.rejected, color: 'bg-red-500', icon: XCircle },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 ${s.color} rounded-lg flex items-center justify-center text-white`}><s.icon size={16} /></div>
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            {stats.pending > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-orange-800 font-medium"><Clock size={14} className="inline mr-1" /> {stats.pending} ta yangi ariza kutmoqda!</p>
                <button onClick={() => setTab('applications')} className="text-sm text-orange-600 hover:underline mt-1">Ko'rish →</button>
              </div>
            )}
          </>
        )}

        {/* ARIZALAR */}
        {tab === 'applications' && (
          <>
            <h2 className="text-lg font-bold flex items-center gap-2"><Clock size={20} /> Yangi arizalar</h2>
            {applications.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                <Clock size={40} className="mx-auto mb-2 opacity-40" /><p>Yangi arizalar yo'q</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-lg">{app.store_name}</p>
                        <p className="text-sm text-gray-600">{app.owner_name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12} /> {app.phone}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1"><Store size={12} /> {app.address}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(app.created_at).toLocaleString('uz-UZ')}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleApprove(app.id)} className="btn btn-success btn-sm flex items-center gap-1"><CheckCircle size={14} /> Tasdiqlash</button>
                        <button onClick={() => handleReject(app.id)} className="btn btn-danger btn-sm flex items-center gap-1"><XCircle size={14} /> Rad etish</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* DO'KONLAR */}
        {tab === 'stores' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Store size={20} /> Barcha do'konlar</h2>
              <button onClick={() => { setShowAddStore(true); setAddError('') }} className="btn btn-primary btn-sm flex items-center gap-1.5">
                <Plus size={14} /> Do'kon qo'shish
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Do'kon</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Egasi</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Telefon</th>
                    <th className="px-4 py-3 text-center">Holati</th>
                    <th className="px-4 py-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stores.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium text-sm">{s.store_name}</p></td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{s.owner_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{s.phone}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge text-xs ${s.status === 'approved' ? 'badge-green' : s.status === 'pending' ? 'badge-yellow' : s.status === 'blocked' ? 'badge-red' : 'badge-red'}`}>
                          {s.status === 'approved' ? 'Faol' : s.status === 'pending' ? 'Kutilmoqda' : s.status === 'blocked' ? 'Bloklangan' : 'Rad etilgan'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => viewStore(s.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Eye size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Approved info modal */}
      {approvedInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="text-center">
              <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
              <h3 className="font-bold text-lg">Do'kon tasdiqlandi!</h3>
              <p className="text-sm text-gray-600">{approvedInfo.store_name}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Login:</span>
                <span className="font-mono font-bold">{approvedInfo.login}</span>
                <button onClick={() => copyText(approvedInfo.login)} className="p-1 text-gray-400 hover:text-blue-600"><Copy size={14} /></button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Parol:</span>
                <span className="font-mono font-bold">{approvedInfo.password}</span>
                <button onClick={() => copyText(approvedInfo.password)} className="p-1 text-gray-400 hover:text-blue-600"><Copy size={14} /></button>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">Bu ma'lumotlarni do'kon egasiga yuboring</p>
            <button onClick={() => setApprovedInfo(null)} className="btn btn-primary w-full">Yopish</button>
          </div>
        </div>
      )}

      {/* Store detail modal */}
      {selectedStore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">{selectedStore.store_name}</h3>
              <button onClick={() => setSelectedStore(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Egasi:</span><p className="font-medium">{selectedStore.owner_name}</p></div>
                <div><span className="text-gray-500">Telefon:</span><p className="font-medium">{selectedStore.phone}</p></div>
                <div className="col-span-2"><span className="text-gray-500">Manzil:</span><p className="font-medium">{selectedStore.address}</p></div>
              </div>

              {selectedStore.status === 'approved' && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Mahsulotlar', value: selectedStore.stats.products },
                    { label: 'Sotuvlar', value: selectedStore.stats.sales },
                    { label: 'Daromad', value: selectedStore.stats.revenue.toLocaleString('uz-UZ') + " so'm" },
                    { label: 'Xodimlar', value: selectedStore.stats.users },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="font-bold text-sm">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Xodimlar ro'yxati */}
              {selectedStore.users && selectedStore.users.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-1.5"><Users size={15} /> Xodimlar</h4>
                    <button onClick={() => { setAddUserStoreId(selectedStore.id); setAddUserForm({ name: '', login: '', password: '', role: 'cashier' }); setAddUserError('') }}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={12} /> Xodim qo'shish</button>
                  </div>
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                    {selectedStore.users.map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${u.role === 'director' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm truncate">{u.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${u.role === 'director' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                              {u.role === 'director' ? 'Direktor' : 'Kassir'}
                            </span>
                            {!u.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Bloklangan</span>}
                          </div>
                          <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                            <Key size={10} /> {u.login}
                            <button onClick={() => copyText(u.login)} className="text-gray-400 hover:text-blue-600"><Copy size={10} /></button>
                          </p>
                        </div>
                        <button onClick={() => {
                          setEditUser(u); setEditForm({ name: u.name, login: u.login, password: '', role: u.role }); setEditError('')
                        }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded shrink-0">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedStore.status === 'approved' && (
                  <button onClick={() => handleBlock(selectedStore.id)} className="btn btn-danger btn-sm flex items-center gap-1 flex-1"><Ban size={14} /> Bloklash</button>
                )}
                {selectedStore.status === 'blocked' && (
                  <button onClick={() => handleUnblock(selectedStore.id)} className="btn btn-success btn-sm flex items-center gap-1 flex-1"><Unlock size={14} /> Blokdan chiqarish</button>
                )}
                <button onClick={() => setSelectedStore(null)} className="btn btn-secondary flex-1">Yopish</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Store Modal */}
      {showAddStore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-lg">Yangi do'kon qo'shish</h3>
              <button onClick={() => setShowAddStore(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              {addError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{addError}</div>}

              <p className="text-xs text-gray-500 font-medium uppercase">Do'kon ma'lumotlari</p>
              <input className="input" placeholder="Do'kon nomi *" value={addForm.store_name} onChange={e => setAddForm(f => ({ ...f, store_name: e.target.value }))} />
              <input className="input" placeholder="Egasi (F.I.O) *" value={addForm.owner_name} onChange={e => setAddForm(f => ({ ...f, owner_name: e.target.value }))} />
              <input className="input" placeholder="Telefon" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
              <input className="input" placeholder="Manzil" value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} />

              <p className="text-xs text-gray-500 font-medium uppercase pt-2">Direktor hisobi</p>
              <input className="input" placeholder="Direktor ismi" value={addForm.director_name} onChange={e => setAddForm(f => ({ ...f, director_name: e.target.value }))} />
              <input className="input font-mono" placeholder="Login *" value={addForm.director_login} onChange={e => setAddForm(f => ({ ...f, director_login: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} />
              <input className="input font-mono" placeholder="Parol *" value={addForm.director_password} onChange={e => setAddForm(f => ({ ...f, director_password: e.target.value }))} />

              <button onClick={handleAddStore} disabled={addLoading} className="btn btn-primary w-full">
                {addLoading ? 'Yaratilmoqda...' : "Do'kon yaratish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold">Xodimni tahrirlash</h3>
              <button onClick={() => setEditUser(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              {editError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{editError}</div>}
              <input className="input" placeholder="Ism" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              <input className="input font-mono" placeholder="Login" value={editForm.login} onChange={e => setEditForm(f => ({ ...f, login: e.target.value }))} />
              <input className="input font-mono" placeholder="Yangi parol (bo'sh = o'zgarmaydi)" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
              <select className="input" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                <option value="director">Direktor</option>
                <option value="cashier">Kassir</option>
              </select>
              <button onClick={handleEditUser} className="btn btn-primary w-full">Saqlash</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User to Store Modal */}
      {addUserStoreId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold">Yangi xodim qo'shish</h3>
              <button onClick={() => setAddUserStoreId(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              {addUserError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{addUserError}</div>}
              <input className="input" placeholder="Ism *" value={addUserForm.name} onChange={e => setAddUserForm(f => ({ ...f, name: e.target.value }))} />
              <input className="input font-mono" placeholder="Login *" value={addUserForm.login} onChange={e => setAddUserForm(f => ({ ...f, login: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} />
              <input className="input font-mono" placeholder="Parol *" value={addUserForm.password} onChange={e => setAddUserForm(f => ({ ...f, password: e.target.value }))} />
              <select className="input" value={addUserForm.role} onChange={e => setAddUserForm(f => ({ ...f, role: e.target.value }))}>
                <option value="cashier">Kassir</option>
                <option value="director">Direktor</option>
              </select>
              <button onClick={handleAddUser} className="btn btn-primary w-full">Qo'shish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
