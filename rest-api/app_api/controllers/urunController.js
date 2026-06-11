const mongoose = require('mongoose');
const Urun = mongoose.model('Urun');

// 1. Ürünleri Listeleme İşlemi
const urunleriListele = async (req, res) => {
    try {
        const urunler = await Urun.find().populate('cariId', 'firmaAdi').sort({ createdAt: -1 });
        res.status(200).json(urunler);
    } catch (hata) {
        console.error("🚨 Ürünleri Getirme Hatası:", hata.message);
        res.status(500).json({ "mesaj": "Ürünler getirilemedi: " + hata.message });
    }
};

// 2. Yeni Ürün Ekleme İşlemi
const urunEkle = async (req, res) => {
    try {
        console.log("Gelen Yeni Ürün Verisi:", req.body);

        if (!req.body.urunAdi || !req.body.birimFiyat || !req.body.cariId) {
            return res.status(400).json({ "description": "İsim, Fiyat veya Cari ID eksik!" });
        }

        const yeniUrunData = {
            stokKodu: req.body.stokKodu,
            barkod: req.body.barkod || "Barkodsuz",
            urunAdi: req.body.urunAdi,
            birimFiyat: req.body.birimFiyat,
            kdvOrani: req.body.kdvOrani || 10,
            birim: req.body.birim || 'Adet',
            cariId: new mongoose.Types.ObjectId(req.body.cariId),
            zorlukDerecesi: req.body.zorlukDerecesi || 1,
            aktifMi: req.body.aktifMi !== undefined ? req.body.aktifMi : true
        };

        const urun = await Urun.create(yeniUrunData);
        res.status(201).json(urun);

    } catch (error) {
        console.error("🚨 Ürün Kayıt Hatası:", error.message);
        if (error.code === 11000) {
            return res.status(400).json({ "description": "Bu Stok Kodu sistemde zaten kayıtlı!" });
        }
        res.status(400).json({ "description": "Kayıt hatası: " + error.message });
    }
};

// 3. Ürün Güncelleme İşlemi
const urunGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelUrun = await Urun.findByIdAndUpdate(id, req.body, { returnDocument: 'after' }).populate('cariId', 'firmaAdi');

        if (!guncelUrun) {
            return res.status(404).json({ mesaj: "Ürün bulunamadı." });
        }
        res.status(200).json(guncelUrun);
    } catch (hata) {
        res.status(400).json({ mesaj: "Ürün güncellenemedi", detay: hata.message });
    }
};

// 4. Ürün Silme İşlemi
const urunSil = async (req, res) => {
    try {
        const id = req.params.id;
        const silinenUrun = await Urun.findByIdAndDelete(id);

        if (!silinenUrun) {
            return res.status(404).json({ mesaj: "Ürün bulunamadı." });
        }
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Ürün silinemedi", detay: hata.message });
    }
};

// Fonksiyonları dışa aktarma (Router'da kullanılmak üzere)
module.exports = {
    urunleriListele,
    urunEkle,
    urunGuncelle,
    urunSil
};