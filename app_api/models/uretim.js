const mongoose = require('mongoose');

const uretimSema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Urun', // Ürünler tablosuyla ilişkilendirdik
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

mongoose.model('Uretim', uretimSema, 'uretimler');