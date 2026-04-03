const mongoose = require('mongoose');

const mesaiSema = new mongoose.Schema({
    personelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personel', required: true },
    calisilanSaat: { type: Number, required: true },
    tarih: { type: Date, default: Date.now },
    oAnkiMaas: { type: Number },
    toplamKazanc: { type: Number }
});

mongoose.model('Mesai', mesaiSema, 'mesailer');