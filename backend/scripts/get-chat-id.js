#!/usr/bin/env node
/**
 * Telegram Chat ID olish uchun yordamchi skript
 * Ishlatish: node scripts/get-chat-id.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const https = require('https')

const BOT_TOKEN = process.env.BACKUP_BOT_TOKEN
if (!BOT_TOKEN) {
  console.error('❌ BACKUP_BOT_TOKEN .env faylida yo\'q!')
  process.exit(1)
}

console.log('━'.repeat(50))
console.log('  Telegram Chat ID topuvchi')
console.log('━'.repeat(50))
console.log('\n📱 Qadamlar:')
console.log('  1. Telegramda botingizni toping')
console.log('  2. Bot ga /start yoki biror xabar yuboring')
console.log('  3. Bu skriptni qayta ishga tushiring\n')

https.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`, res => {
  let data = ''
  res.on('data', c => data += c)
  res.on('end', () => {
    try {
      const result = JSON.parse(data)

      if (!result.ok) {
        console.error('❌ Bot token noto\'g\'ri yoki bot bloklangan!')
        console.error('   Xato:', result.description)
        return
      }

      if (!result.result || result.result.length === 0) {
        console.log('⚠️  Hech qanday xabar topilmadi.')
        console.log('   Bot ga Telegram orqali biror xabar yuboring, keyin qayta ishga tushiring.')
        return
      }

      const seen = new Set()
      console.log('✅ Topilgan chat(lar):\n')

      for (const update of result.result) {
        const msg = update.message || update.channel_post || update.edited_message
        const chat = msg?.chat
        if (chat && !seen.has(chat.id)) {
          seen.add(chat.id)
          const name = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || 'Noma\'lum'
          console.log(`  🆔 Chat ID : ${chat.id}`)
          console.log(`  👤 Nomi    : ${name}`)
          console.log(`  📌 Turi    : ${chat.type}`)
          console.log('  ' + '─'.repeat(40))
        }
      }

      console.log('\n📝 .env fayliga qo\'shing:')
      console.log('   BACKUP_CHAT_ID=<yuqoridagi chat ID>')
      console.log('\n💡 Maslahat: Shaxsiy chatga yoki guruhga yuborish mumkin.')
      console.log('   Guruh uchun botni guruhga admin qilib qo\'shing.\n')

    } catch (e) {
      console.error('❌ Javobni o\'qib bo\'lmadi:', e.message)
    }
  })
}).on('error', err => {
  console.error('❌ Internet aloqasi xatosi:', err.message)
})
