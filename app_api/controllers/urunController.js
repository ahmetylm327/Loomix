const mongoose = require('mongoose');
const Urun = mongoose.model('Urun');

const urunleriListele = async (req, res) => {
    try {
        const urunler = await Urun.find();
        res.status(200).json(urunler);
    } catch (hata) {
        res.status(500).json({ "mesaj": "Ürünler getirilemedi: " + hata.message });
    }
};

const urunEkle = async (req, res) => {
    try {
        // --- MONGODB HAYALET İNDEKS TEMİZLEYİCİ ---
        // Geçmişte oluşan 'unique' (benzersizlik) kurallarını sıfırlar.
        try {
            await Urun.collection.dropIndexes();
            console.log("Eski MongoDB indeksleri başarıyla temizlendi.");
        } catch (indexError) {
            console.log("Silinecek indeks bulunamadı veya koleksiyon yeni.");
        }
        // ------------------------------------------

        if (!req.body.urunAdi || !req.body.birimFiyat || !req.body.cariId) {
            return res.status(400).json({ "description": "Geçersiz Veri Formatı (İsim, Fiyat veya Cari ID eksik)" });
        }

        const yeniUrun = {
            urunAdi: req.body.urunAdi,
            birimFiyat: req.body.birimFiyat,
            cariId: new mongoose.Types.ObjectId(req.body.cariId),
            kategori: req.body.kategori,
            zorlukDerecesi: req.body.zorlukDerecesi
        };

        const urun = await Urun.create(yeniUrun);
        res.status(201).json(urun);
    } catch (error) {
        res.status(400).json({ "description": "Kayıt sırasında hata oluştu: " + error.message });
    }
};

const urunGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelUrun = await Urun.findByIdAndUpdate(id, req.body, { new: true });

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