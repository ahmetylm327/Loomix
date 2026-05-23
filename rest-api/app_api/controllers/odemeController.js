const mongoose = require('mongoose');
const Odeme = mongoose.model('Odeme');
const Cari = mongoose.model('Cari');
const Personel = mongoose.model('Personel');

let PersonelHareket;
try { PersonelHareket = mongoose.model('PersonelHareket'); }
catch (error) { }

const odemeEkle = async (req, res) => {
    try {
        const gelenIslemYonu = req.body.transactionType || req.body.islemYonu;
        const gelenOdemeTipi = req.body.paymentType || req.body.odemeTipi;
        const gelenTutar = Number(req.body.amount || req.body.tutar);
        const gelenKategori = req.body.category || req.body.kategori;
        const gelenIlgiliId = req.body.relatedId || req.body.ilgiliId;
        const gelenTarih = req.body.paymentDate || req.body.odemeTarihi || Date.now();
        const gelenNotlar = req.body.notes || req.body.notlar || "";

        if (gelenTutar < 0.01) return res.status(400).json({ description: "Hatalı Veri: Tutar sıfır olamaz." });

        const yeniOdeme = await Odeme.create({
            islemYonu: gelenIslemYonu,
            odemeTipi: gelenOdemeTipi,
            tutar: gelenTutar,
            kategori: gelenKategori,
            ilgiliId: gelenIlgiliId,
            odemeTarihi: gelenTarih,
            notlar: gelenNotlar
        });

        if (gelenIlgiliId && gelenIlgiliId !== 'SAHSI_HARCAMA') {
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
                        personelId: isci._id, islemTarihi: gelenTarih, islemTipi: pIslemTipi,
                        tutar: gelenTutar, aciklama: `Kasa Üzerinden: ${gelenNotlar || pIslemTipi}`, bakiyeSonrasi: isci.bakiye
                    });
                }
            } else {
                const cariHesap = await Cari.findById(gelenIlgiliId).catch(() => null);
                if (cariHesap) {
                    if (gelenIslemYonu === 'Gelir') cariHesap.bakiye = (cariHesap.bakiye || 0) - gelenTutar;
                    else if (gelenIslemYonu === 'Gider') cariHesap.bakiye = (cariHesap.bakiye || 0) + gelenTutar;
                    await cariHesap.save();
                }
            }
        }

        const tumOdemeler = await Odeme.find();
        let guncelKasa = 0;
        tumOdemeler.forEach(odeme => {
            if (odeme.islemYonu === 'Gelir') guncelKasa += odeme.tutar;
            if (odeme.islemYonu === 'Gider') guncelKasa -= odeme.tutar;
        });

        res.status(201).json({ transactionId: yeniOdeme._id, status: "Başarılı", currentCashBalance: guncelKasa });

    } catch (hata) {
        res.status(400).json({ description: "Geçersiz Veri", detay: hata.message });
    }
};

const odemeListele = async (req, res) => {
    try {
        const odemeler = await Odeme.find().sort({ odemeTarihi: -1, _id: -1 });
        const formatliOdemeler = odemeler.map(odeme => ({
            transactionId: odeme._id, transactionType: odeme.islemYonu, paymentType: odeme.odemeTipi,
            amount: odeme.tutar, category: odeme.kategori, relatedId: odeme.ilgiliId, paymentDate: odeme.odemeTarihi,
            notes: odeme.notlar, _id: odeme._id, islemYonu: odeme.islemYonu, odemeTipi: odeme.odemeTipi,
            tutar: odeme.tutar, kategori: odeme.kategori, odemeTarihi: odeme.odemeTarihi, notlar: odeme.notlar
        }));
        res.status(200).json(formatliOdemeler);
    } catch (hata) {
        res.status(500).json({ detay: hata.message });
    }
};

const odemeGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelOdeme = await Odeme.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });
        res.status(200).json(guncelOdeme);
    } catch (hata) { res.status(400).json({ detay: hata.message }); }
};

const odemeSil = async (req, res) => {
    try {
        const id = req.params.id;
        const silinecekOdeme = await Odeme.findById(id);
        if (!silinecekOdeme) return res.status(404).json({ mesaj: "Kayıt bulunamadı." });

        const { tutar, islemYonu, notlar, ilgiliId } = silinecekOdeme;

        // 🚀 KORUMA: Fişlerden düşen otomatik işlemi silersek firmayı alacaklandırma!
        const isOtomatik = notlar && notlar.includes('Otomatik Mahsup');

        if (ilgiliId && ilgiliId !== 'SAHSI_HARCAMA') {
            const isci = await Personel.findById(ilgiliId).catch(() => null);

            if (isci) {
                if (islemYonu === 'Gider') isci.bakiye = (isci.bakiye || 0) + tutar;
                if (islemYonu === 'Gelir') isci.bakiye = (isci.bakiye || 0) - tutar;
                await isci.save();
                if (PersonelHareket) await PersonelHareket.findOneAndDelete({ personelId: isci._id, tutar: tutar }).sort({ islemTarihi: -1 });
            } else {
                const cariHesap = await Cari.findById(ilgiliId).catch(() => null);
                // Eğer otomatik mahsup değilse normal kasa iptali gibi bakiyeye yansıt
                if (cariHesap && !isOtomatik) {
                    if (islemYonu === 'Gelir') cariHesap.bakiye = (cariHesap.bakiye || 0) + tutar;
                    if (islemYonu === 'Gider') cariHesap.bakiye = (cariHesap.bakiye || 0) - tutar;
                    await cariHesap.save();
                }
            }
        }

        await Odeme.findByIdAndDelete(id);
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ detay: hata.message });
    }
};

module.exports = { odemeEkle, odemeListele, odemeGuncelle, odemeSil };