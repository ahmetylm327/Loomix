const mongoose = require('mongoose');

const getDashboardStats = async (req, res) => {
    try {
        // Modelleri çekiyoruz (Hangi modellerin varsa onlar çalışır)
        const Personel = mongoose.model('Personel');
        const Cari = mongoose.model('Cari');
        const Urun = mongoose.model('Urun');
        const Kasa = mongoose.models.Kasa; // Eğer Kasa modelin varsa hata vermeden alır

        // 1. ÜST KARTLARIN VERİLERİ (Gerçek Sayılar)
        const personelSayisi = await Personel.countDocuments({ aktifMi: true });
        const cariSayisi = await Cari.countDocuments();
        const urunSayisi = await Urun.countDocuments({ aktifMi: true });

        // 2. PASTA GRAFİĞİ İÇİN DİNAMİK KATEGORİ HESAPLAMA (Veritabanındaki ürünleri gruplar)
        const kategoriler = await Urun.aggregate([
            { $match: { aktifMi: true } },
            { $group: { _id: "$kategori", value: { $sum: 1 } } }
        ]);
        const kategoriDagilimi = kategoriler.map(k => ({
            type: k._id || 'Belirtilmemiş',
            value: k.value
        }));

        // 3. KASA HESAPLAMALARI (Son İşlemler ve Net Bakiye)
        let netKasa = 0;
        let sonIslemler = [];

        if (Kasa) {
            sonIslemler = await Kasa.find().sort({ createdAt: -1 }).limit(5); // Son 5 işlemi getir

            const kasaOzet = await Kasa.aggregate([
                { $group: { _id: "$islemYonu", toplam: { $sum: "$tutar" } } }
            ]);

            let gelir = 0, gider = 0;
            kasaOzet.forEach(k => {
                if (k._id === 'Gelir') gelir = k.toplam;
                if (k._id === 'Gider') gider = k.toplam;
            });
            netKasa = gelir - gider;
        }

        // Tüm verileri paketleyip Frontend'e yolluyoruz
        res.status(200).json({
            personelSayisi,
            cariSayisi,
            urunSayisi,
            netKasa,
            kategoriDagilimi: kategoriDagilimi.length > 0 ? kategoriDagilimi : undefined,
            sonIslemler
        });

    } catch (error) {
        console.error("Dashboard Veri Çekme Hatası:", error);
        res.status(500).json({ mesaj: "İstatistikler çekilemedi", detay: error.message });
    }
};

module.exports = { getDashboardStats };