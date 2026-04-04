# 🚀 Loomix Backend - REST API Dokümantasyonu

Bu doküman, Loomix projesinin Render üzerinde çalışan canlı API servislerini ve kullanım detaylarını içerir.

## 🌍 Canlı Sunucu Bilgileri
- **API Base URL:** `https://loomix-xlp4.onrender.com/api`
- **Veritabanı:** MongoDB Atlas (Cloud)
- **Barındırma:** Render.com

## 🛠️ Temel Endpoint'ler (Rotalar)

### 1. Personel Yönetimi
- **Listeleme (GET):** `/employees`
- **Ekleme (POST):** `/employees`
- **Güncelleme (PUT):** `/employees/:employeeId`

### 2. Üretim ve Stok
- **Üretim Kaydı (POST):** `/production`
- **Ürün Tanımlama (POST):** `/products`

### 3. Yapay Zeka Destekli Tahmin
- **Tahmin Motoru (POST):** `/estimates/ai-forecast`
  - *Açıklama:* Geçmiş üretim verilerini analiz ederek gelecek dönem tahminlerini döner.

### 4. Raporlama
- **Genel Rapor (GET):** `/reports`
  - *Parametreler:* `type`, `startDate`, `endDate`

## 🧪 Postman Testleri
Proje klasöründe bulunan `My Collection.postman_collection.json` dosyası Postman uygulamasına import edilerek tüm servisler canlı ortamda test edilebilir.