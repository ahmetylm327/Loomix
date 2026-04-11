const mongoose = require('mongoose');
const Uretim = mongoose.model('Uretim');
const Urun = mongoose.model('Urun');

const uretimEkle = async (req, res) => {
    try {
        const { productId, quantity, entryType, productionDate, notes } = req.body;

        const urunVarMi = await Urun.findById(productId);
        if (!urunVarMi) {
            return res.status(404).json({ mesaj: "Ürün Bulunamadı (Geçersiz productId)" });
        }

        const yeniUretim = new Uretim({
            productId,
            quantity,
            entryType,
            productionDate,
            notes
        });

        await yeniUretim.save();

        res.status(201).json({
            status: "Üretim Verisi Başarıyla Kaydedildi",
            productionId: yeniUretim._id
        });

    } catch (hata) {
        res.status(400).json({ mesaj: "Geçersiz Veri Formatı", detay: hata.message });
    }
};

const uretimListele = async (req, res) => {
    try {
        const uretimler = await Uretim.find().populate('productId').sort({ productionDate: -1 });
        res.status(200).json(uretimler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Üretimler listelenemedi", detay: hata.message });
    }
};

const uretimGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelUretim = await Uretim.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });

        if (!guncelUretim) {
            return res.status(404).json({ mesaj: "Üretim kaydı bulunamadı." });
        }
        res.status(200).json(guncelUretim);
    } catch (hata) {
        res.status(400).json({ mesaj: "Üretim güncellenemedi", detay: hata.message });
    }
};

const uretimSil = async (req, res) => {
    try {
        const id = req.params.id;
        const silinenUretim = await Uretim.findByIdAndDelete(id);

        if (!silinenUretim) {
            return res.status(404).json({ mesaj: "Üretim kaydı bulunamadı." });
        }
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Üretim silinemedi", detay: hata.message });
    }
};


module.exports = {
    uretimEkle,
    uretimListele,
    uretimGuncelle,
    uretimSil
};