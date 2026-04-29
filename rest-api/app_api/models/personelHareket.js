const mongoose = require('mongoose');

const personelHareketSema = new mongoose.Schema({
    personelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personel', required: true },
    islemTarihi: { type: Date, default: Date.now },
    islemTipi: {
        type: String,
        enum: ['Hakediş', 'Ödeme', 'Avans', 'Prim', 'Avans İadesi'], // 🚀 İŞTE BURAYA EKLENDİ
        required: true
    },
    aciklama: { type: String },
    tutar: { type: Number, required: true }, // (+) Hakedişler/İadeler, (-) Ödemeler/Avanslar
    bakiyeSonrasi: { type: Number } // İşlemden sonraki anlık bakiye (Raporlama kolaylığı için)
});

module.exports = mongoose.model('PersonelHareket', personelHareketSema, 'personelhareketleri');