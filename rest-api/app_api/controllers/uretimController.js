const mongoose = require('mongoose');
const Uretim = mongoose.model('Uretim');
const Urun = mongoose.model('Urun');
const Cari = mongoose.model('Cari');

const uretimEkle = async (req, res) => {
    try {
        const { productId, cariId, quantity, birimFiyat, entryType, productionDate, notes } = req.body;

        const urun = await Urun.findById(productId);
        if (!urun) return res.status(404).json({ mesaj: "Ürün Bulunamadı" });

        const cari = await Cari.findById(cariId);
        if (!cari) return res.status(404).json({ mesaj: "Firma (Cari) Bulunamadı" });

        // Ekranda girilen özel fiyatı alıyoruz
        const uygulanacakFiyat = birimFiyat !== undefined ? Number(birimFiyat) : (urun.birimFiyat || 0);

        // 1. FİŞİ KES VE FİYATI MÜHÜRLE (Eski Fişler Koruma Altında)
        const yeniUretim = new Uretim({
            productId,
            cariId,
            quantity,
            birimFiyat: uygulanacakFiyat, // O anki fiyat fişe mühürlendi!
            entryType: entryType || "Günlük",
            productionDate,
            notes
        });
        await yeniUretim.save();

        // 2. FİRMAYA BORCUNU YAZ
        const islemTutari = uygulanacakFiyat * quantity;
        cari.bakiye = (cari.bakiye || 0) + islemTutari;
        await cari.save();

        // 3. 🚀 SİHİRLİ DOKUNUŞ: ÜRÜNÜN KALICI FİYATINI GÜNCELLE!
        // Eğer patron fiş keserken fiyatı değiştirdiyse, sistem bunu anlar ve "Ürünler" tablosuna zam/indirim uygular.
        if (uygulanacakFiyat !== urun.birimFiyat) {
            urun.birimFiyat = uygulanacakFiyat;
            await urun.save();
            console.log(`Otomatik Güncelleme: "${urun.urunAdi}" fiyatı ${uygulanacakFiyat} ₺ olarak ayarlandı!`);
        }

        res.status(201).json({
            status: "Üretim başarıyla işlendi.",
            productionId: yeniUretim._id,
            guncelBakiye: cari.bakiye
        });

    } catch (hata) {
        res.status(400).json({ mesaj: "Kayıt Hatası", detay: hata.message });
    }
};

const uretimListele = async (req, res) => {
    try {
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
        const silinenUretim = await Uretim.findByIdAndDelete(id);
        if (!silinenUretim) return res.status(404).json({ mesaj: "Üretim kaydı bulunamadı." });
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Üretim silinemedi", detay: hata.message });
    }
};

module.exports = { uretimEkle, uretimListele, uretimGuncelle, uretimSil };