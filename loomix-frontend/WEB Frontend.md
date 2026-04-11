# 💻 Loomix ERP - Web Frontend Dokümantasyonu

Bu doküman, Loomix ERP projesinin kullanıcı arayüzü (UI) geliştirme detaylarını, kullanılan mimariyi ve canlı yayın bilgilerini içerir.

## 🌍 Canlı Yayın Bilgileri
**Canlı Site Linki:** https://loomix-panel.onrender.com
*(Proje, Render Static Site üzerinde "Continuous Deployment" mekanizması ile canlıda tutulmaktadır.)*

## 🎥 YouTube Kanıt Videosu
**Video Linki:** [BURAYA YOUTUBE LİNKİNİ YAPIŞTIR]
*(Videoda login süreci, CRUD işlemleri ve arayüzün backend ile olan entegrasyonu gösterilmiştir.)*

## 🛠️ Kullanılan Teknolojiler & Kütüphaneler
* **Framework:** React.js (Vite/CRA)
* **State Management:** React Hooks (useState, useEffect)
* **Routing:** React Router DOM (v6)
* **HTTP Client:** Axios (Backend entegrasyonu için)
* **Styling:** CSS3 / Tailwind CSS (Modern ve Responsive Tasarım)
* **Icons:** Lucide-React / FontAwesome

## 🧩 Geliştirilen Temel Modüller

### 1. Kimlik Doğrulama (Auth)
- **Login Ekranı:** Kullanıcı adı ve şifre ile giriş.
- **Session Yönetimi:** Başarılı girişte alınan JWT Token'ın tarayıcıda (LocalStorage) saklanması ve yetkisiz erişimlerin engellenmesi.

### 2. Dashboard & Veri Yönetimi
- **Personel Takip:** Personel ekleme, listeleme, güncelleme ve silme (CRUD) arayüzleri.
- **Stok & Üretim:** Üretim verilerinin girilebildiği ve stok durumunun izlenebildiği tablolar.
- **AI Tahmin Görselleştirme:** Backend'den gelen tahmin verilerinin kullanıcıya sunulması.

## ⚙️ Kurulum ve Çalıştırma (Yerel Ortam)
Projeyi kendi bilgisayarınızda çalıştırmak için:
1. `npm install` (Bağımlılıkları yükler)
2. `npm start` veya `npm run dev` (Geliştirme sunucusunu başlatır)

## 🧪 Dağıtım (Deployment) Detayları
Proje Render üzerinde dağıtılırken aşağıdaki ayarlar kullanılmıştır:
- **Build Command:** `npm run build`
- **Publish Directory:** `dist` (veya build)
- **SPA Routing:** `/* -> /index.html` (Rewrite kuralı uygulanmıştır)