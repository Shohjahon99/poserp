import { create } from 'zustand'
import type { CartItem, Product } from '../types'

interface CartStore {
  items: CartItem[]
  discount: number
  paymentMethod: 'cash' | 'card'
  amountTendered: number

  addItem: (product: Product) => void
  addItemWithQty: (product: Product, qty: number) => void
  removeItem: (productId: number) => void
  updateQty: (productId: number, qty: number) => void
  setDiscount: (discount: number) => void
  setPaymentMethod: (method: 'cash' | 'card') => void
  setAmountTendered: (amount: number) => void
  clearCart: () => void

  subtotal: () => number
  total: () => number
  change: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  discount: 0,
  paymentMethod: 'cash',
  amountTendered: 0,

  addItem: (product) => set(state => {
    const existing = state.items.find(i => i.product.id === product.id)
    if (existing) {
      return {
        items: state.items.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i
        )
      }
    }
    return { items: [...state.items, { product, quantity: 1 }] }
  }),

  addItemWithQty: (product, qty) => set(state => {
    const existing = state.items.find(i => i.product.id === product.id)
    if (existing) {
      return {
        items: state.items.map(i =>
          i.product.id === product.id ? { ...i, quantity: qty } : i
        )
      }
    }
    return { items: [...state.items, { product, quantity: qty }] }
  }),

  removeItem: (productId) => set(state => ({
    items: state.items.filter(i => i.product.id !== productId)
  })),

  updateQty: (productId, qty) => set(state => {
    if (qty <= 0) return { items: state.items.filter(i => i.product.id !== productId) }
    return {
      items: state.items.map(i =>
        i.product.id === productId ? { ...i, quantity: Math.min(qty, i.product.stock) } : i
      )
    }
  }),

  setDiscount: (discount) => set({ discount }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountTendered: (amountTendered) => set({ amountTendered }),

  clearCart: () => set({ items: [], discount: 0, amountTendered: 0, paymentMethod: 'cash' }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  total: () => Math.max(0, get().subtotal() - get().discount),
  change: () => Math.max(0, get().amountTendered - get().total()),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
