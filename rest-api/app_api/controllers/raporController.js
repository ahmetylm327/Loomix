const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');

// index.js'deki "router.get('/reports', ctrlRapor.raporAl);" satırı hata vermesin diye eklendi.
const raporAl = async (req, res) => {
    try {
        res.status(200).json({ mesaj: "Genel raporlar servisi çalışıyor." });
    } catch (error) {
        res.status(500).json({ hata: error.message });
    }
};

// Bizim asıl PDF ve Excel şovu yapacağımız gelişmiş fonksiyon
const gelismisBordroRaporu = async (req, res) => {
    try {
        const personeller = await Personel.find({ aktifMi: true }).sort({ bakiye: -1 });

        let toplamBorc = 0;
        const detayliListe = personeller.map(p => {
            toplamBorc += (p.bakiye || 0);
            return {
                id: p._id,
                adSoyad: p.adSoyad,
                departman: p.departman || 'Belirtilmemiş',
                ucretTipi: p.ucretTipi || 'Günlük',
                yevmiye: p.ucretMiktari || 0,
                bakiye: p.bakiye || 0
            };
        });

        res.status(200).json({
            olusturmaTarihi: new Date(),
            toplamPersonel: detayliListe.length,
            toplamOdenecek: toplamBorc,
            liste: detayliListe
        });

    } catch (error) {
        res.status(500).json({ mesaj: "Rapor oluşturulamadı", hata: error.message });
    }
};

// İKİSİNİ DE EXPORT EDİYORUZ Kİ EXPRESS HATA VERMESİN
module.exports = { raporAl, gelismisBordroRaporu };