## Loomix - Gereksinim Analizi Detayları
Bu döküman, Loomix sisteminin fonksiyonel gereksinimlerini ve teknik detaylarını içerir.

#### 1.Sisteme Giriş Yapma
##### API Metodu: POST /auth/login

Açıklama: Yöneticilerin kullanıcı adı ve şifre ile sisteme güvenli erişim sağlamasını kontrol eder. Başarılı girişte bir oturum token'ı oluşturur.

#### 2.  Personel Kaydı Oluşturma
##### API Metodu: POST /employees

Açıklama: Atölyeye yeni katılan çalışanların temel bilgilerini ve yevmiyelerini sisteme kaydederek veritabanına ekler.

#### 3. Personel Listesini Görüntüleme
##### API Metodu: GET /employees

Açıklama: Kayıtlı tüm personelin listesini, departmanlarını ve güncel bakiyelerini tablo şeklinde sunar.

#### 4. Personel Bilgilerini Güncelleme
##### API Metodu: PUT /employees/{employeeId}

Açıklama: Personel yevmiye artışı veya departman değişikliği gibi verilerin güncellenmesini sağlar.

#### 5. Personel Kaydını Silme
##### API Metodu: DELETE /employees/{employeeId}

Açıklama: İşten ayrılan personeli sistemde pasif duruma getirerek verileri arşivler.

#### 6. Çalışma Verilerini Yükleme
##### API Metodu: POST /attendance/upload

Açıklama: Parmak izi cihazından alınan puantaj verilerini içeren dosyaları sisteme toplu olarak aktarır.

#### 7. Hakediş Hesaplama
##### API Metodu: POST /payroll/calculate

Açıklama: Çalışma saatleri ve yevmiye verilerini eşleştirerek hakediş tutarlarını otomatik hesaplar.

#### 8. Firma (Cari) Kaydı Oluşturma
##### API Metodu: POST /caris

Açıklama: Tedarikçi veya fason iş veren paydaşların sistem üzerinde cari kartlarını oluşturur.

#### 9. Ürün Tanımlama
##### API Metodu: POST /products

Açıklama: Üretilen modellerin ve parça başı dikim maliyetlerinin sisteme girişini sağlar.

#### 10. Üretim Adeti Girme
##### API Metodu: POST /production/logs

Açıklama: Tamamlanan ürün miktarlarных model bazında sisteme işleyerek verimlilik takibi yapar.

#### 11. Ödeme Kaydı Girme
##### API Metodu: POST /payments

 Açıklama: Personele yapılan ödemeleri veya avansları kasadan düşerek bakiye günceller.

#### 12. Rapor Alma
##### API Metodu: GET /reports/summary

 Açıklama: Tarih bazlı hakediş, ödeme ve üretim verilerini analiz raporu olarak sunar.

#### 13. Yapay Zeka Maliyet Tahmini
##### API Metodu: *GET /ai/forecast*

 Açıklama: Geçmiş verileri analiz ederek gelecek haftanın tahmini personel maliyetlerini öngörür.