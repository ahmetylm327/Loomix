const mongoose = require('mongoose');

const kullaniciSema = new mongoose.Schema({
    kullaniciAdi: { type: String, required: true, unique: true },
    sifre: { type: String, required: true },
    rol: { type: String, default: 'admin' }
});

mongoose.model('Kullanici', kullaniciSema, 'kullanicilar');