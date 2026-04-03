const mongoose = require('mongoose');
const Urun = mongoose.model('Urun');

const urunEkle = async (req, res) => {
    try {
        const { product_name, unit_price, cariId, category, difficulty_level } = req.body;
        if (!product_name || !unit_price || !cariId) {
            return res.status(400).json({ description: "Geçersiz Veri Formatı (İsim, Fiyat veya Cari ID eksik" });
        }

        const yeniUrun = await Urun.create({
            urunAdi: product_name,
            birimFiyat: unit_price,
            cariId: cariId,
            kategori: category,
            zorlukDerecesi: difficulty_level
        });

        res.status(201).json({
            productId: yeniUrun._id,
            status: "Model Tanımlandı"
        });
    } catch (hata) {
        res.status(400).json({ description: "Geçersiz Veri Formatı", detay: hata.message });
    }
};

module.exports = { urunEkle };