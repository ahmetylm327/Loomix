const mongoose = require('mongoose');
const Uretim = mongoose.model('Uretim');
const Urun = mongoose.model('Urun');
const Cari = mongoose.model('Cari'); // Cari modelini içeri aldık

const uretimEkle = async (req, res) => {
    try {
        const { productId, cariId, quantity, entryType, productionDate, notes } = req.body;

        const urun = await Urun.findById(productId);
        if (!urun) return res.status(404).json({ mesaj: "Ürün Bulunamadı" });

        const cari = await Cari.findById(cariId);
        if (!cari) return res.status(404).json({ mesaj: "Firma (Cari) Bulunamadı" });

        // 1. Üretim Fişini Kaydet
        const yeniUretim = new Uretim({
            productId,
            cariId, // Kime diktiğimizi kaydediyoruz
            quantity,
            entryType: entryType || "Günlük",
            productionDate,
            notes
        });
        await yeniUretim.save();

        // 2. KUTSAL BAĞLANTI: Firmanın hesabına borç yaz! (Birim Fiyat x Adet)
        const islemTutari = (urun.birimFiyat || 0) * quantity;
        cari.bakiye = (cari.bakiye || 0) + islemTutari; // Bakiyeyi (Bize olan borcunu) artır
        await cari.save();

        res.status(201).json({
            status: "Üretim başarıyla işlendi ve Cari bakiyesine eklendi.",
            productionId: yeniUretim._id,
            guncelBakiye: cari.bakiye
        });

    } catch (hata) {
        res.status(400).json({ mesaj: "Kayıt Hatası", detay: hata.message });
    }
};

const uretimListele = async (req, res) => {
    try {
        // Cari bilgisini de ekrana getiriyoruz
        const uretimler = await Uretim.find().populate('productId').populate('cariId').sort({ productionDate: -1 });
        res.status(200).json(uretimler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Üretimler listelenemedi", detay: hata.message });
    }
};

const uretimGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelUretim = await Uretim.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });
        if (!guncelUretim) return res.status(404).json({ mesaj: "Üretim kaydı bulunamadı." });
        res.status(200).json(guncelUretim);
    } catch (hata) {
        res.status(400).json({ mesaj: "Üretim güncellenemedi", detay: hata.message });
    }
};

const uretimSil = async (req, res) => {
    try {
        const id = req.params.id;
        // Not: Gerçek muhasebede silinen üretimin parası cariden de düşülmelidir.
        // Şimdilik sadece siliyoruz, ileride "İade" mantığı eklenebilir.
        const silinenUretim = await Uretim.findByIdAndDelete(id);
        if (!silinenUretim) return res.status(404).json({ mesaj: "Üretim kaydı bulunamadı." });
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Üretim silinemedi", detay: hata.message });
    }
};

module.exports = { uretimEkle, uretimListele, uretimGuncelle, uretimSil };