## Loomix - Gereksinim Analizi Detayları





1\. Sisteme Giriş Yapma

API Metodu: POST /auth/login



Açıklama: Yöneticilerin kullanıcı adı ve şifre ile sisteme güvenli erişim sağlamasını kontrol eder. Başarılı girişte bir oturum token'ı oluşturur.



2\. Personel Kaydı Oluşturma

API Metodu: POST /employees



Açıklama: Atölyeye yeni katılan çalışanların ad, soyad ve günlük yevmiye gibi temel bilgilerini sisteme kaydederek veritabanına ekler.



3\. Personel Listesini Görüntüleme

API Metodu: GET /employees



Açıklama: Kayıtlı tüm personelin listesini, departman bilgilerini ve güncel finansal bakiyelerini tablo şeklinde kullanıcıya sunar.



4\. Personel Bilgilerini Güncelleme

API Metodu: PUT /employees/{employeeId}



Açıklama: Belirli bir personelin yevmiye artışı, departman değişikliği veya iletişim bilgisi gibi verilerinin güncellenmesini sağlar.



5\. Personel Kaydını Silme

API Metodu: DELETE /employees/{employeeId}



Açıklama: İşten ayrılan personelin hesabını sistemden kalıcı olarak silmez, veri bütünlüğü için pasif duruma getirerek arşivler.



6\. Çalışma Verilerini Yükleme

API Metodu: POST /attendance/upload



Açıklama: Parmak izi cihazından alınan puantaj verilerini içeren CSV veya Excel dosyalarını sisteme toplu olarak aktarır.



7\. Hakediş Hesaplama

API Metodu: POST /payroll/calculate



Açıklama: Yüklenen çalışma saatlerini personelin tanımlı yevmiyesi ile çarparak haftalık hakediş tutarlarını otomatik olarak hesaplar.



8\. Firma (Cari) Kaydı Oluşturma

API Metodu: POST /caris



Açıklama: İplikçi veya kumaş tedarikçisi gibi ticari paydaşların sistem üzerinde cari kartlarını oluşturarak finansal takibe başlar.



9\. Ürün Tanımlama

API Metodu: POST /products



Açıklama: Atölyede dikilen yeni modellerin (Gömlek, Tişört vb.) ve parça başı dikim maliyetlerinin sisteme girişini sağlar.



10\. Üretim Adeti Girme

API Metodu: POST /production/logs



Açıklama: Günlük tamamlanan ürün miktarlarını model bazında üretim geçmişine işleyerek verimlilik takibi yapılmasını sağlar.



11\. Ödeme Kaydı Girme

API Metodu: POST /payments



Açıklama: Personele yapılan ödemeleri veya masrafları, açıklayıcı notlar eklenerek kasadan düşer ve personel bakiyesini günceller.



12\. Rapor Alma

API Metodu: GET /reports/summary



Açıklama: Belirli tarih aralıkları için tüm hakediş, ödeme ve üretim verilerini içeren detaylı analiz raporları üretir.



13\. Yapay Zeka Maliyet Tahmini

API Metodu: GET /ai/forecast



Açıklama: Geçmiş üretim ve masraf verilerini analiz ederek gelecek haftanın tahmini personel maliyetlerini ve bütçe öngörüsü sunar.

