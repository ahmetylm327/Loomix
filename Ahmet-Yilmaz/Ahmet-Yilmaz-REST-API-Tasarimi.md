# API Tasarımı

Aşağıdaki bağlantı üzerinden projemizin OpenAPI 3.0 standartlarındaki tasarım dosyasına erişebilirsiniz:
**YAML Dosya Bağlantısı:** [Loomix API Tasarımı (YAML İndir)](https://raw.githubusercontent.com/ahmetylm327/Loomix/refs/heads/main/loomix-api.yaml)

---

### API Tasarımı İçeriği (YAML Formatı)

openapi: 3.0.0
info:
  title: Loomix API - Fason Takip ve Hakediş Sistemi
  version: 1.0.0
  description: >-
    Tekstil atölyeleri için personel yönetimi, hakediş hesaplama ve AI destekli
    maliyet tahmin sistemi API tasarımı.
  contact:
    name: Ahmet Yılmaz
    email: ahmetylm327@gmail.com
    url: https://github.com/ahmetylm327/Loomix
paths: 
  /auth/login:
    post:
      summary: Sisteme Giriş Yapma
      description: Kullanıcı adı ve şifre ile sisteme erişim sağlar.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                  example: "ahmet_admin"
                password:
                  type: string
                  format: password
                  example: "123456"
      responses:
        '200':
          description: Başarılı Giriş
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                    example: "abc123token"
        '401':
          description: Hatalı Kimlik Bilgileri
  /employees:
    post:
      summary: Yeni Personel Kaydı Oluşturma
      description: Atölyeye yeni katılan çalışanların kimlik, görev ve yevmiye  bilgilerini sisteme ekler.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [fullname, daily_wage, position]
              properties:
                fullname:
                  type: string
                  example: "Alican Umut"
                daily_wage:
                  type: number
                  description: "Günlük yevmiye tutarı(TL)"
                  example: 500.50
                position: 
                  type: string
                  enum: [Dikişçi, Ütücü, Kesimci, Kalite Kontrol, Paketleme]
                  example: "Dikişçi"
                phoneNumber:
                  type: string
                  example: "1234567890"
      responses:
        '201':
          description: Personel Başarıyla Oluşturuldu
          content:
            application/json:
              schema:
                type: object
                properties: 
                  employeeId:
                    type: integer
                    example: 101
                  status:
                    type: string
                    example: "Başarılı"
        '400':
          description: Geçersiz Veri Girişi
    get:
      summary: Personel Listesini Görüntüleme
      description: Kayıtlı tüm personelin listesini, pozisyonlarını ve güncel hakediş bakiyelerini getirir.
      parameters: 
        - name: position
          in: query
          required: false
          description: "Sadece belli bir pozisyondaki işçileri filtreler"
          schema: 
            type: string
            enum: [Dikişçi, Ütücü, Kesimci, Kalite Kontrol, Paketleme]
      responses: 
        '200':
          description: Başarılı Liste Çekimi
          content:
            application/json: 
              schema: 
                type: array
                items: 
                  type: object
                  properties: 
                    employeeId:
                      type: integer
                      example: 1
                    fullname:
                      type: string
                      example: "Burak Yılmaz"
                    position: 
                      type: string
                      example: "Dikişçi"
                    daily_wage:
                      type: number
                      example: 500.00
                    balance:
                      type: number
                      description: "İşçinin içeride kalan toplam hakedişi"
                      example: 1250.75
  /employees/{employeeId}:
    put:
      summary: Personel Bilgilerini Güncelleme
      description: Belirli bir personelin isim, yevmiye veya pozisyon (bölüm) bilgilerini günceller.
      parameters:
        - name: employeeId
          in: path
          required: true
          description: Güncellenecek personelin benzersiz ID'si
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                fullname:
                  type: string
                  example: "Burak Aslan"
                daily_wage:
                  type: number
                  example: 600.00
                position:
                  type: string
                  enum: [Dikişçi, Ütücü, Kesimci, Kalite Kontrol, Paketleme]
                  example: "Ütücü"
                phoneNumber:
                  type: string
                  description: "personelin güncel telefon numarası"
                  example: "0987654321"
      responses:
        '200':
          description: Güncelleme Başarılı
          content:
            application/json:
              schema:
                type: object
                properties: 
                  status:
                    type: string
                    example: "Personel bilgileri ve iletişim numarası güncellendi."
                  updatedEmployee:
                    type: object
                    properties: 
                      employeeId:
                        type: integer
                      fullname:
                        type: string
                      phoneNumber:
                        type: string
                      position:
                        type: string
                      daily_wage:
                        type: number 
        '400':
          description: Geçersiz Veri Formatı
        '404': 
          description: Personel Bulunamadı (Geçersiz veya silinmiş ID)
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    example: "Girdiğiniz ID numarasına ait bir çalışan kaydı mevcut değil."
    delete:
      summary: Personel Kaydını Silme
      description: İşten ayrılan personeli sistemde pasif duruma getirerek verileri arşivler.
      parameters:
        - name: employeeId
          in: path
          required: true
          description: Silinecek personelin benzersiz ID'si
          schema:
            type: integer
      responses: 
        '204':
          description: Personel Başarıyla Silindi
        '404':
          description: Personel Bulunamadı
  /attendance/upload:
    post:
      summary: Çalışma Verilerini Yükleme
      description: Mikro yazılımından alınan Excel/CSV formatındaki personel devam verilerini sisteme aktarır.
      requestBody: 
        required: true
        content: 
          multipart/form-data: 
            schema: 
              type: object
              required: [file]
              properties: 
                file:
                  type: string
                  format: binary
                  description: Yüklenecek çalışma verisi dosyası
                period:
                  type: string
                  example: "23 mart 2026"
      responses: 
        '202':
          description: Dosya başarıyla alındı ve işleme kuyruğuna eklendi.
          content:
            application/json:
              schema:
                type: object
                properties: 
                  jobId:
                    type: string
                    example: "upload_123"
        '400':
          description: Hatalı istek (Dosya eksik veya boş)
        '415':
          description: Desteklenmeyen Dosya Formatı
  /payroll/{employeeId}/calculate:
    post:
      summary: Personel Hakediş Hesaplama
      description: Personelin belirli bir dönemdeki (Haftalık/Aylık) çalışma verilerini işleyerek toplam hakediş sonucunu üretir.
      parameters:
        - name: employeeId
          in: path
          required: true
          description: Hakedişi hesaplanacak personelin benzersiz ID'si
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [calculation_date, period_type]
              properties:
                calculation_date:
                  type: string
                  format: date
                  example: "2026-03-01"
                period_type:
                  type: string
                  enum: [Haftalık, Aylık]
                  example: "Aylık"
      responses:
        '200':
          description: Hesaplama Başarılı
          content:
            application/json:
              schema:
                type: object
                properties:
                  fullname:
                    type: string
                    example: "Ahmet Yılmaz"
                  days_worked:
                    type: integer
                    example: 22
                  daily_wage_at_time:
                    type: number
                    example: 500.00
                  total_earnings:
                    type: number
                    example: 12500.50
                  currency:
                    type: string
                    default: "TL"
        '404':
          description: Personel Bulunamadı
        '422':
          description: Hesaplama Yapılamadı (İlgili döneme ait Mikro verisi bulunamadı)
  /caris:
    post:
      summary: Yeni Firma (Cari) Kaydı OLuşturma
      description: Sisteme yeni bir tedarikçi veya müşteri kartı açar. Firmanın vergi no ve iletişim bilgilerini kaydeder.
      requestBody: 
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [company_name, tax_number, category]
              properties: 
                company_name:
                  type: string
                  example: "Isparta iplik A.Ş."
                tax_number:
                  type: string
                  minLength: 10
                  maxLength: 10
                  example: "1234567890"
                category:
                  type: string
                  enum: [Tedarikçi,Müşteri,Fason Takip]
                  example: "Tedarikçi"
                phone:
                  type: string
                  example: "02462111111"
                initial_balance:
                  type: number
                  description: "Varsa devreden eski bakiye"
                  example: 0.00
      responses:
        '201':
          description: Firma Kaydı Başarıyla Oluşturuldu
          content: 
            application/json: 
              schema: 
                type: object
                properties: 
                  cariId:
                    type: integer
                    example: 501
                  status:
                    type: string
                    example: "Kayıt Oluşturuldu"
        '400':
          description: Geçersiz Veri (Eksik Vergi No veya İsim)
  /products:
    post:
      summary: Yeni Ürün Tanımlama
      description: Atölyede üretilecek olan yeni bir modelin (tişört,pantolon vb.) dikim bedelini, özelliklerini ve hangi müşteriye ait olduğunu sisteme kaydeder.
      requestBody: 
        required: true
        content:
          application/json: 
            schema: 
              type: object
              required: [product_name, unit_price, cariId]
              properties: 
                product_name:
                  type: string
                  example: "Basic V-Yaka Tişört"
                unit_price:
                  type: number
                  description: "Adet başı dikim bedeli (TL)"
                  example: 45.50
                cariId:
                  type: integer
                  description: "Bu modelin sahibi olan müşteri ID'si"
                  example: 501
                category:
                  type: string
                  enum: [Üst Giyim, Alt Giyim, Aksesuar]
                  example: "Üst Giyim"
                difficulty_level:
                  type: integer
                  minimum: 1
                  maximum: 5
                  example: 3
      responses: 
        '201':
          description: Ürün Başarıyla Tanımlandı
          content: 
            application/json: 
              schema: 
                type: object
                properties: 
                  productId:
                    type: integer
                    example: 601
                  status:
                    type: string
                    example: "Model Tanımlandı"
        '400':
          description: Geçersiz Veri Formatı
  /production:
    post:
      summary: Üretim Adedi Girişi
      description: Atölyede tamamlanan toplam ürün adetlerini model bazlı olarak sisteme işler.
      requestBody:
        required: true
        content: 
          application/json: 
            schema: 
              type: object
              required: [productId, quantity, entryType, productionDate]
              properties: 
                productId:
                  type: integer
                  description: "Dikimi tamamlanan ürünün ID'si"
                  example: 12
                quantity:
                  type: integer
                  description: "Banttan çıkan toplam sağlam ürün adedi"
                  example: 1250
                entryType:
                  type: string
                  enum: [Günlük, Haftalık]
                  example: "Günlük"
                productionDate:
                  type: string
                  format: date
                  description: "Üretimin gerçekleştiği tarih"
                  example: "2026-03-09"
                notes:
                  type: string
                  description: "Vardiya veya parti numarası notu"
                  example: "A Grubu Gündüz Vardiyası"
      responses: 
        '201':
          description: Üretim Verisi Başarıyla Kaydedildi
          content:
            application/json:
              schema:
                type: object
                properties:
                  productionId:
                    type: integer
                    example: 2001
        '404':
          description: Ürün Bulunamadı (Geçersiz productId)
  /payments:
    post:
      summary: Ödeme Kaydı Girme
      description: Kasaya giren (Tahsilat) veya kasadan çıkan (Ödeme) tüm nakit hareketlerini sisteme işler.
      requestBody: 
        required: true
        content: 
          application/json: 
            schema: 
              type: object
              required: [transactionType, paymentType, amount, category, paymentDate]
              properties: 
                transactionType:
                  type: string
                  description: "İşlemin yönü (Kasaya giriş mi, çıkış mı?)"
                  enum: [Gelir, Gider]
                  example: "Gelir"
                paymentType:
                  type: string
                  enum: [Nakit, Havale, Kredi Kartı]
                  example: "Havale"
                amount:
                  type: number
                  minimum: 0.01
                  description: "İşlem tutarı (TL)"
                  example: 50000.00
                category:
                  type: string
                  description: "Gelir ise 'Hizmet Bedeli', Gider ise 'Tedarikçi/Personel' seçilir."
                  enum: [Tedarikçi, Personel Avans, Fatura, Hizmet Bedeli, Diğer]
                  example: "Hizmet Bedeli"
                relatedId:
                  type: integer
                  description: "İlgili Cari veya Personel ID'si"
                  example: 501
                paymentDate:
                  type: string
                  format: date
                  example: "2026-03-09"
                notes:
                  type: string
                  example: "Mart ayı fason dikim tahsilatı"
      responses: 
        '201':
          description: İşlem Başarıyla Kaydedildi
          content:
            application/json:
              schema: 
                type: object
                properties: 
                  transactionId:
                    type: integer
                    example: 805
                  status:
                    type: string
                    example: "Finansal hareket işlendi."
                  currentCashBalance: # Ekstra: Kasanın son durumu
                    type: number
                    description: "İşlem sonrası güncel kasa mevcudu"
                    example: 125400.50
        '400':
          description: Hatalı Veri (Eksik alan, negatif tutar veya geçersiz tarih)
        '404':
          description: İlgili Kayıt Bulunamadı (Geçersiz relatedId)
  /reports:
    get:
      summary: Rapor Alma
      description: Seçilen türe göre personellerin üretim performansını, kasanın finansal durumunu veya her ikisinin özetini getirir.
      parameters: 
        - name: reportType
          in: query
          required: true
          description: "Almak istediğiniz rapor türünü seçin"
          schema: 
            type: string
            enum: [Performans, Finans ,Genel]
            example: "Genel"
        - name: startDate
          in: query
          required: true
          schema: 
            type: string
            format: date
            example: "2026-03-01"
        - name: endDate
          in: query
          required: true
          schema: 
            type: string
            format: date
            example: "2026-03-31"
      responses: 
        '200':
          description: Rapor Başarıyla Hazırlandı
          content: 
            application/json:
              schema: 
                type: object
                properties: 
                  reportTitle:
                    type: string
                    example: "Haftalık Genel Değerlendirme Raporu"
                  productionData:
                    type: object
                    description: "Sadece Performans veya Genel seçilirse dolar"
                    properties: 
                      totalItemsProduced:
                        type: integer
                        example: 15440
                      mostProducedProduct:
                        type: string
                        example: "V-Yaka Tişört"
                  financialData:
                    type: object
                    description: "Sadece Finans veya Genel seçilirse dolar"
                    properties: 
                      totalIncome:
                        type: number
                        example: 250000.00
                      totalExpenses:
                        type: number
                        example: 185000.00
                      netBalance:
                        type: number
                        example: 65000.00
        '400':
          description: Hatalı Parametre veya Tarih Aralığı
  /estimates/ai-forecast:
    post:
      summary: Maaliyet Tahmini Yapma
      description: Geçmiş üretim verilerini ve gider trendlerini analiz ederek ; gelecek hafta, ay veya yıl için tahmini üretim kapasitesi ve net kar marjı projeksiyonu sunar.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [forecastPeriod, confidenceLevel]
              properties:
                forecastPeriod:
                  type: string
                  description: "Tahmin yapılacak zaman dilimi"
                  enum: [gelecekHafta, gelecekAy, gelecekYıl]
                  example: "gelecekAy"
                confidenceLevel:
                  type: number
                  description: "Analiz hassasiyeti (1-100) arası"
                  minimum: 1
                  maximum: 100
                  example: 95
                includeSeasonality:
                  type: boolean
                  description: "Mevsimsel iş yoğunluk farkları hesaba katılsın mı?"
                  default: true
      responses:
        '200':
          description: Yapay zeka analizi tamamlandı
          content:
            application/json:
              schema:
                type: object
                properties:
                  predictedProductionVolume:
                    type: integer
                    description: "Tahimn edilen toplam dikim adedi"
                    example: 8700
                  estimatedGrossRevenue:
                    type: number
                    description: "Birim fiyatlar üzerinden beklenen brüt gelir"
                    example: 954000.00
                  projectedExpenses:
                    type: number
                    description: "Trend analizine göre beklenen toplam gider"
                    example: 60000.00
                  aiProfitMargin:
                    type: string
                    description: "Yapay zeka tarafından hesaplanan tahmini net kar marjı"
                    example: "%76"
                  confidenceScore:
                    type: string
                    description: "Tahmini güvenirlik oranı"
                    example: "%91"
        '422':
          description: Yetersiz veri
          content: 
            application/json:
              schema:
                type: object
                properties: 
                  error:
                    type: string
                    example: "Abaliz için son 4 haftaya ait üretim verisi eksik"
servers:
  # Added by API Auto Mocking Plugin
  - description: SwaggerHub API Auto Mocking
    url: https://virtserver.swaggerhub.com/loomix/Loomix-API-Tasarimi/1.0.0
