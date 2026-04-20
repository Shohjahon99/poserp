export interface Category {
  id: number
  name: string
  created_at: string
}

export type UserRole = 'director' | 'cashier'

export interface Cashier {
  id: number
  name: string
  pin: string
  role: UserRole
  photo_data: string | null
  face_descriptor: string | null
  has_face?: number
  is_active: number
  created_at: string
}

export interface Product {
  id: number
  barcode: string | null
  name: string
  category_id: number | null
  category_name?: string
  price: number
  cost: number
  stock: number
  low_stock_threshold: number
  unit: string
  image_data: string | null
  is_quick_add: number
  created_at: string
  updated_at: string
}

export interface CartItem {
  product: Product
  quantity: number  // decimal allowed for kg/litr
}

export interface SaleItem {
  id: number
  sale_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  barcode?: string
}

export interface Sale {
  id: number
  receipt_number: string
  total: number
  discount: number
  payment_method: 'cash' | 'card'
  amount_tendered: number
  change_given: number
  cashier_id?: number
  cashier_name?: string
  is_refunded?: number
  refunded_at?: string
  created_at: string
  item_count?: number
  items?: SaleItem[]
}

export interface StoreConfig {
  name: string
  address: string
  phone: string
  logo_data: string | null
}

export const WEIGHT_UNITS = ['kg', 'litr', 'gramm', 'metr'] as const
export const COUNT_UNITS  = ['dona', 'quti', 'juft', 'paket'] as const
export type WeightUnit = typeof WEIGHT_UNITS[number]

export function isWeightUnit(unit: string): boolean {
  return WEIGHT_UNITS.includes(unit as WeightUnit)
}

// Store config — har bir do'konning o'z sozlamalari (serverdan yuklanadi, localStorage'da keshlanadi)
export function getStoreConfig(): StoreConfig {
  try {
    const storeId = JSON.parse(localStorage.getItem('user_info') || '{}').store_id
    const key = storeId ? `pos_store_config_${storeId}` : 'pos_store_config'
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch { return { name: '', address: '', phone: '', logo_data: null } }
}

export function setStoreConfig(config: StoreConfig): void {
  try {
    const storeId = JSON.parse(localStorage.getItem('user_info') || '{}').store_id
    const key = storeId ? `pos_store_config_${storeId}` : 'pos_store_config'
    localStorage.setItem(key, JSON.stringify(config))
  } catch {}
}

// Har bir rol uchun ruxsat etilgan sahifalar
export const ROLE_PAGES: Record<UserRole, string[]> = {
  director: ['/', '/products', '/inventory', '/sales', '/reports', '/cashiers', '/settings'],
  cashier:  ['/'],
}

export function canAccess(role: UserRole | undefined, path: string): boolean {
  if (!role) return false
  return ROLE_PAGES[role]?.includes(path) ?? false
}
