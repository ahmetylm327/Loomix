const mongoose = require('mongoose');
const Odeme = mongoose.model('Odeme');
const Cari = mongoose.model('Cari');
const Personel = mongoose.model('Personel');

// 🚀 YENİ: Personelin kendi hareket defterini (Ekstresini) sisteme çağırıyoruz
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

        // 2A. KUTSAL BAĞLANTI: CARİ (FİRMA) İŞLEMİ
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

        // 🚀 2B. KUTSAL BAĞLANTI: PERSONEL (MAAŞ/AVANS) İŞLEMİ (AÇIK KAPATILDI!)
        else if (gelenIlgiliId && (gelenKategori === 'Personel' || gelenKategori === 'Maaş' || gelenKategori === 'Avans')) {
            const isci = await Personel.findById(gelenIlgiliId);

            if (isci) {
                let pIslemTipi = 'Ödeme';

                if (gelenIslemYonu === 'Gider') {
                    // Kasadan para çıktı (İşçiye maaş/avans verdik) -> İçerideki alacağı (bakiye) AZALIR
                    isci.bakiye = (isci.bakiye || 0) - gelenTutar;
                    pIslemTipi = (gelenKategori === 'Avans') ? 'Avans' : 'Ödeme';
                } else if (gelenIslemYonu === 'Gelir') {
                    // İşçiden kasaya para girdi (İşçi aldığı avansı geri getirdi) -> Alacağı (bakiye) tekrar ARTAR
                    isci.bakiye = (isci.bakiye || 0) + gelenTutar;
                    pIslemTipi = 'Avans İadesi';
                }
                await isci.save();

                // 🚀 MUHASEBE ŞAHESERİ: İşçinin ekstresine de "Kasadan Ödendi" diye mühür basıyoruz!
                await PersonelHareket.create({
                    personelId: isci._id,
                    islemTarihi: gelenTarih,
                    islemTipi: pIslemTipi,
                    tutar: gelenTutar,
                    aciklama: `Kasa Üzerinden: ${gelenNotlar || pIslemTipi}`,
                    bakiyeSonrasi: isci.bakiye
                });
                console.log(`Personel Bakiye Güncellendi. Yeni Bakiye: ${isci.bakiye}`);
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
            status: "Finansal hareket işlendi ve defterlere (Firma/Personel) anında yansıdı.",
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

        // 🚀 1. Adım: Silinecek ödemeyi bul
        const silinecekOdeme = await Odeme.findById(id);
        if (!silinecekOdeme) return res.status(404).json({ mesaj: "İşlem kaydı bulunamadı." });

        const { tutar, islemYonu, kategori, ilgiliId } = silinecekOdeme;

        // 🚀 2A. Adım: Cari (Firma) ödemesi siliniyorsa ters işlem yap
        if (ilgiliId && (kategori === 'Cari' || kategori === 'Firma')) {
            const cariHesap = await Cari.findById(ilgiliId);
            if (cariHesap) {
                // Firmadan para almıştık (Gelir), silince borcu tekrar artar
                if (islemYonu === 'Gelir') cariHesap.bakiye = (cariHesap.bakiye || 0) + tutar;
                // Firmaya para vermiştik (Gider), silince borcu tekrar azalır
                if (islemYonu === 'Gider') cariHesap.bakiye = (cariHesap.bakiye || 0) - tutar;
                await cariHesap.save();
            }
        }

        // 🚀 2B. Adım: Personel ödemesi siliniyorsa ters işlem yap
        else if (ilgiliId && (kategori === 'Personel' || kategori === 'Maaş' || kategori === 'Avans')) {
            const isci = await Personel.findById(ilgiliId);
            if (isci) {
                // İşçiye para ödemiştik (Gider), silince alacağı tekrar artar
                if (islemYonu === 'Gider') isci.bakiye = (isci.bakiye || 0) + tutar;
                // İşçi avansı geri getirmişti (Gelir), silince alacağı tekrar azalır
                if (islemYonu === 'Gelir') isci.bakiye = (isci.bakiye || 0) - tutar;
                await isci.save();

                // İşçinin hareket ekstresindeki o makbuzu da çaktırmadan siliyoruz
                if (typeof PersonelHareket !== 'undefined') {
                    await PersonelHareket.findOneAndDelete({
                        personelId: isci._id, tutar: tutar, islemTipi: { $in: ['Ödeme', 'Avans', 'Avans İadesi'] }
                    }).sort({ islemTarihi: -1 });
                }
            }
        }

        // 3. Adım: İşlemi kasadan tamamen sil
        await Odeme.findByIdAndDelete(id);
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "İşlem silinemedi", detay: hata.message });
    }
};

module.exports = { odemeEkle, odemeListele, odemeGuncelle, odemeSil };