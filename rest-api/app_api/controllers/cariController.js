const mongoose = require('mongoose');
const Cari = mongoose.model('Cari');
const Uretim = mongoose.model('Uretim');
const Odeme = mongoose.model('Odeme');

const cariEkle = async (req, res) => {
    try {
        const firmaKaydi = {
            cariKodu: req.body.cariKodu,
            firmaAdi: req.body.firmaAdi,
            vergiDairesi: req.body.vergiDairesi,
            vergiNo: req.body.vergiNo,
            kategori: req.body.kategori || "Genel",
            telefon: req.body.telefon || "",
            email: req.body.email || "",
            bakiye: 0
        };
        const yeniCari = await Cari.create(firmaKaydi);
        res.status(201).json(yeniCari);
    } catch (hata) {
        res.status(400).json({ description: hata.message });
    }
};

const cariListele = async (req, res) => {
    try {
        const cariler = await Cari.find().sort({ createdAt: -1 });
        res.status(200).json(cariler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Firmalar getirilemedi" });
    }
};

const cariGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelCari = await Cari.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });
        if (!guncelCari) return res.status(404).json({ mesaj: "Firma bulunamadı." });
        res.status(200).json(guncelCari);
    } catch (hata) {
        res.status(400).json({ mesaj: "Firma güncellenemedi", detay: hata.message });
    }
};

const cariSil = async (req, res) => {
    try {
        const id = req.params.id;
        const silinenCari = await Cari.findByIdAndDelete(id);
        if (!silinenCari) return res.status(404).json({ mesaj: "Firma bulunamadı." });
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Firma silinemedi", detay: hata.message });
    }
};

const getCariEkstre = async (req, res) => {
    try {
        const { id } = req.params;

        const odemeler = await Odeme.find({ ilgiliId: id });
        const uretimler = await Uretim.find({ cariId: id }).populate('productId');

        const cariHesap = await Cari.findById(id);
        const isTedarikci = cariHesap?.kategori === 'Tedarikçi' || cariHesap?.kategori === 'Toptancı';

        let ekstre = [];

        // Üretim fişleri — sadece müşteriler için
        if (!isTedarikci) {
            uretimler.forEach(u => {
                const tutar = u.quantity * (u.birimFiyat || 0);
                ekstre.push({
                    key: u._id,
                    tarih: u.productionDate,
                    islemCinsi: "Üretim / Fiş Kesimi",
                    aciklama: `${u.productId?.urunAdi || 'Ürün'} - ${u.quantity} Adet`,
                    borc: tutar,
                    alacak: 0,
                });
            });
        }

        // Ödemeler
        odemeler.forEach(o => {
            if (o.notlar && o.notlar.includes('Otomatik Mahsup')) return;

            if (o.islemYonu === 'MalAlimi') {
                // Kumaş Tedariği: tedarikçiden mal aldık → aldığımız malzeme sütununa
                ekstre.push({
                    key: o._id,
                    tarih: o.odemeTarihi,
                    islemCinsi: `Malzeme Tedariği`,
                    aciklama: o.notlar || "Malzeme Alımı",
                    borc: 0,
                    alacak: o.tutar,  // Aldığımız Malzeme sütunu
                });
            } else if (isTedarikci) {
                // Tedarikçiye yapılan normal ödeme → yaptığımız ödeme sütununa
                ekstre.push({
                    key: o._id,
                    tarih: o.odemeTarihi,
                    islemCinsi: `Kasa İşlemi (${o.odemeTipi || 'Nakit'})`,
                    aciklama: o.notlar || "Finansal İşlem",
                    borc: o.islemYonu === 'Gider' ? o.tutar : 0,   // Yaptığımız Ödeme
                    alacak: o.islemYonu === 'Gelir' ? o.tutar : 0,
                });
            } else {
                // Normal müşteri işlemleri
                ekstre.push({
                    key: o._id,
                    tarih: o.odemeTarihi,
                    islemCinsi: `Kasa İşlemi (${o.odemeTipi || 'Nakit'})`,
                    aciklama: o.notlar || "Finansal İşlem",
                    alacak: o.islemYonu === 'Gelir' ? o.tutar : 0,
                    borc: o.islemYonu === 'Gider' ? o.tutar : 0,
                });
            }
        });

        ekstre.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

        let bakiyeAkim = 0;
        const formatliEkstre = ekstre.map(kalem => {
            bakiyeAkim += kalem.borc;
            bakiyeAkim -= kalem.alacak;
            return { ...kalem, yuruyenBakiye: bakiyeAkim };
        });

        formatliEkstre.reverse();

        res.json({
            liste: formatliEkstre,
            toplamBorc: ekstre.reduce((acc, curr) => acc + curr.borc, 0),
            toplamAlacak: ekstre.reduce((acc, curr) => acc + curr.alacak, 0),
            bakiye: bakiyeAkim
        });

    } catch (error) {
        res.status(500).json({ mesaj: "Ekstre hazırlanamadı", hata: error.message });
    }
};

module.exports = { cariEkle, cariListele, cariGuncelle, cariSil, getCariEkstre };