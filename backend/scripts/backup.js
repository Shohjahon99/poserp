#!/usr/bin/env node
/**
 * POS ERP — Avtomatik Telegram Backup
 *
 * Ishlatish:
 *   node scripts/backup.js          — bir martalik backup
 *   node scripts/backup.js --test   — ulanishni tekshirish (fayl yubormasdan)
 *
 * Cron (har kecha 02:00):
 *   0 2 * * * cd /app && node scripts/backup.js >> /var/log/pos-backup.log 2>&1
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { execSync, spawnSync } = require('child_process')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ─── Sozlamalar ────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BACKUP_BOT_TOKEN
const CHAT_ID   = process.env.BACKUP_CHAT_ID
const DATA_DIR  = path.join(__dirname, '..', 'data')
const isTest    = process.argv.includes('--test')

// ─── Tekshiruvlar ──────────────────────────────────────────────────────────────
if (!BOT_TOKEN) {
  console.error('❌ BACKUP_BOT_TOKEN .env faylida yo\'q!')
  process.exit(1)
}
if (!CHAT_ID) {
  console.error('❌ BACKUP_CHAT_ID .env faylida yo\'q!')
  console.error('   Chat ID olish uchun: node scripts/get-chat-id.js')
  process.exit(1)
}
if (!fs.existsSync(DATA_DIR)) {
  console.error(`❌ Data papkasi topilmadi: ${DATA_DIR}`)
  process.exit(1)
}

// ─── Asosiy funksiya ───────────────────────────────────────────────────────────
async function main() {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)                          // 2026-04-17
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-')       // 14-30-00
  const label   = `${dateStr}_${timeStr}`

  log(`\n${'━'.repeat(45)}`)
  log(`  POS ERP Backup — ${dateStr} ${now.toTimeString().slice(0, 8)}`)
  log(`${'━'.repeat(45)}`)

  if (isTest) {
    log('\n🔍 Test rejimi — faqat ulanish tekshiriladi...')
    await testConnection()
    return
  }

  // 1. Fayl nomi va manzil
  const zipName = `pos_backup_${label}.tar.gz`
  const zipPath = path.join(os.tmpdir(), zipName)

  try {
    // 2. Backup yaratish
    log('\n📦 Ma\'lumotlar siqilmoqda...')
    const actualZipPath = createArchive(DATA_DIR, zipPath)
    const actualZipName = path.basename(actualZipPath)
    const sizeMB = (fs.statSync(actualZipPath).size / 1024 / 1024).toFixed(2)
    log(`✅ Tayyor: ${actualZipName} (${sizeMB} MB)`)

    // 3. Hajm tekshiruvi
    if (parseFloat(sizeMB) > 49) {
      await sendMessage(`⚠️ Backup fayli juda katta: ${sizeMB} MB\nTelegram 50MB chegarasida. Yuborib ko'riladi...`)
    }

    // 4. Telegram ga yuborish
    log(`\n📤 Telegram ga yuborilmoqda...`)
    const stores = countStores(DATA_DIR)
    const caption = [
      `🏪 *POS ERP Backup*`,
      `📅 ${dateStr} — ${now.toTimeString().slice(0, 8)}`,
      `💾 Hajm: ${sizeMB} MB`,
      `🏬 Do'konlar: ${stores}`,
    ].join('\n')

    await sendDocument(actualZipPath, actualZipName, caption)
    log(`✅ Telegram ga yuborildi!`)

  } finally {
    // 5. Vaqtinchalik faylni o'chirish
    const cleanPath = fs.existsSync(zipPath) ? zipPath : zipPath.replace('.tar.gz', '.zip')
    if (fs.existsSync(cleanPath)) {
      fs.unlinkSync(cleanPath)
      log(`🗑️  Vaqtinchalik fayl tozalandi`)
    }
  }

  log(`\n✅ Backup muvaffaqiyatli yakunlandi!\n`)
}

// ─── Yordamchi funksiyalar ─────────────────────────────────────────────────────

function log(msg) {
  console.log(msg)
}

function createArchive(sourceDir, destPath) {
  // SQLite fayllarni VACUUM INTO orqali xavfsiz nusxalash
  // (fayl server tomonidan bloklangan bo'lsa ham ishlaydi)
  const { DatabaseSync } = require('node:sqlite')
  const backupDir = destPath.replace(/\.(tar\.gz|zip)$/, '_files')

  fs.mkdirSync(backupDir, { recursive: true })

  // platform.db
  const platformDb = path.join(sourceDir, 'platform.db')
  if (fs.existsSync(platformDb)) {
    const db = new DatabaseSync(platformDb, { readonly: true })
    db.exec(`VACUUM INTO '${path.join(backupDir, 'platform.db')}'`)
    db.close()
  }

  // Har bir do'kon DB si
  const storesDir = path.join(sourceDir, 'stores')
  if (fs.existsSync(storesDir)) {
    for (const storeFolder of fs.readdirSync(storesDir)) {
      const dbPath = path.join(storesDir, storeFolder, 'pos.db')
      if (fs.existsSync(dbPath)) {
        const outDir = path.join(backupDir, 'stores', storeFolder)
        fs.mkdirSync(outDir, { recursive: true })
        const db = new DatabaseSync(dbPath, { readonly: true })
        db.exec(`VACUUM INTO '${path.join(outDir, 'pos.db')}'`)
        db.close()
      }
    }
  }

  // Nusxalarni zip qilish
  if (os.platform() === 'win32') {
    const zipPath = destPath.replace(/\.tar\.gz$/, '.zip')
    execSync(
      `powershell -Command "Compress-Archive -Path '${backupDir}' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'pipe' }
    )
    fs.rmSync(backupDir, { recursive: true, force: true })
    return zipPath
  } else {
    execSync(
      `tar -czf "${destPath}" -C "${path.dirname(backupDir)}" "${path.basename(backupDir)}"`,
      { stdio: 'pipe' }
    )
    fs.rmSync(backupDir, { recursive: true, force: true })
    return destPath
  }
}

function countStores(dataDir) {
  const storesDir = path.join(dataDir, 'stores')
  if (!fs.existsSync(storesDir)) return 0
  return fs.readdirSync(storesDir).filter(f =>
    fs.statSync(path.join(storesDir, f)).isDirectory()
  ).length
}

// Telegram: oddiy matn xabar
function sendMessage(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
    const opts = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }
    const req = https.request(opts, res => {
      res.on('data', () => {})
      res.on('end', resolve)
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// Telegram: fayl yuborish (multipart/form-data)
function sendDocument(filePath, fileName, caption) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(filePath)
    const boundary  = 'PosErpBackup' + Date.now()

    const head = Buffer.from([
      `--${boundary}`,
      `Content-Disposition: form-data; name="chat_id"`,
      '', CHAT_ID,
      `--${boundary}`,
      `Content-Disposition: form-data; name="parse_mode"`,
      '', 'Markdown',
      `--${boundary}`,
      `Content-Disposition: form-data; name="caption"`,
      '', caption,
      `--${boundary}`,
      `Content-Disposition: form-data; name="document"; filename="${fileName}"`,
      `Content-Type: application/gzip`,
      '', '',
    ].join('\r\n'))

    const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([head, fileBuffer, tail])

    const opts = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendDocument`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }

    const req = https.request(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const r = JSON.parse(data)
          if (r.ok) resolve(r)
          else reject(new Error(`Telegram: ${r.description}`))
        } catch {
          reject(new Error('Telegram javobini o\'qib bo\'lmadi'))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// Test: ulanishni tekshirish
async function testConnection() {
  return new Promise((resolve, reject) => {
    https.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        const r = JSON.parse(data)
        if (r.ok) {
          log(`✅ Bot ulandi: @${r.result.username} (${r.result.first_name})`)
          log(`✅ Chat ID  : ${CHAT_ID}`)
          // Test xabar yuborish
          sendMessage(`✅ *POS ERP Backup Test*\nUlanish muvaffaqiyatli!\nBot: @${r.result.username}`)
            .then(() => { log('✅ Test xabari yuborildi!'); resolve() })
            .catch(reject)
        } else {
          reject(new Error(`Bot token noto'g'ri: ${r.description}`))
        }
      })
    }).on('error', reject)
  })
}

// ─── Ishga tushirish ───────────────────────────────────────────────────────────
main().catch(async err => {
  console.error(`\n❌ BACKUP XATOSI: ${err.message}\n`)

  // Xato haqida Telegram ga xabar berish
  const errMsg = `❌ *POS ERP Backup XATOSI!*\n📅 ${new Date().toLocaleString('uz-UZ')}\n🔴 ${err.message}`
  sendMessage(errMsg).catch(() => {})

  process.exit(1)
})
