import axios from 'axios'
import type { Product, Sale, Category } from '../types'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('store_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/')) {
      localStorage.removeItem('store_token')
      localStorage.removeItem('user_info')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

// ===== Auth =====
export const storeLogin = (login: string, password: string) =>
  api.post('/auth/login', { login, password }).then(r => r.data)

export const storeRegister = (data: { owner_name: string; phone: string; address: string; store_name: string }) =>
  api.post('/auth/register', data).then(r => r.data)

export const getAuthMe = () =>
  api.get('/auth/me').then(r => r.data)

// ===== Admin =====
const adminApi = axios.create({ baseURL: '/api/admin' })
adminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const adminLogin = (username: string, password: string) =>
  adminApi.post('/login', { username, password }).then(r => r.data)

export const getAdminStats = () => adminApi.get('/stats').then(r => r.data)
export const getApplications = () => adminApi.get('/applications').then(r => r.data)
export const getAdminStores = (status?: string) => adminApi.get('/stores', { params: { status } }).then(r => r.data)
export const getAdminStore = (id: number) => adminApi.get(`/stores/${id}`).then(r => r.data)
export const approveStore = (id: number) => adminApi.post(`/stores/${id}/approve`).then(r => r.data)
export const rejectStore = (id: number, reason?: string) => adminApi.post(`/stores/${id}/reject`, { reason }).then(r => r.data)
export const blockStore = (id: number) => adminApi.post(`/stores/${id}/block`).then(r => r.data)
export const unblockStore = (id: number) => adminApi.post(`/stores/${id}/unblock`).then(r => r.data)

// ===== Staff (Xodimlar) =====
export interface StaffMember {
  id: number
  name: string
  login: string
  role: string
  allowed_pages: string[]
  is_active: number
  photo_data: string | null
  created_at: string
}

export const getStaff = () =>
  api.get<StaffMember[]>('/staff').then(r => r.data)

export const createStaffMember = (data: { name: string; login: string; password: string; role: string; allowed_pages: string[]; photo_data?: string | null }) =>
  api.post<StaffMember>('/staff', data).then(r => r.data)

export const updateStaffMember = (id: number, data: Record<string, unknown>) =>
  api.put<StaffMember>(`/staff/${id}`, data).then(r => r.data)

export const deleteStaffMember = (id: number) =>
  api.delete(`/staff/${id}`).then(r => r.data)

// ===== Products =====
export const getProducts = (params?: { search?: string; barcode?: string; category?: string; limit?: number; quick_add?: boolean }) =>
  api.get<{ products: Product[]; total: number }>('/products', { params }).then(r => r.data)

export const getProduct = (id: number) =>
  api.get<Product>(`/products/${id}`).then(r => r.data)

export const createProduct = (data: Partial<Product>) =>
  api.post<Product>('/products', data).then(r => r.data)

export const updateProduct = (id: number, data: Partial<Product>) =>
  api.put<Product>(`/products/${id}`, data).then(r => r.data)

export const deleteProduct = (id: number) =>
  api.delete(`/products/${id}`).then(r => r.data)

export const getLowStock = () =>
  api.get<Product[]>('/products/low-stock').then(r => r.data)

// ===== Categories =====
export const getCategories = () =>
  api.get<Category[]>('/categories').then(r => r.data)

export const createCategory = (name: string) =>
  api.post<Category>('/categories', { name }).then(r => r.data)

// ===== Cashiers (store DB — eski PIN tizimi, hali kerak) =====
export const getCashiers = () =>
  api.get('/cashiers').then(r => r.data)

export const createCashier = (data: Record<string, unknown>) =>
  api.post('/cashiers', data).then(r => r.data)

export const updateCashier = (id: number, data: Record<string, unknown>) =>
  api.put(`/cashiers/${id}`, data).then(r => r.data)

export const deleteCashier = (id: number) =>
  api.delete(`/cashiers/${id}`).then(r => r.data)

export const verifyPin = (pin: string) =>
  api.post('/cashiers/verify-pin', { pin }).then(r => r.data)

// ===== Sales =====
export interface CreateSalePayload {
  items: { product_id: number; quantity: number; unit_price: number }[]
  discount?: number
  payment_method: 'cash' | 'card'
  amount_tendered?: number
  cashier_id?: number
  cashier_name?: string
}

export const createSale = (data: CreateSalePayload) =>
  api.post<Sale>('/sales', data).then(r => r.data)

export const getSales = (params?: { from?: string; to?: string; page?: number; limit?: number }) =>
  api.get<{ sales: Sale[]; total: number; page: number; limit: number }>('/sales', { params }).then(r => r.data)

export const getSale = (id: number) =>
  api.get<Sale>(`/sales/${id}`).then(r => r.data)

export const refundSale = (id: number) =>
  api.post(`/sales/${id}/refund`).then(r => r.data)

// ===== Inventory =====
export const adjustInventory = (product_id: number, change: number, note?: string) =>
  api.post('/inventory/adjust', { product_id, change, reason: 'manual_adjust', note }).then(r => r.data)

export const getInventoryLog = (product_id?: number) =>
  api.get('/inventory/log', { params: { product_id } }).then(r => r.data)

export const getLowStockProducts = () =>
  api.get<Product[]>('/inventory/low-stock').then(r => r.data)

// ===== Reports =====
export const getDailyReport = (date?: string) =>
  api.get('/reports/daily', { params: { date } }).then(r => r.data)

export const getMonthlyReport = (year?: number, month?: number) =>
  api.get('/reports/monthly', { params: { year, month } }).then(r => r.data)

export const getStats = () =>
  api.get('/reports/stats').then(r => r.data)

export const getTopProducts = (from?: string, to?: string) =>
  api.get('/reports/top-products', { params: { from, to, limit: 10 } }).then(r => r.data)

export const getProfitReport = (params?: { from?: string; to?: string }) =>
  api.get('/reports/profit', { params }).then(r => r.data)

// ===== Store Settings =====
export const getStoreSettings = () =>
  api.get('/settings').then(r => r.data)

export const saveStoreSettings = (data: { name?: string; address?: string; phone?: string; logo_data?: string }) =>
  api.put('/settings', data).then(r => r.data)

// ===== Audit Log =====
export const getAuditLog = (params?: { limit?: number; offset?: number; user?: string; action?: string }) =>
  api.get<{ logs: { id: number; user_id: number | null; user_name: string | null; action: string; entity: string | null; entity_id: number | null; details: string | null; created_at: string }[]; total: number }>('/audit', { params }).then(r => r.data)
