const mongoose = require('mongoose');

const urunSema = new mongoose.Schema({
    urunAdi: { type: String, required: true },
    birimFiyat: { type: Number, required: true },
    cariId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cari', required: true },
    kategori: { type: String },
    zorlukDerecesi: { type: Number, min: 1, max: 5 }
}, { collection: 'urunler' });

mongoose.model('Urun', urunSema);