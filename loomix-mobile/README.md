# Loomix ERP - Mobil Front-End (Cross-Platform)

Loomix ERP sisteminin saha operasyonları, cari takibi ve stok/model yönetimini kolaylaştırmak amacıyla geliştirilmiş cross-platform mobil uygulamasıdır. **React Native** ve **Expo** ekosistemi kullanılarak **TypeScript** mimarisiyle inşa edilmiştir. 

Uygulama, merkezi Node.js REST API servisleri ile tam senkronize şekilde çalışarak gerçek zamanlı veri akışı sağlar.

## 🚀 Teknolojik Yığın (Tech Stack)

- **Framework:** React Native (Expo SDK)
- **Dil:** TypeScript
- **State & Veri Yönetimi:** React Hooks (useState, useEffect)
- **HTTP İstemcisi:** Axios (Merkezi interceptor mimarisi)
- **Yerel Depolama:** @react-native-async-storage/async-storage (JWT Token yönetimi için)
- **Arayüz Bileşenleri:** Yerel Esnek Kutular (Flexbox), Modals, FlatList (Performanslı listeleme)

## 📌 Temel Özellikler (Features)

- **Güvenli Kimlik Doğrulama:** JWT (JSON Web Token) tabanlı oturum yönetimi ve otomatik yönlendirme interceptor yapısı.
- **Dinamik Cari (Firma) Yönetimi:** Müşteri, tedarikçi, toptancı ve fason firmalarının tam filtreleme ile listelenmesi, yeni kart açılması, güncellenmesi ve silinmesi.
- **Stok ve Model Takibi:** Akıllı arama çubuğu desteğiyle ürün/model arama, KDV oranları ve birim fiyat hesaplamaları, aktif/pasif durum yönetimi.
- **Hızlı Senkronizasyon:** Canlı bulut sunucusu (Render) veya lokal Docker konteyner ağıyla anlık entegrasyon.

## 🛠️ Kurulum ve Çalıştırma

Uygulamayı yerel geliştirme ortamınızda veya sunum modunda çalıştırmak için aşağıdaki adımları takip ediniz:

### 1. Bağımlılıkların Yüklenmesi
Proje ana dizininde terminali açarak gerekli paketleri yükleyin:
```bash
npm install