const mongoose = require('mongoose');

const personelSema = new mongoose.Schema({
    mikroId: { type: String, default: null },
    adSoyad: { type: String, required: true },
    ucretTipi: { type: String, required: true, enum: ['Günlük', 'Saatlik', 'Aylık', 'Parça Başı'] },
    ucretMiktari: { type: Number, required: true, default: 0 },
    pozisyon: { type: String }, // Örn: Usta, Kalfa
    departman: {
        type: String,
        enum: ['Makine', 'Ütü', 'Paketleme', 'Kalite Kontrol', 'Ortacı', 'Diğer'],
        default: 'Diğer'
    },
    sgkSicilNo: { type: String, default: "" },
    girisTarihi: { type: Date, default: Date.now },
    bakiye: { type: Number, default: 0 }, // İşçinin atölyeden alacağı (Tahakkuklar buraya birikecek)
    aktifMi: { type: Boolean, default: true },
    telefon: { type: String },
    kayitTarihi: { type: Date, default: Date.now }
});

// Modeli export etmeyi unutmamak için (Hata almamak adına en güvenli yöntem)
module.exports = mongoose.model('Personel', personelSema, 'personeller');