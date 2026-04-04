const mongoose = require('mongoose');

const cariSema = new mongoose.Schema({
    firmaAdi: { type: String, required: true },
    vergiNo: { type: String },
    kategori: { type: String, required: true },
    telefon: { type: String },
    bakiye: { type: Number, default: 0 }
}, { collection: 'cariler' });

mongoose.model('Cari', cariSema);