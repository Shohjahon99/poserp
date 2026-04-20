import { X, Printer } from 'lucide-react'
import type { Sale } from '../types'
import { getStoreConfig } from '../types'

interface Props {
  sale: Sale
  onClose: () => void
}

function fmt(n: number) { return n.toLocaleString('uz-UZ') + " so'm" }

export default function ReceiptModal({ sale, onClose }: Props) {
  const store = getStoreConfig()
  const storeName = store.name || "Do'konim"
  const storePhone = store.phone || ''
  const storeAddress = store.address || ''
  const storeLogo = store.logo_data || ''

  const now = new Date(sale.created_at)
  const dateStr = now.toLocaleDateString('uz-UZ')
  const timeStr = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })

  const buildReceiptHtml = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chek ${sale.receipt_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; padding: 8px; }
    .center { text-align: center; }
    .logo { max-width: 80px; max-height: 80px; margin: 0 auto 6px; display: block; }
    .store-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
    .store-info { font-size: 11px; color: #333; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; vertical-align: top; }
    td.right { text-align: right; }
    .total-row td { font-weight: bold; font-size: 14px; padding-top: 4px; }
    .muted { color: #555; }
    .thanks { text-align: center; margin-top: 12px; font-size: 11px; color: #555; }
    @page { margin: 4mm; size: 80mm auto; }
  </style>
</head>
<body>
  <div class="center">
    ${storeLogo ? `<img src="${storeLogo}" class="logo" />` : ''}
    <div class="store-name">${storeName}</div>
    ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ''}
    ${storePhone ? `<div class="store-info">Tel: ${storePhone}</div>` : ''}
    <div class="divider"></div>
    <div>Chek: <strong>${sale.receipt_number}</strong></div>
    <div>${dateStr} ${timeStr}</div>
    ${sale.cashier_name ? `<div class="muted">Kassir: ${sale.cashier_name}</div>` : ''}
    <div class="divider"></div>
  </div>
  <table>
    <tbody>
      ${(sale.items || []).map(item => `
        <tr><td colspan="2"><strong>${item.product_name}</strong></td></tr>
        <tr>
          <td class="muted">${Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(3)} × ${item.unit_price.toLocaleString('uz-UZ')}</td>
          <td class="right">${item.subtotal.toLocaleString('uz-UZ')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="divider"></div>
  <table>
    <tbody>
      ${sale.discount > 0 ? `
        <tr>
          <td>Chegirma:</td>
          <td class="right">-${sale.discount.toLocaleString('uz-UZ')}</td>
        </tr>
      ` : ''}
      <tr class="total-row">
        <td>JAMI:</td>
        <td class="right">${sale.total.toLocaleString('uz-UZ')} so'm</td>
      </tr>
      <tr>
        <td>To'lov:</td>
        <td class="right">${sale.payment_method === 'cash' ? 'Naqd pul' : 'Plastik karta'}</td>
      </tr>
      ${sale.payment_method === 'cash' ? `
        <tr>
          <td class="muted">Berildi:</td>
          <td class="right muted">${sale.amount_tendered.toLocaleString('uz-UZ')}</td>
        </tr>
        <tr>
          <td class="muted">Qaytim:</td>
          <td class="right muted">${sale.change_given.toLocaleString('uz-UZ')}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>
  <div class="thanks">Xarid uchun rahmat!<br/>Yana tashrif buyuring 🙏</div>
</body>
</html>`

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=350,height=600')
    if (!win) { alert("Pop-up bloklangan"); return }
    win.document.write(buildReceiptHtml())
    win.document.close()
    win.focus()
    win.onload = () => {
      win.print()
      win.onafterprint = () => win.close()
      setTimeout(() => { if (!win.closed) win.close() }, 3000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[95vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-green-700">✅ Sotuv yakunlandi!</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs space-y-1">
            {storeLogo && (
              <div className="flex justify-center mb-2">
                <img src={storeLogo} className="max-w-[80px] max-h-[80px] object-contain" />
              </div>
            )}
            <div className="text-center font-bold text-base">{storeName}</div>
            {storeAddress && <div className="text-center text-gray-500 text-xs">{storeAddress}</div>}
            {storePhone && <div className="text-center text-gray-500 text-xs">Tel: {storePhone}</div>}

            <div className="text-center text-gray-400">{'─'.repeat(28)}</div>
            <div className="text-center">Chek: <strong>{sale.receipt_number}</strong></div>
            <div className="text-center text-gray-500">{dateStr} {timeStr}</div>
            {sale.cashier_name && (
              <div className="text-center text-gray-500">Kassir: {sale.cashier_name}</div>
            )}
            <div className="text-center text-gray-400">{'─'.repeat(28)}</div>

            {(sale.items || []).map(item => (
              <div key={item.id}>
                <div className="font-medium truncate">{item.product_name}</div>
                <div className="flex justify-between text-gray-600">
                  <span>{Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(3)} × {item.unit_price.toLocaleString('uz-UZ')}</span>
                  <span>{item.subtotal.toLocaleString('uz-UZ')}</span>
                </div>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-300 pt-2 mt-2 space-y-1">
              {sale.discount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Chegirma:</span><span>-{fmt(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm">
                <span>JAMI:</span><span>{fmt(sale.total)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>To'lov:</span>
                <span>{sale.payment_method === 'cash' ? 'Naqd' : 'Karta'}</span>
              </div>
              {sale.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Berildi:</span><span>{fmt(sale.amount_tendered)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Qaytim:</span><span>{fmt(sale.change_given)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="text-center text-gray-400 mt-2">Xarid uchun rahmat! 🙏</div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex gap-3 sticky bottom-0 bg-white">
          <button onClick={handlePrint} className="btn btn-secondary flex-1 flex items-center justify-center gap-2">
            <Printer size={16} /> Chop etish
          </button>
          <button onClick={onClose} className="btn btn-primary flex-1">Yopish</button>
        </div>
      </div>
    </div>
  )
}
