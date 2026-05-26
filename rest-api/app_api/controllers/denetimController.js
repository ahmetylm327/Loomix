const mongoose = require('mongoose');
const Cari = mongoose.model('Cari');
const Uretim = mongoose.model('Uretim');
const Odeme = mongoose.model('Odeme');

const denetimYap = async (req, res) => {
    try {
        const cariler = await Cari.find();
        let rapor = [];

        for (let cari of cariler) {
            // Firmanın kestiği tüm fişlerin toplamı (Borç / Alacağımız)
            const uretimler = await Uretim.find({ cariId: cari._id });
            const toplamBorc = uretimler.reduce((acc, u) => acc + (u.quantity * (u.birimFiyat || 0)), 0);

            // Firmanın kasaya yaptığı tüm nakit ödemeler (Tahsilat)
            const odemeler = await Odeme.find({ ilgiliId: cari._id, islemYonu: 'Gelir' });
            const toplamOdeme = odemeler.reduce((acc, o) => acc + o.tutar, 0);

            // Olması gereken gerçek bakiye
            const gercekBakiye = toplamBorc - toplamOdeme;

            // Eğer veritabanındaki bakiye ile bizim hesapladığımız uyuşmuyorsa listeye ekle
            if (Math.abs(cari.bakiye - gercekBakiye) > 0.01) {
                rapor.push({
                    firmaAdi: cari.firmaAdi,
                    sistemdekiHatalıBakiye: cari.bakiye,
                    olmasiGerekenBakiye: gercekBakiye,
                    aradakiFark: cari.bakiye - gercekBakiye
                });
            }
        }
        res.status(200).json({
            mesaj: "Denetim tamamlandı.",
            hataliFirmalar: rapor
        });
    } catch (error) {
        res.status(500).json({ mesaj: "Denetim hatası", detay: error.message });
    }
};

const hatalariOnar = async (req, res) => {
    try {
        const cariler = await Cari.find();
        let duzeltilenler = [];

        for (let cari of cariler) {
            const uretimler = await Uretim.find({ cariId: cari._id });
            const toplamBorc = uretimler.reduce((acc, u) => acc + (u.quantity * (u.birimFiyat || 0)), 0);

            const odemeler = await Odeme.find({ ilgiliId: cari._id, islemYonu: 'Gelir' });
            const toplamOdeme = odemeler.reduce((acc, o) => acc + o.tutar, 0);

            const gercekBakiye = toplamBorc - toplamOdeme;

            // Eğer bakiye hatalıysa, gerçek bakiyeyi veritabanına kalıcı olarak kaydet
            if (Math.abs(cari.bakiye - gercekBakiye) > 0.01) {
                cari.bakiye = gercekBakiye;
                await cari.save(); // Hatalı -174.000 TL'yi silip yerine 0 yazıyor
                duzeltilenler.push({ firma: cari.firmaAdi, yeniBakiye: gercekBakiye });
            }
        }
        res.status(200).json({
            mesaj: "Sistemdeki tüm tutarsızlıklar kalıcı olarak onarıldı!",
            duzeltilenFirmalar: duzeltilenler
        });
    } catch (error) {
        res.status(500).json({ detay: error.message });
    }
};

module.exports = { denetimYap, hatalariOnarF };