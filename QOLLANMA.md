# POS ERP — Foydalanuvchi Qo'llanmasi

> **Versiya:** 2.2.0 | **Til:** O'zbek

---

## MUNDARIJA

1. [Tizimga kirish](#1-tizimga-kirish)
2. [Kassa (POS)](#2-kassa-pos)
3. [Mahsulotlar](#3-mahsulotlar)
4. [Zaxira (Inventarizatsiya)](#4-zaxira-inventarizatsiya)
5. [Sotuvlar tarixi](#5-sotuvlar-tarixi)
6. [Hisobotlar](#6-hisobotlar)
7. [Xodimlar](#7-xodimlar)
8. [Sozlamalar](#8-sozlamalar)
9. [Super Admin](#9-super-admin)
10. [Tez-tez so'raladigan savollar (FAQ)](#10-tez-tez-soraladigan-savollar)

---

## 1. TIZIMGA KIRISH

### Kim kiradi?
Tizimda 3 turdagi foydalanuvchi bor:

| Rol | Vakolat |
|-----|---------|
| **Super Admin** | Barcha do'konlarni boshqaradi, ariza tasdiqlaydi |
| **Direktor** | O'z do'konini to'liq boshqaradi |
| **Kassir** | Faqat ruxsat berilgan bo'limlarga kiradi |

### Kirish qadamlari

1. Brauzerda `http://localhost:3001` ni oching
2. Login va parolni kiriting
3. **Kirish** tugmasini bosing

> ⚠️ Parolni 10 marta noto'g'ri kiritsangiz — 15 daqiqa kira olmaysiz

### Yangi do'kon uchun ariza
Asosiy sahifada **"ERP uchun ariza"** tugmasini bosing:
- Do'kon nomi
- Egasi ismi
- Telefon raqam
- Manzil

Ariza Super Adminga boradi. Tasdiqlangandan keyin login/parol yuboriladi.

---

## 2. KASSA (POS)

Eng ko'p ishlatiladigan bo'lim — mahsulot qo'shib, to'lov qabul qilish.

### Mahsulot qo'shish usullari

#### 1. Barcode scanner bilan
- USB barcode scanner ulang
- Barcode ustiga skaner nuri tushiring → mahsulot avtomatik qo'shiladi

#### 2. Qidirish orqali
- Yuqoridagi qidiruv maydoniga mahsulot nomi yoki barcode yozing
- Ro'yxatdan mahsulotni tanlang

#### 3. Tezkor tugmalar (Quick Add)
- Barcodesiz mahsulotlar (sabzavot, meva) uchun
- Mahsulotlarda `Tezkor tugma` belgisini qo'ying — kassa ekranida ko'rinadi

### Miqdorni o'zgartirish
Savatdagi mahsulot yonidagi **+** / **−** tugmalar yoki miqdor maydoniga bosib yozing.

### Chegirma qo'shish
Jami summaning ostida **"Chegirma"** maydoni bor — so'm hisobida kiriting.

### To'lov qilish

1. **Hisob** tugmasini bosing
2. To'lov turini tanlang:
   - 💵 **Naqd** — berilgan pulni kiriting, qaytim avtomatik hisoblanadi
   - 💳 **Karta** — terminal orqali
   - 🔄 **Aralash** — bir qismi naqd, bir qismi karta
3. **To'lovni tasdiqlash** — chek hosil bo'ladi

### Chekni chop etish
To'lovdan keyin chek ekranda chiqadi:
- **Chop etish** — printer ulangan bo'lsa
- **Yopish** — cheksiz o'tish

> 💡 Chekda do'kon logosi, manzil va telefon raqam chiqadi. Bularni **Sozlamalar** bo'limida o'rnating.

### Savatchani tozalash
Savatda "🗑️ Tozalash" tugmasi — hamma mahsulotlarni olib tashlaydi.

---

## 3. MAHSULOTLAR

Direktor va ruxsat berilgan kassirlar kiradi.

### Yangi mahsulot qo'shish

1. **"+ Mahsulot qo'shish"** tugmasini bosing
2. Maydonlarni to'ldiring:

| Maydon | Izoh |
|--------|------|
| **Barcode** | EAN-13, UPC yoki boshqa format. Bo'sh qoldirsa tizim generatsiya qiladi |
| **Nom** | Mahsulot nomi (majburiy) |
| **Kategoriya** | Ro'yxatdan tanlang |
| **Sotuv narxi** | Kassada ko'rinadigan narx (majburiy) |
| **Tan narxi** | Xarid narxi — foyda hisoblaganda ishlatiladi |
| **Zaxira** | Hozirgi ombordagi miqdor |
| **Kam zaxira chegarasi** | Shundan kam bo'lsa ogohlantirish chiqadi (default: 10) |
| **O'lchov birligi** | dona / kg / litr / gramm / metr / quti / juft |
| **Rasm** | Ixtiyoriy — yuklab qo'ysa kassada ko'rinadi |
| **Tezkor tugma** | ✅ Barcodesiz mahsulotlar uchun (kassa ekranida tugma chiqadi) |

#### 📱 Telefonda barcode skanerlash
Barcode maydoni yonidagi **📷 kamera** tugmasi — faqat telefon/planshettda ko'rinadi:
1. Tugmani bosing → kamera ochiladi
2. Barcodeni kamera oldiga tuting
3. Skanerlanganda avtomatik to'ldiriladi va yopiladi

### Mahsulotni qidirish
- Nom bo'yicha
- Barcode bo'yicha
- Kategoriya bo'yicha filter

### Mahsulotni tahrirlash
Mahsulot yonidagi **✏️** tugma → barcha ma'lumotlarni o'zgartiring.

### Mahsulotni o'chirish
**🗑️** tugma → tasdiqlagandan keyin o'chadi.

> ⚠️ O'chirilgan mahsulot kassada ko'rinmaydi, lekin eski sotuv tarixi saqlanadi.

---

## 4. ZAXIRA (INVENTARIZATSIYA)

Omborxona boshqaruvi — mahsulot kirim/chiqimini qayd qilish.

### Zaxirani ko'rish
- Barcha mahsulotlar ro'yxati hozirgi zaxira bilan
- 🔴 **Qizil** — kam zaxira (belgilangan chegaradan past)
- Qidiruv va kategoriya filter

### Zaxirani yangilash (Manual kirim/chiqim)

1. Mahsulot yonidagi **"Yangilash"** tugmasini bosing
2. O'zgarishni kiriting:
   - `+50` — 50 dona kirim
   - `-10` — 10 dona chiqim (yoki buzilgan)
3. Sabab tanlang (majburiy)
4. Izoh qo'shing (ixtiyoriy)
5. **Saqlash**

### Zaxira tarixi
Har bir mahsulot uchun barcha kirim/chiqimlar log saqlanadi.

---

## 5. SOTUVLAR TARIXI

O'tgan sotuvlarni ko'rish va boshqarish.

### Filtrlash
- **Sanadan** — dan
- **Sanagacha** — gacha
- **Sahifalash** — 20 ta / sahifa

### Sotuv tafsilotlari
Har bir chek yonidagi **👁️** tugma:
- Barcha mahsulotlar ro'yxati
- To'lov turi va miqdori
- Kassir ismi
- Sana va vaqt

### Qaytarish (Refund)

1. Sotuvni toping → **"Qaytarish"** tugmasi
2. Tasdiqlagandan keyin:
   - Sotuv "qaytarilgan" deb belgilanadi
   - Mahsulotlar zaxiraga qaytadi
   - Kassada qayta sotuv qilib bo'lmaydi

> ⚠️ Qaytarish faqat **bir marta** va **to'liq** amalga oshiriladi (qisman qaytarish hozircha yo'q)

---

## 6. HISOBOTLAR

Direktor ko'rishi uchun mo'ljallangan.

### Statistika paneli
- **Bugungi sotuv** — nechta chek yopildi
- **Bugungi daromad** — jami tushum
- **Oylik sotuv / daromad**
- **Kam zaxira** — diqqat talab qiladigan mahsulotlar

### Kunlik hisobot
Sanani tanlang → soatma-soat sotuv grafigi + to'lov turlari diagrammasi

### Oylik tendensiya
Joriy oyning kunlik sotuv grafigi

### Top 10 mahsulot
Eng ko'p sotilgan mahsulotlar ro'yxati (daromad bo'yicha)

### Faoliyat tarixi (Direktor uchun)
**"Faoliyat"** tabiga o'ting:

| Harakat | Ma'nosi |
|---------|---------|
| 💰 Sotuv | Kassir chek yopdi |
| ↩️ Qaytarish | Sotuv bekor qilindi |
| ➕ Mahsulot qo'shildi | Yangi mahsulot yaratildi |
| ✏️ Mahsulot o'zgartirildi | Narx yoki nom o'zgardi |
| 🗑️ Mahsulot o'chirildi | Mahsulot o'chirildi |
| 👤 Xodim qo'shildi | Yangi kassir qo'shildi |
| ❌ Xodim o'chirildi | Xodim o'chirildi |

> 💡 **Maqsad:** Kim qachon nima qilganini kuzatish — noto'g'ri narx o'zgarishi yoki mahsulot o'chirishni aniqlash uchun

---

## 7. XODIMLAR

Faqat **Direktor** kiradi va boshqaradi.

### Xodim qo'shish

1. **"+ Xodim qo'shish"** tugmasini bosing
2. To'ldiring:

| Maydon | Izoh |
|--------|------|
| **Ism** | To'liq ismi |
| **Login** | Tizimga kirish uchun (unikal bo'lishi shart) |
| **Parol** | Kamida 4 ta belgi. Ko'z ikonkasi — ko'rish/yashirish |
| **Rol** | Direktor yoki Kassir |
| **Ruxsat berilgan sahifalar** | Kassir uchun — qaysi bo'limlarga kirishi mumkin |
| **Rasm** | Ixtiyoriy — sidebarда va ro'yxatda ko'rinadi |

### Kassirga ruxsat berish
Kassir uchun quyidagi bo'limlardan keraklilarini belgilang:
- ☑️ Mahsulotlar
- ☑️ Zaxira
- ☑️ Sotuvlar
- ☑️ Hisobotlar
- ☑️ Xodimlar
- ☑️ Sozlamalar

> Belgilanmagan bo'limlar kassir uchun ko'rinmaydi

### Xodimni tahrirlash
Kalem ikonkasi → login, parol, ruxsatlarni o'zgartiring

### Xodimni o'chirish
Trashcan ikonkasi → tasdiqlagandan keyin o'chadi

> ⚠️ O'chirilgan xodim tizimga kira olmaydi, lekin uning sotuv tarixi saqlanadi

---

## 8. SOZLAMALAR

Faqat **Direktor** o'zgartira oladi.

### Do'kon ma'lumotlari
| Maydon | Qaerda ishlatiladi |
|--------|-------------------|
| **Do'kon nomi** | Chek tepasida, sidebar da |
| **Manzil** | Chekda |
| **Telefon** | Chekda |
| **Logo** | Chek tepasida, sidebar da |

### Logoni yuklash
1. **"Logoni yuklash"** maydoniga bosing
2. Rasm faylini tanlang (JPG, PNG)
3. Avtomatik 200×200 px ga kesib siqiladi
4. **Saqlash** tugmasini bosing

> 💡 Har bir do'konning o'z sozlamalari alohida saqlanadi — bir do'kon sozlamasi boshqasiga ta'sir qilmaydi

---

## 9. SUPER ADMIN

`http://localhost:3001/super-admin` — alohida sahifa

### Do'konlar boshqaruvi

#### Arizalarni ko'rish
- **Kutayotgan** tab — yangi arizalar
- Ariza tafsilotlarida: egasi, telefon, manzil
- **✅ Tasdiqlash** — direktor hisobi avtomatik yaratiladi
- **❌ Rad etish** — sabab bilan

#### Tasdiqlanganda nima bo'ladi?
1. Do'kon bazasi yaratiladi
2. Direktor hisobi yaratiladi (login: telefon raqam)
3. Parol avtomatik generatsiya qilinadi
4. Parol sahifada ko'rsatiladi — **darhol xavfsiz joyga saqlang!**

#### Qo'lda do'kon qo'shish (ariza yo'q)
1. **"+ Do'kon qo'shish"** tugmasi
2. Do'kon ma'lumotlari + direktor login/parolini kiriting
3. Saqlash → darhol faol bo'ladi

### Do'kon tafsilotlari
Do'kon nomiga bosing:
- Xodimlar ro'yxati (login, rol)
- **✏️ Xodimni tahrirlash** — login, parol, rol o'zgartirish
- **+ Xodim qo'shish** — yangi kassir yoki direktor

### Do'konni bloklash
Do'kon yonidagi **"Bloklash"** — barcha xodimlar kira olmaydi

---

## 10. TEZ-TEZ SO'RALADIGAN SAVOLLAR

### ❓ Login yoki parolni unutdim
Super Adminga murojaat qiling → Super Admin `/super-admin` da parolni o'zgartira oladi.

### ❓ Kassir kerakli bo'limni ko'rmayapti
Direktor sifatida **Xodimlar** bo'limiga kiring → kassirni tahrirlang → kerakli sahifani belgilang.

### ❓ Mahsulot barcode skanerda to'g'ri chiqmayapdi
USB scanner ba'zan GS1 formatida ma'lumot yuboradi. Tizim avtomatik tozalaydi — barcode maydoni ustiga bosib `Tab` bosing, toza raqam qoladi.

### ❓ Chekda logo ko'rinmayapdi
**Sozlamalar** → Logo yuklang → Saqlang. Keyin yangi chek yoping — logo chiqadi.

### ❓ Zaxira kamayib ketdi, lekin sotuv qilmadim
**Hisobotlar → Faoliyat** bo'limini ko'ring — kim qachon zaxirani o'zgartirganini ko'rasiz.

### ❓ Kassirga Hisobotlar bo'limini ko'rsatmoqchiman
**Xodimlar** → Kassirni tahrirlang → "Hisobotlar" yonidagi toggle ni yoqing → Saqlang.

### ❓ Do'kon nomi va logosi boshqa do'konga o'tib qolyapdi
Bu eski versiyada mavjud bo'lgan muammo — **2.2.0 versiyada tuzatildi**. Har bir do'konning sozlamasi alohida saqlanadi.

### ❓ "Juda ko'p urinish" xabari chiqib qoldi
15 daqiqa kuting yoki boshqa qurilmadan kiring. Parolingizni eslab qoling.

### ❓ Faoliyat bo'limi bo'sh ko'rsatayapdi
Bu bo'lim faqat **yangi harakatlarni** yozadi. Tizim o'rnatilgandan keyingi amallar ko'rinadi — oldingi ma'lumotlar saqlanmagan.

---

## TEXNIK MA'LUMOTLAR

### Tizim talablari
- **Server:** Node.js 22+
- **Brauzer:** Chrome, Firefox, Safari, Edge (zamonaviy versiyalar)
- **Tarmoq:** Mahalliy (lokal) tarmoqda ishlaydi — internet shart emas

### Papka tuzilishi
```
pos-erp/
├── backend/
│   ├── src/           ← Server kodi
│   └── data/
│       ├── platform.db       ← Asosiy baza (do'konlar, foydalanuvchilar)
│       └── stores/
│           ├── store_1/pos.db  ← 1-do'kon bazasi
│           ├── store_2/pos.db  ← 2-do'kon bazasi
│           └── ...
└── frontend/
    └── dist/          ← Tayyor frontend fayllari
```

### Serverni ishga tushirish
```bash
cd backend
node src/server.js
# yoki ishlab chiqishda:
npm run dev
```

### Ma'lumotlar zaxirasi (Backup)
```bash
# Barcha bazalarni nusxalash
cp -r backend/data/ backup/data_$(date +%Y%m%d)/
```

> ⚠️ Har kuni backup qilish tavsiya etiladi!

---

*Muammo yoki savol bo'lsa: +998 93 429 25 99*
