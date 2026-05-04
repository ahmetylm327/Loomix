const mongoose = require('mongoose');

const uretimSema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Urun',
        required: true
    },
    // 🚀 BÜYÜK EKSİK GİDERİLDİ: Artık malın kime dikildiğini biliyoruz!
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

// Eğer model zaten tanımlıysa tekrar tanımlamamak için güvenlik önlemi
module.exports = mongoose.models.Uretim || mongoose.model('Uretim', uretimSema, 'uretimler');