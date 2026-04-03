const mongoose = require('mongoose');

const uretimSema = new mongoose.Schema({
    urunId: { type: mongoose.Schema.Types.ObjectId, ref: 'Urun', required: true },
    adet: { type: Number, reuired: true },
    girisTipi: { type: String, enum: ['Günlük', 'Haftalık'], required: true },
    uretimTarihi: { type: Date, required: true },
    notlar: { type: String }
}, { collection: 'uretimler' });
mongoose.model('Uretim', uretimSema);
