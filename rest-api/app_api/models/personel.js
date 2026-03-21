const mongoose = require('mongoose');

const personelSema = new mongoose.Schema({
    mikroId: { type: String, default: null },
    adSoyad: { type: String, required: true },
    ucretTipi: { type: String, required: true, enum: ['Günlük', 'Saatlik'] },
    ucretMiktari: { type: Number, required: true },
    pozisyon: { type: String, required: true },
    bakiye: { type: Number, default: 0 },
    aktifMi: { type: Boolean, default: true },
    telefon: { type: String },
    kayitTarihi: { type: Date, default: Date.now }
});

mongoose.model('Personel', personelSema, 'personeller');