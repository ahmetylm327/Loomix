const mongoose = require('mongoose');

const getDashboardStats = async (req, res) => {
    try {
        const Personel = mongoose.model('Personel');
        const Cari = mongoose.model('Cari');
        const Urun = mongoose.model('Urun');
        const Odeme = mongoose.model('Odeme');

        // 1. ÜST KARTLAR
        const personelSayisi = await Personel.countDocuments({ aktifMi: true });
        const cariSayisi = await Cari.countDocuments();
        const urunSayisi = await Urun.countDocuments({ aktifMi: true });

        // 2. NET KASA
        const kasaOzet = await Odeme.aggregate([
            { $group: { _id: "$islemYonu", toplam: { $sum: "$tutar" } } }
        ]);
        const gelir = kasaOzet.find(k => k._id === 'Gelir')?.toplam || 0;
        const gider = kasaOzet.find(k => k._id === 'Gider')?.toplam || 0;
        const netKasa = gelir - gider;

        // 3. SON 5 İŞLEM
        const sonIslemler = await Odeme.find().sort({ odemeTarihi: -1 }).limit(5);

        // 4. HAFTALIK MAAŞ ANALİZİ (kategori = Personel İşlemi)
        const maasRaw = await Odeme.aggregate([
            { $match: { kategori: 'Personel İşlemi (Maaş/Avans)', islemYonu: 'Gider' } },
            {
                $group: {
                    _id: { $week: "$odemeTarihi" },
                    toplam: { $sum: "$tutar" }
                }
            },
            { $sort: { "_id": 1 } },
            { $limit: 8 }
        ]);
        const maasAnalizi = maasRaw.map(m => ({
            hafta: `${m._id}. Hafta`,
            tutar: m.toplam
        }));

        // 5. KATEGORİ DAĞILIMI
        const kategoriler = await Urun.aggregate([
            { $match: { aktifMi: true } },
            { $group: { _id: "$kategori", value: { $sum: 1 } } }
        ]);
        const kategoriDagilimi = kategoriler.map(k => ({
            type: k._id || 'Belirtilmemiş',
            value: k.value
        }));

        // 6. BU AY KESİLEN FİŞ TUTARI
        const Production = mongoose.models.Production || mongoose.models.Uretim;
        let buAyFisTutari = 0;
        if (Production) {
            const ayBasi = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const fisPipeline = await Production.aggregate([
                { $match: { productionDate: { $gte: ayBasi } } },
                { $group: { _id: null, toplam: { $sum: { $multiply: ["$quantity", "$birimFiyat"] } } } }
            ]);
            buAyFisTutari = fisPipeline[0]?.toplam || 0;
        }

        // 7. PİYASADAKİ ALACAK (tüm carilerin bakiye toplamı)
        const alacakOzet = await Cari.aggregate([
            { $group: { _id: null, toplam: { $sum: "$bakiye" } } }
        ]);
        const toplamAlacak = alacakOzet[0]?.toplam || 0;

        res.status(200).json({
            personelSayisi,
            cariSayisi,
            urunSayisi,
            netKasa,
            toplamAlacak,
            buAyFisTutari,
            kategoriDagilimi,
            sonIslemler,
            maasAnalizi
        });

    } catch (error) {
        console.error("Dashboard Veri Çekme Hatası:", error);
        res.status(500).json({ mesaj: "İstatistikler çekilemedi", detay: error.message });
    }
};

module.exports = { getDashboardStats };