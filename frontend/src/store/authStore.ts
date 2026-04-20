import { create } from 'zustand'
import type { Cashier, UserRole } from '../types'

interface AuthStore {
  cashier: Cashier | null
  locked: boolean
  lockReason: string
  role: UserRole | null

  login: (cashier: Cashier) => void
  logout: () => void
  lock: (reason?: string) => void
  unlock: (cashier: Cashier) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  cashier: null,
  locked: true,
  lockReason: '',
  role: null,

  login: (cashier) => set({ cashier, locked: false, lockReason: '', role: cashier.role || 'cashier' }),
  logout: () => set({ cashier: null, locked: true, lockReason: '', role: null }),
  lock: (reason = 'Kassir tizimdan chiqdi') => set({ locked: true, lockReason: reason }),
  unlock: (cashier) => set({ cashier, locked: false, lockReason: '', role: cashier.role || 'cashier' }),
}))
