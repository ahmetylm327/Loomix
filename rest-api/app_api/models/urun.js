const mongoose = require('mongoose');

const urunSema = new mongoose.Schema({
    stokKodu: { type: String, required: true, unique: true },
    barkod: { type: String, default: '' }, // YENİ: Barkod okuyucu ve hızlı fatura için
    urunAdi: { type: String, required: true },
    birimFiyat: { type: Number, required: true },
    kdvOrani: { type: Number, default: 10 }, // YENİ: Tekstil genelinde %10 KDV kullanılır
    birim: { type: String, default: 'Adet' },
    cariId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cari', required: true },
    zorlukDerecesi: { type: Number, min: 1, max: 5, default: 1 },
    aktifMi: { type: Boolean, default: true } // YENİ: Sezonu biten ürünleri silmek yerine pasife almak için
}, {
    collection: 'urunler',
    timestamps: true // YENİ: Ne zaman eklendiğini/güncellendiğini otomatik tutar
});

module.exports = mongoose.model('Urun', urunSema);