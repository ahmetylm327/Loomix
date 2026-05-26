const mongoose = require('mongoose');

const getDashboardStats = async (req, res) => {
    try {
        // Modelleri tanımlıyoruz
        const Personel = mongoose.model('Personel');
        const Cari = mongoose.model('Cari');
        const Urun = mongoose.model('Urun');
        // Kasa ve Odeme modelleri varsa kullan, yoksa hata almamak için kontrol ediyoruz
        const Kasa = mongoose.models.Kasa;
        const Odeme = mongoose.models.Odeme;

        // 1. ÜST KARTLAR (Personel, Cari, Ürün Sayıları)
        const personelSayisi = await Personel.countDocuments({ aktifMi: true });
        const cariSayisi = await Cari.countDocuments();
        const urunSayisi = await Urun.countDocuments({ aktifMi: true });

        // 2. NET KASA DURUMU (Gelir - Gider)
        let netKasa = 0;
        let sonIslemler = [];

        if (Kasa) {
            sonIslemler = await Kasa.find().sort({ createdAt: -1 }).limit(5);

            const kasaOzet = await Kasa.aggregate([
                { $group: { _id: "$islemYonu", toplam: { $sum: "$tutar" } } }
            ]);

            const gelir = kasaOzet.find(k => k._id === 'Gelir')?.toplam || 0;
            const gider = kasaOzet.find(k => k._id === 'Gider')?.toplam || 0;
            netKasa = gelir - gider;
        }

        // 3. HAFTALIK PERSONEL MAAŞ ANALİZİ (Son 4 hafta)
        let maasAnalizi = [];
        if (Odeme) {
            maasAnalizi = await Odeme.aggregate([
                { $match: { tur: 'Maaş' } }, // Sadece 'Maaş' türündeki ödemeleri al
                {
                    $group: {
                        _id: { $week: "$odemeTarihi" },
                        toplam: { $sum: "$tutar" }
                    }
                },
                { $sort: { "_id": -1 } },
                { $limit: 4 }
            ]);
        }

        // 4. KATEGORİ DAĞILIMI (Pasta Grafiği için)
        const kategoriler = await Urun.aggregate([
            { $match: { aktifMi: true } },
            { $group: { _id: "$kategori", value: { $sum: 1 } } }
        ]);
        const kategoriDagilimi = kategoriler.map(k => ({
            type: k._id || 'Belirtilmemiş',
            value: k.value
        }));

        // Frontend'e verileri gönder
        res.status(200).json({
            personelSayisi,
            cariSayisi,
            urunSayisi,
            netKasa,
            kategoriDagilimi,
            sonIslemler,
            // Maaş verisini "hafta" ve "tutar" formatında hazırlıyoruz
            maasAnalizi: maasAnalizi.map(m => ({
                hafta: `${m._id}. Hafta`,
                tutar: m.toplam
            }))
        });

    } catch (error) {
        console.error("Dashboard Veri Çekme Hatası:", error);
        res.status(500).json({ mesaj: "İstatistikler çekilemedi", detay: error.message });
    }
};

module.exports = { getDashboardStats };