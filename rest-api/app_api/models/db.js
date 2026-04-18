const mongoose = require('mongoose');
require('dotenv').config();

// İsim uyuşmazlığını önlemek için her iki ihtimali de kontrol edelim
const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!dbURI) {
    console.error("❌ HATA: MONGO_URI bulunamadı! Render panelinden Environment Variables kısmını kontrol et.");
}

mongoose.connect(dbURI)
    .then(() => {
        console.log('🚀 Mongoose veritabanına başarıyla bağlandı.');
    })
    .catch((err) => {
        console.error('❌ Mongoose bağlantı hatası: ' + err.message);
    });

// Modellerini çağırmaya devam et
require('./personel');
require('./mesai');
require('./odeme');
require('./cari');
require('./urun');
require('./uretim');
require('./kullanici');
require('./personelHareket');