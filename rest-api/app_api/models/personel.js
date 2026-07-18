const mongoose = require('mongoose');

const personelSema = new mongoose.Schema({
    mikroId: { type: String, default: null },
    adSoyad: { type: String, required: true },
    ucretTipi: { type: String, required: true, enum: ['Günlük', 'Saatlik', 'Aylık', 'Parça Başı'] },
    ucretMiktari: { type: Number, required: true, default: 0 },
    pozisyon: { type: String }, 
    departman: {
        type: String,
        enum: ['Makine', 'Ütü', 'Paketleme', 'Kalite Kontrol', 'Ortacı', 'Diğer'],
        default: 'Diğer'
    },
    // 🚀 YENİ EKLENEN ALAN: Personelin resmiyet durumu
    kayitDurumu: { 
        type: String, 
        enum: ['Resmi', 'Geçici'], 
        default: 'Resmi' 
    },
    sgkSicilNo: { type: String, default: "" },
    girisTarihi: { type: Date, default: Date.now },
    bakiye: { type: Number, default: 0 }, 
    aktifMi: { type: Boolean, default: true },
    telefon: { type: String },
    kayitTarihi: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Personel', personelSema, 'personeller');