const mongoose = require('mongoose');

const odemeSema = new mongoose.Schema({
    islemYonu: { type: String, enum: ['Gelir', 'Gider', 'MalAlimi'], required: true },
    odemeTipi: { type: String, required: false, default: 'Nakit' },
    tutar: { type: Number, required: true, min: 0.01 },
    kategori: { type: String, required: true },
    ilgiliId: { type: mongoose.Schema.Types.ObjectId },
    odemeTarihi: { type: Date, required: true },
    notlar: { type: String }
}, { collection: 'odemeler' });

mongoose.model('Odeme', odemeSema);