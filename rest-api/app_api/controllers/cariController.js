const mongoose = require('mongoose');
const Cari = mongoose.model('Cari');

const cariEkle = async (req, res) => {
    try {
        const { company_name, tax_number, category, phone, initial_balance } = req.body;
        if (!company_name || !tax_number || !category) {
            return res.status(400).json({ description: "Geçersiz Veri (Eksik Vergi No, İsim veya Kategori" });
        }
        if (tax_number.length !== 10) {
            return res.status(400).json({ description: "Vegi numarası tam olarak 10 haneli olmalıdır." });
        }

        const yeniCari = await Cari.create({
            firmaAdi: company_name,
            vergiNo: tax_number,
            kategori: category,
            telefon: phone,
            bakiye: initial_balance || 0
        });

        res.status(201).json({
            cariId: yeniCari._id,
            status: "Kayıt Oluşturuldu"
        });
    } catch (hata) {
        res.status(400).json({ description: "Geçersiz Veri Formatı", detay: hata.message });
    }
};

const cariListele = async (req, res) => {
    try {
        const cariler = await Cari.find();
        res.status(200).json(cariler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Firmalar getirilemedi: " + hata.message });
    }
};

module.exports = { cariEkle, cariListele };