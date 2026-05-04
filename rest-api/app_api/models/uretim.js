const mongoose = require('mongoose');

const uretimSema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Urun',
        required: true
    },
    cariId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cari',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    // 🚀 BÜYÜK YENİLİK: Her fişin kendine özel, o anki birim fiyatı!
    birimFiyat: {
        type: Number,
        required: true,
        min: 0
    },
    entryType: {
        type: String,
        enum: ['Günlük', 'Haftalık'],
        required: true
    },
    productionDate: {
        type: Date,
        required: true
    },
    notes: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.models.Uretim || mongoose.model('Uretim', uretimSema, 'uretimler');