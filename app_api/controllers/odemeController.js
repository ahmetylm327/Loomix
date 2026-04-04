const mongoose = require('mongoose');
const Odeme = mongoose.model('Odeme');

const Cari = mongoose.model('Cari');
const Personel = mongoose.model('Personel');

const odemeEkle = async (req, res) => {
    try {
        const { transactionType, paymentType, amount, category, relatedId, paymentDate, notes } = req.body;
        if (amount < 0.01) {
            return res.status(400).json({ description: "Hatalı Veri: Ttuar negatif veya sıfır olamaz." });
        }
        if (relatedId) {
            const cariKayit = await Cari.findById(relatedId).catch(() => null);
            const personelKayit = await Personel.findById(relatedId).catch(() => null);

            if (!cariKayit && !personelKayit) {
                return res.status(404).json({ description: "İlgili Kayıt Bulunamadı (Geçersiz relatedId)" });
            }
        }

        const yeniOdeme = await Odeme.create({
            islemYonu: transactionType,
            odemeTipi: paymentType,
            tutar: amount,
            kategori: category,
            ilgiliId: relatedId,
            odemeTarihi: paymentDate,
            notlar: notes
        });

        const tumOdemeler = await Odeme.find();
        let guncelKasa = 0;
        tumOdemeler.forEach(odeme => {
            if (odeme.islemYonu === 'Gelir') guncelKasa += odeme.tutar;
            if (odeme.islemYonu === 'Gider') guncelKasa -= odeme.tutar;
        });

        res.status(201).json({
            transactionId: yeniOdeme._id,
            status: "Finansal hareket işlendi.",
            currentCashBalance: guncelKasa
        });
    } catch (hata) {
        res.status(400).json({ description: "Geçersiz Veri Formatı", detay: hata.message });
    }
};

module.exports = { odemeEkle };