const mongoose = require('mongoose');
const Odeme = mongoose.model('Odeme');
const Cari = mongoose.model('Cari');
const Personel = mongoose.model('Personel');

let PersonelHareket;
try { PersonelHareket = mongoose.model('PersonelHareket'); } catch (error) { }

const KASA_BASLANGIC = new Date('2026-01-01');
const TEDARIKCI_KATEGORILER = ['Tedarikçi', 'Toptancı'];

// 1. ÖDEME EKLE
const odemeEkle = async (req, res) => {
    try {
        const {
            transactionType, islemYonu, paymentType, odemeTipi,
            amount, tutar, category, kategori,
            relatedId, ilgiliId, paymentDate, odemeTarihi,
            notes, notlar
        } = req.body;

        const gelenIslemYonu = transactionType || islemYonu;
        const gelenOdemeTipi = paymentType || odemeTipi || 'Nakit';
        const gelenTutar = Number(amount || tutar);
        const gelenKategori = category || kategori;
        const gelenIlgiliId = relatedId || ilgiliId;
        const gelenTarih = paymentDate || odemeTarihi || Date.now();
        const gelenNotlar = notes || notlar || "";

        if (gelenTutar < 0.01) return res.status(400).json({ description: "Hatalı Veri: Tutar sıfır olamaz." });

        // Cariyi bul
        let cariHesap = null;
        let cariKategorisi = null;
        if (gelenIlgiliId && gelenIlgiliId !== 'SAHSI_HARCAMA') {
            cariHesap = await Cari.findById(gelenIlgiliId).catch(() => null);
            if (cariHesap) cariKategorisi = cariHesap.kategori;
        }

        const isTedarikci = TEDARIKCI_KATEGORILER.includes(cariKategorisi);

        // Tedarikçiden mal alımı mı?
        const isMalAlimi = isTedarikci && gelenKategori === 'Kumaş/Malzeme';

        // Her durumda Odeme tablosuna kayıt aç
        // Mal alımında islemYonu = 'MalAlimi' → kasa hesabına girmez ama kayıt var
        const yeniOdeme = await Odeme.create({
            islemYonu: isMalAlimi ? 'MalAlimi' : gelenIslemYonu,
            odemeTipi: gelenOdemeTipi,
            tutar: gelenTutar,
            kategori: gelenKategori,
            ilgiliId: gelenIlgiliId,
            odemeTarihi: gelenTarih,
            notlar: gelenNotlar
        });

        // Bakiye güncellemeleri
        if (gelenIlgiliId && gelenIlgiliId !== 'SAHSI_HARCAMA') {
            const isci = await Personel.findById(gelenIlgiliId).catch(() => null);

            if (isci) {
                let pIslemTipi = (gelenKategori === 'Personel İşlemi (Maaş/Avans)') ? 'Ödeme' : 'Avans';
                if (gelenIslemYonu === 'Gider') {
                    isci.bakiye -= gelenTutar;
                } else if (gelenIslemYonu === 'Gelir') {
                    isci.bakiye += gelenTutar;
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

            } else if (cariHesap) {
                if (isTedarikci) {
                    if (isMalAlimi) {
                        // Mal alımı: tedarikçiye borçlandık, bakiyesi artar
                        cariHesap.bakiye += gelenTutar;
                    } else {
                        // Tedarikçiye ödeme: borcumuz azalır, bakiyesi düşer
                        cariHesap.bakiye -= gelenTutar;
                    }
                } else {
                    // Müşteri mantığı
                    if (gelenIslemYonu === 'Gelir') cariHesap.bakiye -= gelenTutar;
                    else if (gelenIslemYonu === 'Gider') cariHesap.bakiye += gelenTutar;
                }
                await cariHesap.save();
            }
        }

        // Güncel kasa: sadece Gelir ve Gider kayıtları dahil, MalAlimi hariç
        const tumOdemeler = await Odeme.find({
            odemeTarihi: { $gte: KASA_BASLANGIC },
            islemYonu: { $in: ['Gelir', 'Gider'] }
        });
        let guncelKasa = tumOdemeler.reduce(
            (acc, o) => o.islemYonu === 'Gelir' ? acc + o.tutar : acc - o.tutar, 0
        );

        res.status(201).json({
            transactionId: yeniOdeme._id,
            status: "Başarılı",
            currentCashBalance: guncelKasa,
            kasaEtkilendi: !isMalAlimi,
            mesaj: isMalAlimi
                ? "Mal alımı kaydedildi. Kasa etkilenmedi, tedarikçi borcuna yazıldı."
                : "İşlem kaydedildi ve kasa güncellendi."
        });

    } catch (hata) {
        res.status(400).json({ description: "Geçersiz Veri", detay: hata.message });
    }
};

// 2. ÖDEME LİSTELE
const odemeListele = async (req, res) => {
    try {
        const odemeler = await Odeme.find({
            notlar: { $not: /Otomatik Mahsup/ }
        }).sort({ odemeTarihi: -1 });
        res.status(200).json(odemeler);
    } catch (hata) {
        res.status(500).json({ detay: hata.message });
    }
};

// 3. ÖDEME GÜNCELLE
const odemeGuncelle = async (req, res) => {
    try {
        const guncelOdeme = await Odeme.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!guncelOdeme) return res.status(404).json({ mesaj: "Kayıt bulunamadı." });
        res.status(200).json(guncelOdeme);
    } catch (hata) {
        res.status(400).json({ detay: hata.message });
    }
};

// 4. ÖDEME SİL
const odemeSil = async (req, res) => {
    try {
        const silinecekOdeme = await Odeme.findById(req.params.id);
        if (!silinecekOdeme) return res.status(404).json({ mesaj: "Kayıt bulunamadı." });

        const { tutar, islemYonu, notlar, ilgiliId } = silinecekOdeme;
        const isOtomatik = notlar && notlar.includes('Otomatik Mahsup');
        const isMalAlimi = islemYonu === 'MalAlimi';

        if (ilgiliId && ilgiliId.toString() !== 'SAHSI_HARCAMA') {
            const isci = await Personel.findById(ilgiliId).catch(() => null);

            if (isci) {
                // Personel bakiyesini geri al
                if (islemYonu === 'Gider') isci.bakiye += tutar;
                if (islemYonu === 'Gelir') isci.bakiye -= tutar;
                await isci.save();
                if (PersonelHareket) {
                    await PersonelHareket.findOneAndDelete(
                        { personelId: isci._id, tutar: tutar }
                    ).sort({ islemTarihi: -1 });
                }
            } else {
                const cariHesap = await Cari.findById(ilgiliId).catch(() => null);
                if (cariHesap && !isOtomatik) {
                    const isTedarikci = TEDARIKCI_KATEGORILER.includes(cariHesap.kategori);

                    if (isTedarikci) {
                        if (isMalAlimi) {
                            // Mal alımı silindi → tedarikçi borcunu geri al
                            cariHesap.bakiye -= tutar;
                        } else {
                            // Ödeme silindi → tedarikçi borcu geri gelir
                            cariHesap.bakiye += tutar;
                        }
                    } else {
                        // Müşteri
                        if (islemYonu === 'Gelir') cariHesap.bakiye += tutar;
                        if (islemYonu === 'Gider') cariHesap.bakiye -= tutar;
                    }
                    await cariHesap.save();
                }
            }
        }

        await Odeme.findByIdAndDelete(req.params.id);
        res.status(204).send();

    } catch (hata) {
        res.status(400).json({ detay: hata.message });
    }
};

module.exports = { odemeEkle, odemeListele, odemeGuncelle, odemeSil };