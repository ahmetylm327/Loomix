const mongoose = require('mongoose');

const cariSema = new mongoose.Schema({
    // BURASI ÇOK ÖNEMLİ: Mikro mantığı için bu kod şart!
    cariKodu: { type: String, required: true, unique: true },

    firmaAdi: { type: String, required: true },
    vergiDairesi: { type: String }, // Bunu ekledik
    vergiNo: { type: String },

    // Senin eski alanların
    kategori: { type: String, default: 'Genel' },
    telefon: { type: String },
    email: { type: String }, // Bunu ekledik
    bakiye: { type: Number, default: 0 }
}, {
    collection: 'cariler',
    timestamps: true // Kayıt ne zaman açıldı, ne zaman güncellendi otomatik tutar
});


// Model ismini dışarı aktarırken hata almamak için şu standart yolu kullanalım:
module.exports = mongoose.model('Cari', cariSema);