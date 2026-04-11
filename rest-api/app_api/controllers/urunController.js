const mongoose = require('mongoose');
const Urun = mongoose.model('Urun');

const urunleriListele = async (req, res) => {
    try {
        // ERP DOKUNUŞU: populate ile Cari tablosuna gidip sadece firmaAdi'ni alıyoruz
        const urunler = await Urun.find().populate('cariId', 'firmaAdi').sort({ createdAt: -1 });
        res.status(200).json(urunler);
    } catch (hata) {
        res.status(500).json({ "mesaj": "Ürünler getirilemedi: " + hata.message });
    }
};

const urunEkle = async (req, res) => {
    try {
        console.log("Gelen Yeni Ürün Verisi:", req.body);

        if (!req.body.urunAdi || !req.body.birimFiyat || !req.body.cariId) {
            return res.status(400).json({ "description": "İsim, Fiyat veya Cari ID eksik!" });
        }

        const yeniUrunData = {
            stokKodu: req.body.stokKodu,
            barkod: req.body.barkod || "",
            urunAdi: req.body.urunAdi,
            birimFiyat: req.body.birimFiyat,
            kdvOrani: req.body.kdvOrani || 10,
            birim: req.body.birim || 'Adet',
            cariId: new mongoose.Types.ObjectId(req.body.cariId),
            kategori: req.body.kategori,
            zorlukDerecesi: req.body.zorlukDerecesi || 1,
            aktifMi: req.body.aktifMi !== undefined ? req.body.aktifMi : true
        };

        const urun = await Urun.create(yeniUrunData);
        res.status(201).json(urun);
    } catch (error) {
        console.error("🚨 Ürün Kayıt Hatası:", error.message);

        // Mongoose 'unique' (benzersiz) hatası yakalama
        if (error.code === 11000) {
            return res.status(400).json({ "description": "Bu Stok Kodu sistemde zaten kayıtlı!" });
        }

        res.status(400).json({ "description": "Kayıt hatası: " + error.message });
    }
};

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

module.exports = {
    urunleriListele,
    urunEkle,
    urunGuncelle,
    urunSil
};