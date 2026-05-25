const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const dayjs = require('dayjs');

const Personel = mongoose.model('Personel');
const PersonelHareket = mongoose.model('PersonelHareket');
const Odeme = mongoose.model('Odeme');

// 1. TOPLU TAHAKKUK (EXCEL İLE)
const mesaiYukle = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ description: "Dosya yüklenemedi!" });
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const hamVeri = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const calismaGunleri = {};
        hamVeri.forEach(satir => {
            const isim = satir['İsim'];
            const tarih = satir['GirişTarihi'];
            if (isim && tarih) {
                const temizIsim = isim.trim();
                if (!calismaGunleri[temizIsim]) calismaGunleri[temizIsim] = new Set();
                calismaGunleri[temizIsim].add(tarih);
            }
        });

        const sonuclar = { basariliTahakkuklar: [], sistemdeBulunamayanlar: [] };
        for (const [isim, tarihlerSet] of Object.entries(calismaGunleri)) {
            const calisilanGunSayisi = tarihlerSet.size;
            const regex = new RegExp(`^${isim}$`, 'i');
            const personel = await Personel.findOne({ adSoyad: regex });

            if (personel) {
                const yevmiye = personel.ucretMiktari || 0;
                const toplamHakedis = calisilanGunSayisi * yevmiye;
                personel.bakiye += toplamHakedis;
                await personel.save();
                await PersonelHareket.create({
                    personelId: personel._id,
                    islemTipi: 'Hakediş',
                    tutar: toplamHakedis,
                    aciklama: `Otomatik Puantaj: ${calisilanGunSayisi} Gün`
                });
                sonuclar.basariliTahakkuklar.push({ isim: personel.adSoyad, tahakkukTutar: toplamHakedis });
            } else {
                sonuclar.sistemdeBulunamayanlar.push({ isim: isim, gun: calisilanGunSayisi });
            }
        }
        fs.unlinkSync(req.file.path);
        res.status(200).json({ mesaj: "Puantaj işlendi.", ozet: sonuclar });
    } catch (hata) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        res.status(500).json({ mesaj: "Dosya işleme hatası", detay: hata.message });
    }
};

// 2. MANUEL TAHAKKUK
const hakedisHesapla = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const { period_type, calisilanGunManuel } = req.body;
        const personel = await Personel.findById(id);
        if (!personel) return res.status(404).json({ description: "Personel Bulunamadı" });

        let calisilanGun = calisilanGunManuel ? Number(calisilanGunManuel) : (period_type === "Aylık" ? 26 : (period_type === "Haftalık" ? 6 : 1));
        const toplamHakedis = calisilanGun * (personel.ucretMiktari || 0);
        personel.bakiye += toplamHakedis;
        await personel.save();

        await PersonelHareket.create({
            personelId: personel._id,
            islemTipi: 'Hakediş',
            tutar: toplamHakedis,
            aciklama: `Manuel Tahakkuk: ${calisilanGun} Gün`
        });
        res.status(200).json({ mesaj: "Tahakkuk eklendi.", yeni_bakiye: personel.bakiye });
    } catch (hata) {
        res.status(400).json({ description: "Hata", detay: hata.message });
    }
};

// 3. HAFTALIK ANALİZ
const haftalikAnalizGetir = async (req, res) => {
    try {
        const tarihSiniri = new Date();
        tarihSiniri.setDate(tarihSiniri.getDate() - 14);
        const hareketler = await PersonelHareket.find({ islemTipi: 'Hakediş', islemTarihi: { $gte: tarihSiniri } }).populate('personelId', 'adSoyad aktifMi');
        const gecerliHareketler = hareketler.filter(h => h.personelId && h.personelId.aktifMi === true);
        res.status(200).json(gecerliHareketler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Analiz verisi alınamadı", detay: hata.message });
    }
};

// 4. TOPLU ÖDEME (KASA ENTEGRE + ÇİFT ÖDEME KORUMALI)
const topluOdemeYap = async (req, res) => {
    try {
        const { list, paketIsmi } = req.body;
        const varmi = await PersonelHareket.findOne({ islemTipi: 'Ödeme', aciklama: paketIsmi });
        if (varmi) return res.status(400).json({ mesaj: "Bu haftayı zaten ödediniz!" });

        for (const item of list) {
            if (!item.pId || item.buHafta <= 0) continue;

            await PersonelHareket.create({
                personelId: item.pId,
                islemTipi: 'Ödeme',
                tutar: -item.buHafta,
                aciklama: paketIsmi
            });

            await Personel.findByIdAndUpdate(item.pId, { $inc: { bakiye: -item.buHafta } });

            // Kasa kaydını zorunlu alanlarıyla oluşturuyoruz
            await Odeme.create({
                islemYonu: 'Gider',
                odemeTipi: 'Nakit/Banka',
                tutar: item.buHafta,
                kategori: 'Personel Maaşları',
                ilgiliId: item.pId,
                odemeTarihi: new Date(),
                notlar: `${paketIsmi} - Personel Ödemesi`
            });
        }
        res.status(200).json({ mesaj: "Ödemeler başarıyla sisteme işlendi." });
    } catch (hata) {
        res.status(500).json({ mesaj: "Ödeme işlemi başarısız", detay: hata.message });
    }
};

// 5. ARŞİV İŞLEMLERİ
const gecmisOdemeleriGetir = async (req, res) => {
    try {
        const paketler = await PersonelHareket.aggregate([
            { $match: { islemTipi: 'Ödeme' } },
            { $group: { _id: "$aciklama", toplam: { $sum: { $abs: "$tutar" } }, tarih: { $first: "$islemTarihi" } } },
            { $sort: { tarih: -1 } }
        ]);
        res.status(200).json(paketler);
    } catch (e) { res.status(500).json({ mesaj: "Arşiv alınamadı" }); }
};

const arsivSil = async (req, res) => {
    try {
        await PersonelHareket.deleteMany({ islemTipi: 'Ödeme', aciklama: req.params.paketAdi });
        res.status(200).json({ mesaj: "Arşiv silindi." });
    } catch (e) { res.status(500).json({ mesaj: "Silme başarısız." }); }
};

const paketDetayGetir = async (req, res) => {
    try {
        const detaylar = await PersonelHareket.find({ islemTipi: 'Ödeme', aciklama: req.params.paketAdi }).populate('personelId', 'adSoyad');
        res.status(200).json(detaylar);
    } catch (e) { res.status(500).json({ mesaj: "Detaylar alınamadı." }); }
};

const arsivGuncelle = async (req, res) => {
    try {
        const { eskiPaketAdi, yeniListe, yeniPaketAdi } = req.body;
        await PersonelHareket.deleteMany({ islemTipi: 'Ödeme', aciklama: eskiPaketAdi });
        for (const item of yeniListe) {
            await PersonelHareket.create({ personelId: item.pId, islemTipi: 'Ödeme', tutar: -item.buHafta, aciklama: yeniPaketAdi });
        }
        res.status(200).json({ mesaj: "Arşiv güncellendi." });
    } catch (e) { res.status(500).json({ mesaj: "Güncelleme başarısız." }); }
};

module.exports = { mesaiYukle, hakedisHesapla, haftalikAnalizGetir, topluOdemeYap, gecmisOdemeleriGetir, arsivSil, paketDetayGetir, arsivGuncelle };