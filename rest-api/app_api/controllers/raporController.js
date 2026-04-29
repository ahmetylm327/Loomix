const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const PersonelHareket = mongoose.model('PersonelHareket');

const gelismisBordroRaporu = async (req, res) => {
    try {
        const personeller = await Personel.find({ aktifMi: true }).sort({ adSoyad: 1 });

        const detayliListe = await Promise.all(personeller.map(async (p) => {
            // Bu personelin tüm geçmiş hareketlerini çek
            const hareketler = await PersonelHareket.find({ personelId: p._id });

            // 🧮 Müşterinin istediği 3 ana kalem:

            // 1. Toplam Borçlandığımız (İşçinin Hakedişleri)
            const toplamHakedis = hareketler
                .filter(h => h.islemTipi === 'Hakediş' || h.islemTipi === 'Avans İadesi')
                .reduce((acc, curr) => acc + curr.tutar, 0);

            // 2. Toplam Ödediğimiz (İşçinin Aldığı Para)
            const toplamOdenen = hareketler
                .filter(h => h.islemTipi === 'Ödeme' || h.islemTipi === 'Avans')
                .reduce((acc, curr) => acc + Math.abs(curr.tutar), 0);

            // 3. Kalan Sonuç (Bakiye)
            const bakiye = p.bakiye || 0;

            return {
                id: p._id,
                adSoyad: p.adSoyad,
                departman: p.departman || 'Genel',
                toplamHakedis, // Borçlandığımız
                toplamOdenen,  // Ödediğimiz
                bakiye         // Sonuç
            };
        }));

        const genelOzet = {
            toplamBorc: detayliListe.reduce((acc, curr) => acc + curr.toplamHakedis, 0),
            toplamOdenen: detayliListe.reduce((acc, curr) => acc + curr.toplamOdenen, 0),
            netKalan: detayliListe.reduce((acc, curr) => acc + curr.bakiye, 0)
        };

        res.status(200).json({
            olusturmaTarihi: new Date(),
            ozet: genelOzet,
            liste: detayliListe
        });

    } catch (error) {
        res.status(500).json({ mesaj: "Rapor hazırlanamadı", hata: error.message });
    }
};

module.exports = { raporAl: gelismisBordroRaporu, gelismisBordroRaporu };