const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const PersonelHareket = mongoose.model('PersonelHareket');

const gelismisBordroRaporu = async (req, res) => {
    try {
        const personeller = await Personel.find({ aktifMi: true }).sort({ adSoyad: 1 });

        const detayliListe = await Promise.all(personeller.map(async (p) => {
            const hareketler = await PersonelHareket.find({ personelId: p._id });

            // 🚀 Sadece isimlere değil, tüm mutlak (abs) değerlere göre kusursuz toplama
            const toplamHakedis = hareketler
                .filter(h => h.islemTipi === 'Hakediş' || h.islemTipi === 'Avans İadesi' || h.islemTipi === 'Prim')
                .reduce((acc, curr) => acc + Math.abs(curr.tutar), 0);

            const toplamOdenen = hareketler
                .filter(h => h.islemTipi === 'Ödeme' || h.islemTipi === 'Avans')
                .reduce((acc, curr) => acc + Math.abs(curr.tutar), 0);

            // 🚀 DÜZELTME BURADA: Statik p.bakiye yerine, gerçek hareketlerden dinamik bakiye hesaplıyoruz.
            // Bu sayede 17.000 Hakediş - 17.000 Ödeme tam olarak 0 sonucunu verecek.
            const bakiye = toplamHakedis - toplamOdenen;

            return {
                id: p._id,
                adSoyad: p.adSoyad,
                departman: p.departman || 'Genel',
                toplamHakedis,
                toplamOdenen,
                bakiye
            };
        }));

        const genelOzet = {
            toplamBorc: detayliListe.reduce((acc, curr) => acc + curr.toplamHakedis, 0),
            toplamOdenen: detayliListe.reduce((acc, curr) => acc + curr.toplamOdenen, 0),
            // netKalan da bu sayede otomatik olarak düzelmiş olacak:
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