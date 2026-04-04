const mongoose = require('mongoose');
const Cari = mongoose.model('Cari');

const cariEkle = async (req, res) => {
    try {
        console.log("1. Backend'e Ulaşan Veri:", req.body);

        // Verileri Mongoose'un kesinlikle kabul edeceği formata ZORLUYORUZ
        const firmaKaydi = {
            firmaAdi: String(req.body.company_name),
            vergiNo: String(req.body.tax_number),
            kategori: String(req.body.category),
            telefon: String(req.body.phone || ""),
            bakiye: 0
        };

        console.log("2. Veritabanına Gönderilen Format:", firmaKaydi);

        // Veritabanına kaydet
        const yeniCari = await Cari.create(firmaKaydi);

        console.log("3. ✅ KAYIT BAŞARILI!");
        res.status(201).json({ cariId: yeniCari._id, status: "Kayıt Oluşturuldu" });

    } catch (hata) {
        // EĞER HATA OLURSA ARTIK KONSOLDA BAĞIRACAK!
        console.error("🚨 VERİTABANI HATASI:", hata.message);
        res.status(400).json({ description: hata.message });
    }
};

const cariListele = async (req, res) => {
    try {
        const cariler = await Cari.find();
        res.status(200).json(cariler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Firmalar getirilemedi" });
    }
};

const cariGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelCari = await Cari.findByIdAndUpdate(id, req.body, { new: true });

        if (!guncelCari) {
            return res.status(404).json({ mesaj: "Firma bulunamadı." });
        }
        res.status(200).json(guncelCari);
    } catch (hata) {
        res.status(400).json({ mesaj: "Firma güncellenemedi", detay: hata.message });
    }
};

const cariSil = async (req, res) => {
    try {
        const id = req.params.id;
        const silinenCari = await Cari.findByIdAndDelete(id);

        if (!silinenCari) {
            return res.status(404).json({ mesaj: "Firma bulunamadı." });
        }
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Firma silinemedi", detay: hata.message });
    }
};



module.exports = { cariEkle, cariListele, cariGuncelle, cariSil };