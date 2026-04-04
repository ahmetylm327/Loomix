const mongoose = require('mongoose');
const Uretim = mongoose.model('Uretim');

const Urun = mongoose.model('Urun');

const uretimEkle = async (req, res) => {
    try {
        const { productId, quantity, entryType, productionDate, notes } = req.body;
        if (!productId || !quantity || !entryType || !productionDate) {
            return res.status(400).json({ description: "Geçersiz Veri: Zorunlu alanlar eksik" });
        }
        const urun = await Urun.findById(productId);
        if (!urun) {
            return res.status(404).json({ description: "Ürün Bulunamadı (Geçersiz productId" });
        }

        const yeniUretim = await Uretim.create({
            urunId: productId,
            adet: quantity,
            girisTipi: entryType,
            uretimTarihi: productionDate,
            notlar: notes
        });

        res.status(201).json({
            productionId: yeniUretim._id
        });
    } catch (hata) {
        res.status(400).json({ description: "Geçersiz Veri Formatı", detay: hata.message });
    }
};

module.exports = { uretimEkle };