import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import POS from './pages/POS'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Cashiers from './pages/Cashiers'
import Landing from './pages/Landing'
import SuperAdmin from './pages/SuperAdmin'
import { getStoreSettings } from './api/client'
import { setStoreConfig } from './types'

interface UserInfo {
  id: number
  name: string
  role: string
  photo_data: string | null
  allowed_pages: string[]
  store_id: number
  store_name: string
}

function AppRouter() {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const token = localStorage.getItem('store_token')
    const info = localStorage.getItem('user_info')
    if (token && info) {
      try {
        // Token muddati tugaganini tekshirish
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('store_token')
          localStorage.removeItem('user_info')
          return null
        }
        return JSON.parse(info)
      } catch { return null }
    }
    return null
  })

  // Login bo'lganda yoki sahifa yuklanganda do'kon sozlamalarini serverdan olish
  const loadStoreSettings = () => {
    getStoreSettings()
      .then(data => {
        setStoreConfig({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          logo_data: data.logo_data || null,
        })
      })
      .catch(() => {})
  }

  // Sahifa yuklanganda — agar token bor bo'lsa sozlamalarni yuklash
  useEffect(() => {
    if (user) loadStoreSettings()
  }, [user])

  const handleLogin = (token: string, userInfo: UserInfo) => {
    setUser(userInfo)
  }

  const handleLogout = () => {
    localStorage.removeItem('store_token')
    localStorage.removeItem('user_info')
    setUser(null)
  }

  // Agar foydalanuvchi tizimga kirmagan bo'lsa — Landing sahifasi
  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="*" element={<Landing onLogin={handleLogin} />} />
        </Routes>
      </>
    )
  }

  // Tizimga kirgan — POS Layout
  return (
    <Routes>
      <Route path="/super-admin" element={<SuperAdmin />} />
      <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
        <Route index element={<POS user={user} />} />
        <Route path="products" element={<Products />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales" element={<Sales />} />
        <Route path="reports" element={<Reports />} />
        <Route path="cashiers" element={<Cashiers user={user} />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
