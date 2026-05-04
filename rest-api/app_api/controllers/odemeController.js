const mongoose = require('mongoose');
const Odeme = mongoose.model('Odeme');
const Cari = mongoose.model('Cari');
const Personel = mongoose.model('Personel');

const odemeEkle = async (req, res) => {
    try {
        console.log("KASAYA GELEN VERİ:", req.body);

        const gelenIslemYonu = req.body.transactionType || req.body.islemYonu;
        const gelenOdemeTipi = req.body.paymentType || req.body.odemeTipi;
        const gelenTutar = Number(req.body.amount || req.body.tutar);
        const gelenKategori = req.body.category || req.body.kategori;
        const gelenIlgiliId = req.body.relatedId || req.body.ilgiliId;
        const gelenTarih = req.body.paymentDate || req.body.odemeTarihi || Date.now();
        const gelenNotlar = req.body.notes || req.body.notlar || "";

        if (gelenTutar < 0.01) {
            return res.status(400).json({ description: "Hatalı Veri: Tutar sıfır olamaz." });
        }

        // 1. Ödemeyi (Kasa Hareketini) Kaydet
        const yeniOdeme = await Odeme.create({
            islemYonu: gelenIslemYonu,
            odemeTipi: gelenOdemeTipi,
            tutar: gelenTutar,
            kategori: gelenKategori,
            ilgiliId: gelenIlgiliId,
            odemeTarihi: gelenTarih,
            notlar: gelenNotlar
        });

        // 2. KUTSAL BAĞLANTI: Eğer bu işlem bir "Firma (Cari)" işlemiyse hesaptan düş/ekle
        if (gelenIlgiliId && (gelenKategori === 'Cari' || gelenKategori === 'Firma')) {
            const cariHesap = await Cari.findById(gelenIlgiliId);

            if (cariHesap) {
                if (gelenIslemYonu === 'Gelir') {
                    // Firmadan tahsilat yaptık -> Bize olan borcu AZALDI
                    cariHesap.bakiye = (cariHesap.bakiye || 0) - gelenTutar;
                } else if (gelenIslemYonu === 'Gider') {
                    // Firmaya biz para/avans verdik -> Bize olan borcu ARTTI
                    cariHesap.bakiye = (cariHesap.bakiye || 0) + gelenTutar;
                }
                await cariHesap.save();
                console.log(`Cari Bakiye Güncellendi. Yeni Bakiye: ${cariHesap.bakiye}`);
            }
        }

        // Kasadaki güncel parayı hesaplıyoruz
        const tumOdemeler = await Odeme.find();
        let guncelKasa = 0;
        tumOdemeler.forEach(odeme => {
            if (odeme.islemYonu === 'Gelir') guncelKasa += odeme.tutar;
            if (odeme.islemYonu === 'Gider') guncelKasa -= odeme.tutar;
        });

        res.status(201).json({
            transactionId: yeniOdeme._id,
            status: "Finansal hareket işlendi ve defterlere kaydedildi.",
            currentCashBalance: guncelKasa
        });
    } catch (hata) {
        console.log("KAYIT HATASI:", hata.message);
        res.status(400).json({ description: "Geçersiz Veri Formatı", detay: hata.message });
    }
};

const odemeListele = async (req, res) => {
    try {
        const odemeler = await Odeme.find().sort({ odemeTarihi: -1 });

        const formatliOdemeler = odemeler.map(odeme => ({
            transactionId: odeme._id,
            transactionType: odeme.islemYonu,
            paymentType: odeme.odemeTipi,
            amount: odeme.tutar,
            category: odeme.kategori,
            relatedId: odeme.ilgiliId,
            paymentDate: odeme.odemeTarihi,
            notes: odeme.notlar
        }));

        res.status(200).json(formatliOdemeler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Ödemeler listelenemedi", detay: hata.message });
    }
};

const odemeGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelOdeme = await Odeme.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });
        if (!guncelOdeme) return res.status(404).json({ mesaj: "İşlem kaydı bulunamadı." });
        res.status(200).json(guncelOdeme);
    } catch (hata) {
        res.status(400).json({ mesaj: "İşlem güncellenemedi", detay: hata.message });
    }
};

const odemeSil = async (req, res) => {
    try {
        const id = req.params.id;
        const silinenOdeme = await Odeme.findByIdAndDelete(id);
        if (!silinenOdeme) return res.status(404).json({ mesaj: "İşlem kaydı bulunamadı." });
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "İşlem silinemedi", detay: hata.message });
    }
};

module.exports = { odemeEkle, odemeListele, odemeGuncelle, odemeSil };