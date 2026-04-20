import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, ShoppingBag, Package, Banknote } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { getStats, getDailyReport, getMonthlyReport, getTopProducts, getAuditLog, getProfitReport } from '../api/client'

function fmt(n: number) { return n.toLocaleString('uz-UZ') + " so'm" }

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1']

const ACTION_LABELS: Record<string, string> = {
  sale_created: "💰 Sotuv",
  sale_refunded: "↩️ Qaytarish",
  product_created: "➕ Mahsulot qo'shildi",
  product_updated: "✏️ Mahsulot o'zgartirildi",
  product_deleted: "🗑️ Mahsulot o'chirildi",
  staff_created: "👤 Xodim qo'shildi",
  staff_deleted: "❌ Xodim o'chirildi",
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'stats' | 'audit' | 'profit'>('stats')
  const [stats, setStats] = useState<Record<string, number>>({ today_sales: 0, today_revenue: 0, month_sales: 0, month_revenue: 0, low_stock_count: 0, total_products: 0 })
  const [dailyData, setDailyData] = useState<{ hour: string; revenue: number; sales: number }[]>([])
  const [monthlyData, setMonthlyData] = useState<{ date: string; revenue: number; total_sales: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ product_name: string; total_revenue: number; total_qty: number }[]>([])
  const [paymentData, setPaymentData] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [auditLogs, setAuditLogs] = useState<{ id: number; user_id: number | null; user_name: string | null; action: string; entity: string | null; entity_id: number | null; details: string | null; created_at: string }[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')

  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().slice(0, 10)

  const [profitData, setProfitData] = useState<{ daily: { date: string; revenue: number; total_cost: number; profit: number }[]; summary: { total_revenue: number; total_cost: number; total_profit: number }; top_products: { product_name: string; total_qty: number; revenue: number; cost: number; profit: number }[] }>({ daily: [], summary: { total_revenue: 0, total_cost: 0, total_profit: 0 }, top_products: [] })
  const [profitLoading, setProfitLoading] = useState(false)
  const [profitFrom, setProfitFrom] = useState(firstOfMonth)
  const [profitTo, setProfitTo] = useState(today)

  const userRole = JSON.parse(localStorage.getItem('user_info') || '{}').role

  const load = async () => {
    setLoading(true)
    try {
      const [s, daily, monthly, top] = await Promise.all([
        getStats(),
        getDailyReport(selectedDate),
        getMonthlyReport(),
        getTopProducts(),
      ])

      setStats({
        today_sales: s.today.sales,
        today_revenue: s.today.revenue,
        month_sales: s.this_month.sales,
        month_revenue: s.this_month.revenue,
        low_stock_count: s.low_stock_count,
        total_products: s.total_products,
      })

      setDailyData((daily.hourly || []).map((h: { hour: string; revenue: number; sales: number }) => ({
        hour: `${h.hour}:00`,
        revenue: h.revenue,
        sales: h.sales,
      })))

      setMonthlyData((monthly.daily || []).map((d: { date: string; revenue: number; total_sales: number }) => ({
        date: d.date.slice(8),
        revenue: d.revenue,
        total_sales: d.total_sales,
      })))

      setTopProducts(top || [])

      setPaymentData([
        { name: 'Naqd', value: daily.summary?.cash_revenue || 0 },
        { name: 'Karta', value: daily.summary?.card_revenue || 0 },
      ].filter(d => d.value > 0))

    } finally { setLoading(false) }
  }

  const loadAudit = async () => {
    setAuditLoading(true)
    setAuditError('')
    try {
      const data = await getAuditLog({ limit: 50 })
      setAuditLogs(data.logs || [])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setAuditError(e.response?.data?.error || 'Faoliyat tarixi yuklanmadi')
    } finally {
      setAuditLoading(false)
    }
  }

  const loadProfit = async () => {
    setProfitLoading(true)
    try {
      const data = await getProfitReport({ from: profitFrom, to: profitTo })
      setProfitData(data)
    } finally {
      setProfitLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedDate])
  useEffect(() => { if (activeTab === 'audit' && userRole === 'director') loadAudit() }, [activeTab])
  useEffect(() => { if (activeTab === 'profit' && userRole === 'director') loadProfit() }, [activeTab, profitFrom, profitTo])

  const statCards = [
    { label: "Bugungi sotuv", value: String(stats.today_sales), sub: "ta chek", icon: ShoppingBag, color: 'blue' },
    { label: "Bugungi daromad", value: fmt(stats.today_revenue), sub: "bugun", icon: Banknote, color: 'green' },
    { label: "Oylik sotuv", value: String(stats.month_sales), sub: "ta chek", icon: TrendingUp, color: 'purple' },
    { label: "Oylik daromad", value: fmt(stats.month_revenue), sub: "bu oy", icon: BarChart3, color: 'orange' },
    { label: "Jami mahsulotlar", value: String(stats.total_products), sub: "tur", icon: Package, color: 'gray' },
    { label: "Kam zaxira", value: String(stats.low_stock_count), sub: "mahsulot", icon: Package, color: stats.low_stock_count > 0 ? 'red' : 'gray' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    gray: 'bg-gray-50 text-gray-700',
    red: 'bg-red-50 text-red-700',
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 size={24} className="text-blue-600" /> Hisobotlar
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistika
        </button>
        {userRole === 'director' && (
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('profit')}
          >
            Sof daromad
          </button>
        )}
        {userRole === 'director' && (
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('audit')}
          >
            Faoliyat
          </button>
        )}
      </div>

      {/* Audit tab */}
      {activeTab === 'audit' && userRole === 'director' && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Faoliyat tarixi</h3>
            <button className="btn btn-sm btn-secondary" onClick={loadAudit} disabled={auditLoading}>
              {auditLoading ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>
          {auditLoading ? (
            <div className="text-center py-8 text-gray-400">Yuklanmoqda...</div>
          ) : auditError ? (
            <div className="text-center py-8 text-red-500 text-sm">{auditError}</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Ma'lumot yo'q</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Sana</th>
                    <th className="pb-2 pr-4 font-medium">Xodim</th>
                    <th className="pb-2 pr-4 font-medium">Harakat</th>
                    <th className="pb-2 font-medium">Tafsilot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{log.created_at}</td>
                      <td className="py-2 pr-4 font-medium">{log.user_name || '—'}</td>
                      <td className="py-2 pr-4">{ACTION_LABELS[log.action] || log.action}</td>
                      <td className="py-2 text-gray-500 text-xs">{log.details ? (() => { try { const d = JSON.parse(log.details); return Object.entries(d).map(([k,v]) => `${k}: ${v}`).join(', ') } catch { return log.details } })() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Profit tab */}
      {activeTab === 'profit' && userRole === 'director' && (
        <div className="space-y-6">
          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Dan:</label>
            <input type="date" className="input w-auto" value={profitFrom} onChange={e => setProfitFrom(e.target.value)} />
            <label className="text-sm font-medium text-gray-600">Gacha:</label>
            <input type="date" className="input w-auto" value={profitTo} onChange={e => setProfitTo(e.target.value)} />
            <button className="btn btn-sm btn-secondary" onClick={loadProfit} disabled={profitLoading}>
              {profitLoading ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>

          {profitLoading && <div className="text-center py-4 text-gray-400">Yuklanmoqda...</div>}

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Jami tushum</p>
              <p className="text-lg font-bold text-blue-700">{fmt(profitData.summary.total_revenue || 0)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-orange-600 font-medium mb-1">Tan narxi</p>
              <p className="text-lg font-bold text-orange-700">{fmt(profitData.summary.total_cost || 0)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-green-600 font-medium mb-1">Sof daromad</p>
              <p className="text-lg font-bold text-green-700">{fmt(profitData.summary.total_profit || 0)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-purple-600 font-medium mb-1">Marja %</p>
              <p className="text-lg font-bold text-purple-700">
                {profitData.summary.total_revenue ? ((profitData.summary.total_profit / profitData.summary.total_revenue) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>

          {/* Daily profit chart */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Kunlik tushum va sof daromad</h3>
            {profitData.daily.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Ma'lumot yo'q</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={profitData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + 'K'} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Tushum" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="Sof daromad" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top profitable products table */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Top foydali mahsulotlar</h3>
            {profitData.top_products.length === 0 ? (
              <div className="h-20 flex items-center justify-center text-gray-400 text-sm">Ma'lumot yo'q</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4 font-medium">#</th>
                      <th className="pb-2 pr-4 font-medium">Mahsulot</th>
                      <th className="pb-2 pr-4 font-medium text-right">Sotildi</th>
                      <th className="pb-2 pr-4 font-medium text-right">Tushum</th>
                      <th className="pb-2 pr-4 font-medium text-right">Tan narxi</th>
                      <th className="pb-2 font-medium text-right">Sof foyda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profitData.top_products.map((p, i) => (
                      <tr key={p.product_name} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium">{p.product_name}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">{p.total_qty}</td>
                        <td className="py-2 pr-4 text-right text-blue-700">{fmt(p.revenue)}</td>
                        <td className="py-2 pr-4 text-right text-orange-700">{fmt(p.cost)}</td>
                        <td className="py-2 text-right font-semibold text-green-700">{fmt(p.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats tab content */}
      {activeTab === 'stats' && <>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${colorMap[color]}`}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Sana:</label>
        <input
          type="date"
          className="input w-auto"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </div>

      {loading && <div className="text-center py-4 text-gray-400">Yuklanmoqda...</div>}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly revenue */}
        <div className="card p-4">
          <h3 className="font-semibold mb-4">Kunlik sotuv ({selectedDate})</h3>
          {dailyData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + 'K'} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Daromad" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment split */}
        <div className="card p-4">
          <h3 className="font-semibold mb-4">To'lov usullari</h3>
          {paymentData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly trend */}
        <div className="card p-4 lg:col-span-2">
          <h3 className="font-semibold mb-4">Oylik tendensiya</h3>
          {monthlyData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + 'K'} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Daromad" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products */}
        <div className="card p-4 lg:col-span-2">
          <h3 className="font-semibold mb-4">Top 10 mahsulot</h3>
          {topProducts.length === 0 ? (
            <div className="h-20 flex items-center justify-center text-gray-400 text-sm">Ma'lumot yo'q</div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => {
                const max = topProducts[0].total_revenue
                const pct = (p.total_revenue / max) * 100
                return (
                  <div key={p.product_name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-sm font-medium truncate">{p.product_name}</span>
                        <span className="text-sm text-blue-700 font-medium ml-2 shrink-0">{fmt(p.total_revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{p.total_qty} ta sotildi</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      </>}
    </div>
  )
}
