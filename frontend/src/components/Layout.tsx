import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Package, BarChart3, History, Warehouse, Settings, Users, LogOut, Shield, MoreHorizontal } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { getStoreConfig } from '../types'

interface UserInfo {
  id: number
  name: string
  role: string
  photo_data: string | null
  allowed_pages: string[]
  store_id: number
  store_name: string
}

const ALL_NAV_ITEMS = [
  { to: '/',          icon: ShoppingCart, label: 'Kassa',       key: 'kassa' },
  { to: '/products',  icon: Package,      label: 'Mahsulotlar', key: 'products' },
  { to: '/inventory', icon: Warehouse,    label: 'Zaxira',      key: 'inventory' },
  { to: '/sales',     icon: History,      label: 'Sotuvlar',    key: 'sales' },
  { to: '/reports',   icon: BarChart3,    label: 'Hisobotlar',  key: 'reports' },
  { to: '/cashiers',  icon: Users,        label: 'Xodimlar',    key: 'cashiers' },
  { to: '/settings',  icon: Settings,     label: 'Sozlamalar',  key: 'settings' },
]

function getNavItems(user: UserInfo) {
  if (user.role === 'director') return ALL_NAV_ITEMS
  const allowed = new Set(user.allowed_pages || [])
  allowed.add('/')
  return ALL_NAV_ITEMS.filter(item => allowed.has(item.to))
}

interface Props {
  user: UserInfo
  onLogout: () => void
}

export default function Layout({ user, onLogout }: Props) {
  const itemCount = useCartStore(s => s.itemCount())
  const navigate = useNavigate()
  const location = useLocation()
  const store = getStoreConfig()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const navItems = getNavItems(user)

  // Mobileda: birinchi 4 ta — bottom tab, qolganlari — "Ko'proq" menyu
  const mainMobileItems = navItems.slice(0, 4)
  const extraMobileItems = navItems.slice(4)
  const isExtraActive = extraMobileItems.some(item => location.pathname === item.to)

  // Tashqariga bosganda menyuni yopish
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreOpen])

  // Sahifa o'zgarganda menyuni yopish
  useEffect(() => { setMoreOpen(false) }, [location.pathname])

  const handleLogout = () => {
    onLogout()
    navigate('/')
  }

  const isDirector = user.role === 'director'
  const roleLabel = isDirector ? 'Direktor' : 'Kassir'
  const roleColor = isDirector ? 'text-yellow-400' : 'text-gray-400'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 text-white shrink-0">
        <div className="px-4 py-4 border-b border-gray-700 flex items-center gap-2">
          {store.logo_data ? (
            <img src={store.logo_data} className="w-9 h-9 object-contain rounded-lg bg-white p-0.5" />
          ) : (
            <span className="text-2xl">🏪</span>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">{store.name || user.store_name || 'POS ERP'}</h1>
            <p className="text-xs text-gray-400">Kassa tizimi</p>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-gray-700 flex items-center gap-2">
          {user.photo_data ? (
            <img src={user.photo_data} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className={`w-8 h-8 rounded-full ${isDirector ? 'bg-yellow-500' : 'bg-blue-500'} flex items-center justify-center text-xs font-bold`}>
              {user.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className={`text-xs flex items-center gap-1 ${roleColor}`}>
              {isDirector && <Shield size={10} />}
              {roleLabel}
            </p>
          </div>
          <button onClick={handleLogout} title="Chiqish" className="text-gray-400 hover:text-red-400">
            <LogOut size={15} />
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {to === '/' && itemCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-700">
          <p className="text-xs text-gray-500">v2.2.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden bg-white border-b flex items-center gap-2 px-3 py-2">
          {store.logo_data ? (
            <img src={store.logo_data} className="w-7 h-7 object-contain rounded-lg" />
          ) : user.photo_data ? (
            <img src={user.photo_data} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className={`w-7 h-7 rounded-full ${isDirector ? 'bg-yellow-500' : 'bg-blue-500'} text-white flex items-center justify-center text-xs font-bold`}>
              {user.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{store.name || user.store_name}</p>
            <p className={`text-xs ${roleColor}`}>
              {user.name} — {roleLabel}
            </p>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-gray-500">
            <LogOut size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex">
          {mainMobileItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors relative ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
              {to === '/' && itemCount > 0 && (
                <span className="absolute top-1 right-1/4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </NavLink>
          ))}

          {/* "Ko'proq" tugmasi */}
          {extraMobileItems.length > 0 && (
            <div ref={moreRef} className="flex-1 relative">
              <button
                onClick={() => setMoreOpen(o => !o)}
                className={`w-full flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors ${
                  isExtraActive || moreOpen ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <MoreHorizontal size={20} />
                <span>Ko'proq</span>
              </button>

              {/* Popup menyu */}
              {moreOpen && (
                <div className="absolute bottom-full right-0 mb-2 mr-1 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-[180px] animate-in fade-in slide-in-from-bottom-2">
                  {extraMobileItems.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`
                      }
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
