const mongoose = require('mongoose');
const Odeme = mongoose.model('Odeme');
const Cari = mongoose.model('Cari');
const Personel = mongoose.model('Personel');

let PersonelHareket;
try { PersonelHareket = mongoose.model('PersonelHareket'); }
catch (error) {
    const yedekHareketSemasi = new mongoose.Schema({
        personelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personel', required: true },
        islemTarihi: { type: Date, default: Date.now },
        islemTipi: { type: String, enum: ['Hakediş', 'Ödeme', 'Avans', 'Prim', 'Avans İadesi'], required: true },
        aciklama: { type: String },
        tutar: { type: Number, required: true },
        bakiyeSonrasi: { type: Number }
    });
    PersonelHareket = mongoose.model('PersonelHareket', yedekHareketSemasi, 'personelhareketleri');
}

const odemeEkle = async (req, res) => {
    try {
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

        // 2. EVRENSEL KUTSAL BAĞLANTI (ŞAHSI HARCAMA DEĞİLSE HESAPTAN DÜŞ)
        if (gelenIlgiliId && gelenIlgiliId !== 'SAHSI_HARCAMA') {

            // Önce Personel mi diye bak
            const isci = await Personel.findById(gelenIlgiliId).catch(() => null);

            if (isci) {
                let pIslemTipi = 'Ödeme';

                if (gelenIslemYonu === 'Gider') {
                    isci.bakiye = (isci.bakiye || 0) - gelenTutar;
                    pIslemTipi = (gelenKategori === 'Personel İşlemi (Maaş/Avans)') ? 'Ödeme' : 'Avans';
                } else if (gelenIslemYonu === 'Gelir') {
                    isci.bakiye = (isci.bakiye || 0) + gelenTutar;
                    pIslemTipi = 'Avans İadesi';
                }
                await isci.save();

                if (PersonelHareket) {
                    await PersonelHareket.create({
                        personelId: isci._id,
                        islemTarihi: gelenTarih,
                        islemTipi: pIslemTipi,
                        tutar: gelenTutar,
                        aciklama: `Kasa Üzerinden: ${gelenNotlar || pIslemTipi}`,
                        bakiyeSonrasi: isci.bakiye
                    });
                }
            }
            // Personel değilse Cari'dir
            else {
                const cariHesap = await Cari.findById(gelenIlgiliId).catch(() => null);

                if (cariHesap) {
                    if (gelenIslemYonu === 'Gelir') {
                        cariHesap.bakiye = (cariHesap.bakiye || 0) - gelenTutar;
                    } else if (gelenIslemYonu === 'Gider') {
                        cariHesap.bakiye = (cariHesap.bakiye || 0) + gelenTutar;
                    }
                    await cariHesap.save();
                }
            }
        }

        // 🚀 DÜZELTME: Kestiğim "Kasadaki Güncel Parayı Hesaplama" kodu geri geldi!
        const tumOdemeler = await Odeme.find();
        let guncelKasa = 0;
        tumOdemeler.forEach(odeme => {
            if (odeme.islemYonu === 'Gelir') guncelKasa += odeme.tutar;
            if (odeme.islemYonu === 'Gider') guncelKasa -= odeme.tutar;
        });

        res.status(201).json({
            transactionId: yeniOdeme._id,
            status: "Finansal hareket işlendi ve defterlere (Firma/Personel) anında yansıdı.",
            currentCashBalance: guncelKasa
        });

    } catch (hata) {
        res.status(400).json({ description: "Geçersiz Veri Formatı", detay: hata.message });
    }
};

const odemeListele = async (req, res) => {
    try {
        const odemeler = await Odeme.find().sort({ odemeTarihi: -1, createdAt: -1 });

        // 🚀 DÜZELTME: Formatlayarak yollama yapısı geri geldi
        const formatliOdemeler = odemeler.map(odeme => ({
            transactionId: odeme._id,
            transactionType: odeme.islemYonu,
            paymentType: odeme.odemeTipi,
            amount: odeme.tutar,
            category: odeme.kategori,
            relatedId: odeme.ilgiliId,
            paymentDate: odeme.odemeTarihi,
            notes: odeme.notlar,
            _id: odeme._id,
            islemYonu: odeme.islemYonu,
            odemeTipi: odeme.odemeTipi,
            tutar: odeme.tutar,
            kategori: odeme.kategori,
            odemeTarihi: odeme.odemeTarihi,
            notlar: odeme.notlar
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

        const silinecekOdeme = await Odeme.findById(id);
        if (!silinecekOdeme) return res.status(404).json({ mesaj: "İşlem kaydı bulunamadı." });

        const { tutar, islemYonu, kategori, ilgiliId } = silinecekOdeme;

        // TERS İŞLEM BAĞLANTISI
        if (ilgiliId && ilgiliId !== 'SAHSI_HARCAMA') {
            const isci = await Personel.findById(ilgiliId).catch(() => null);

            if (isci) {
                if (islemYonu === 'Gider') isci.bakiye = (isci.bakiye || 0) + tutar;
                if (islemYonu === 'Gelir') isci.bakiye = (isci.bakiye || 0) - tutar;
                await isci.save();

                if (PersonelHareket) {
                    await PersonelHareket.findOneAndDelete({
                        personelId: isci._id, tutar: tutar, islemTipi: { $in: ['Ödeme', 'Avans', 'Avans İadesi'] }
                    }).sort({ islemTarihi: -1 });
                }
            } else {
                const cariHesap = await Cari.findById(ilgiliId).catch(() => null);
                if (cariHesap) {
                    if (islemYonu === 'Gelir') cariHesap.bakiye = (cariHesap.bakiye || 0) + tutar;
                    if (islemYonu === 'Gider') cariHesap.bakiye = (cariHesap.bakiye || 0) - tutar;
                    await cariHesap.save();
                }
            }
        }

        await Odeme.findByIdAndDelete(id);
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "İşlem silinemedi", detay: hata.message });
    }
};

module.exports = { odemeEkle, odemeListele, odemeGuncelle, odemeSil };