const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const dayjs = require('dayjs');

const Personel = mongoose.model('Personel');
const PersonelHareket = mongoose.model('PersonelHareket');

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

// 2. TEKLİ / MANUEL TAHAKKUK
const hakedisHesapla = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const { calculation_date, period_type, calisilanGunManuel } = req.body;

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

        const hareketler = await PersonelHareket.find({
            islemTipi: 'Hakediş',
            islemTarihi: { $gte: tarihSiniri }
        }).populate('personelId', 'adSoyad aktifMi');

        const gecerliHareketler = hareketler.filter(h => h.personelId && h.personelId.aktifMi === true);
        res.status(200).json(gecerliHareketler);
    } catch (hata) {
        console.error("ANALİZ HATASI:", hata);
        res.status(500).json({ mesaj: "Analiz verisi alınamadı", detay: hata.message });
    }
};

// 4. TOPLU ÖDEME
const topluOdemeYap = async (req, res) => {
    try {
        const { list } = req.body;
        for (const item of list) {
            if (!item.pId || item.buHafta <= 0) continue;

            await PersonelHareket.create({
                personelId: item.pId,
                islemTipi: 'Ödeme',
                tutar: -item.buHafta,
                aciklama: `${dayjs().format('DD.MM.YYYY')} Haftalık Maaş Ödemesi`
            });
            await Personel.findByIdAndUpdate(item.pId, { $inc: { bakiye: -item.buHafta } });
        }
        res.status(200).json({ mesaj: "Ödemeler başarıyla sisteme işlendi." });
    } catch (hata) {
        res.status(500).json({ mesaj: "Ödeme işlemi başarısız.", detay: hata.message });
    }
};

module.exports = { mesaiYukle, hakedisHesapla, haftalikAnalizGetir, topluOdemeYap };