# 🚀 Loomix Backend - REST API Dokümantasyonu

Bu doküman, Loomix ERP projesinin Render üzerinde çalışan canlı API servislerini ve kullanım detaylarını içerir.

## 🌍 Canlı Sunucu Bilgileri
**Canlı Sistem Linki:** https://loomix-xlp4.onrender.com

> **Not:** API istekleri için temel dizin (Base URL) `/api` ekini kullanmaktadır. 
> Örn: `https://loomix-xlp4.onrender.com/api/employees`

## 🎥 YouTube Kanıt Videosu
**Video Linki:** [BURAYA YOUTUBE LİNKİNİ YAPIŞTIR]
*(Videoda sistemin canlı ortamda çalıştığı, Postman testleri ve veritabanı bağlantısı kanıtlanmıştır.)*

## 🛠️ Kullanılan Teknolojiler
* **Runtime:** Node.js & Express.js
* **Veritabanı:** MongoDB Atlas (Cloud)
* **Güvenlik:** JWT (JSON Web Token) & Bcrypt (Şifreleme)
* **Deployment:** Render (Web Service)

## 📡 Temel Endpoint'ler (Rotalar)

### 1. Kimlik Doğrulama (Auth)
- **Giriş Yap (POST):** `/api/login`
  - *Girdi:* `{ "username", "password" }` -> *Çıktı:* `Token`

### 2. Personel Yönetimi (CRUD)
- **Listeleme (GET):** `/api/employees`
- **Ekleme (POST):** `/api/employees`
- **Güncelleme (PUT):** `/api/employees/:employeeId`
- **Silme (DELETE):** `/api/employees/:employeeId`

### 3. Üretim ve Stok Modülü
- **Üretim Kaydı (POST):** `/api/production`
- **Ürün Tanımlama (POST):** `/api/products`

### 4. Yapay Zeka Destekli Tahmin & Raporlama
- **AI Tahmin Motoru (POST):** `/api/estimates/ai-forecast`
- **Genel Raporlar (GET):** `/api/reports` (Params: `type`, `startDate`, `endDate`)

## 🧪 Postman Testleri
Proje ana dizininde bulunan **`My Collection.postman_collection.json`** dosyası Postman uygulamasına "Import" edilerek tüm servisler canlı ortamda (Render) test edilebilir.